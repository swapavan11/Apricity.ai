import express from 'express';
import Document from '../models/Document.js';
import { generateText, embedTexts } from '../lib/gemini.js';
import { scoreOnewordAnswer } from '../lib/quizScorer.js';
import { extractTopic, determineDifficulty, analyzePerformance } from '../lib/analytics.js';
import { invalidateCache } from '../lib/cache.js';

const router = express.Router();

function parseQuizJson(text) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
  } catch (e) {}
  return null;
}

function parseJsonArray(text) {
  try {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
  } catch (e) {}
  return null;
}

// GET /api/quiz/topics?documentId=<id>
// Require authentication and ensure document belongs to user
import { authenticateToken } from '../middleware/auth.js';

router.get('/topics', authenticateToken, async (req, res) => {
  const { documentId } = req.query;
  if (!documentId) return res.status(400).json({ error: 'documentId required' });
  const doc = await Document.findById(documentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.uploadedBy && doc.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });

  // Return cached topics if available
  if (doc.topics && doc.topics.length > 0) {
    return res.json({ topics: doc.topics, cached: true });
  }

  // Extract topics if not cached
  const context = doc.chunks.slice(0, 60).map(c => `p.${c.page}: ${c.text.slice(0, 400)}`).join('\n');
  const system = 'You are an assistant that extracts a concise list of section/topic headings from a textbook. Output a JSON array of short topic strings.';
  const prompt = `List the major topics or section headings present in the following document. Return strictly a JSON array of short topic strings (no extra text).\n\nDocument excerpts:\n${context}`;
  try {
    const text = await generateText({ prompt, system, temperature: 0.0 });
    let parsed = parseJsonArray(text);
    if (!parsed) {
      // fallback: split by newlines and pick unique lines
      parsed = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
    }
    
    // Cache the extracted topics
    await Document.findByIdAndUpdate(documentId, { topics: parsed });
    
    return res.json({ topics: parsed, cached: false });
  } catch (err) {
    console.error('Topics extraction failed', err);
    return res.status(500).json({ error: 'Failed to extract topics' });
  }
});

// POST /api/quiz/parse-topics - Manually trigger topic extraction with optional page range
router.post('/parse-topics', authenticateToken, async (req, res) => {
  const { documentId, startPage, endPage } = req.body;
  if (!documentId) return res.status(400).json({ error: 'documentId required' });
  const doc = await Document.findById(documentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.uploadedBy && doc.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });

  // Determine chunks to analyze based on page range or PDF size
  let chunksToAnalyze = doc.chunks;
  if (startPage && endPage) {
    // Filter chunks by page range
    chunksToAnalyze = doc.chunks.filter(c => c.page >= startPage && c.page <= endPage);
  } else if (doc.pages > 50) {
    // For large PDFs without page range, return info to request page range
    return res.json({ requiresPageRange: true, totalPages: doc.pages, message: 'PDF is large. Please specify page range for detailed topic extraction.' });
  }

  // Use more chunks for deeper analysis (up to 120 chunks or all available)
  const maxChunks = Math.min(chunksToAnalyze.length, 120);
  const context = chunksToAnalyze.slice(0, maxChunks).map(c => `p.${c.page}: ${c.text.slice(0, 500)}`).join('\n');
  
  const system = 'You are an expert at analyzing academic documents and extracting comprehensive topic structures. Output a JSON array of detailed topic strings that represent main themes, chapters, or subject areas.';
  const prompt = `Analyze the following document and extract ALL major topics, themes, chapters, and subject areas. Be comprehensive and detailed. Include:
- Main chapter or section titles
- Key concepts and themes
- Subject areas covered
- Important subtopics

Return strictly a JSON array of topic strings (15-25 topics). Each topic should be clear and specific.\n\nDocument excerpts:\n${context}`;
  
  try {
    const text = await generateText({ prompt, system, temperature: 0.0 });
    let parsed = parseJsonArray(text);
    if (!parsed) {
      // fallback: split by newlines and pick unique lines
      parsed = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 20);
    }
    
    // Update the document with extracted topics
    await Document.findByIdAndUpdate(documentId, { topics: parsed });
    
    return res.json({ topics: parsed, success: true, pageRange: startPage && endPage ? { start: startPage, end: endPage } : null });
  } catch (err) {
    console.error('Topics extraction failed', err);
    return res.status(500).json({ error: 'Failed to extract topics' });
  }
});

// POST /api/quiz/add-topic - Add a custom topic to document
router.post('/add-topic', authenticateToken, async (req, res) => {
  const { documentId, topic } = req.body;
  if (!documentId || !topic) return res.status(400).json({ error: 'documentId and topic required' });
  
  const doc = await Document.findById(documentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.uploadedBy && doc.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });
  
  const trimmedTopic = topic.trim();
  if (!trimmedTopic) return res.status(400).json({ error: 'Topic cannot be empty' });
  
  // Add topic if it doesn't already exist
  const currentTopics = doc.topics || [];
  if (!currentTopics.includes(trimmedTopic)) {
    currentTopics.push(trimmedTopic);
    await Document.findByIdAndUpdate(documentId, { topics: currentTopics });
  }
  
  return res.json({ topics: currentTopics, success: true });
});

router.post('/generate', authenticateToken, async (req, res) => {
  const { documentId, mcqCount = 5, onewordCount = 0, saqCount = 0, laqCount = 0, instructions = '', topic = '', topics = [], difficulty = 'medium' } = req.body;
  let docs = [];
  let context = '';
  
  if (documentId) {
    const d = await Document.findById(documentId);
    if (!d) return res.status(404).json({ error: 'Document not found' });
    if (d.uploadedBy && d.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });
    docs = [d];
    
    // estimate pages available
    const totalPages = docs.reduce((s, d) => s + (d.pages || 0), 0) || 1;
    const requestedTotal = Number(mcqCount||0) + Number(onewordCount||0) + Number(saqCount||0) + Number(laqCount||0);
    // if user requests too many questions relative to pages, warn
    if (requestedTotal > totalPages * 6) {
      return res.status(400).json({ error: `Too many questions requested for document size (${requestedTotal} > ${totalPages * 6}). Reduce counts.` });
    }
    context = docs.flatMap(d => d.chunks.slice(0, 40)).map(c => `Doc: ${c.page}: ${c.text.slice(0, 600)}`).join('\n');
  } else {
    // General mode without PDF - use instructions as context
    if (!instructions || !instructions.trim()) {
      return res.status(400).json({ error: 'Instructions are required for general quiz mode' });
    }
    context = `Generate quiz questions based on the following topic/subject:\n${instructions}`;
  }
  
  const system = 'You generate rigorous quizzes from academic textbooks. Output strict JSON matching schema.';
  // sanitize instructions: strip question count patterns so users who paste counts don't affect generation
  function sanitizeInstructions(inp) {
    if (!inp) return '';
    let s = String(inp || '');
    // remove patterns like '5 MCQs', 'MCQ: 5', 'saq=3', '2 laq' etc.
    s = s.replace(/\b\d+\s*(mcq|mcqs|saq|saqs|laq|laq|oneword|one-word|one word|onewords)\b/ig, '');
    s = s.replace(/\b(mcq|saq|laq|oneword)\s*[:=]\s*\d+\b/ig, '');
    // remove standalone patterns like 'MCQs 5'
    s = s.replace(/\b(mcq|mcqs|saq|saqs|laq|laq|oneword)\s+\d+\b/ig, '');
    // collapse multiple spaces
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
  }

  const sanitizedInstructions = sanitizeInstructions(instructions);
  // Handle both single topic (backward compatibility) and multiple topics
  const topicsList = Array.isArray(topics) && topics.length > 0 ? topics : (topic ? [topic] : []);
  const topicsInstruction = topicsList.length > 0 ? `Focus Topics: ${topicsList.join(', ')}\n` : '';
  const instructionBlock = ((sanitizedInstructions ? `User Instructions: ${sanitizedInstructions}\n` : '') + topicsInstruction) || '';
  const difficultyInstruction = `Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}.`;
  const prompt = [
    `Create a quiz with ${mcqCount} MCQs, ${onewordCount} ONEWORD questions, ${saqCount} SAQs, and ${laqCount} LAQs from the context.`,
    difficultyInstruction,
    instructionBlock,
    'MCQ: 4 options, answerIndex 0-3. ONEWORD: single token answer (word or numeric). SAQ: short text answer. LAQ: detailed text answer.',
    'Schema: {"questions":[{"id":"string","type":"MCQ|ONEWORD|SAQ|LAQ","question":"string","options":["A","B","C","D"] (MCQ only),"answerIndex":0 (MCQ only),"answer":"string (ONEWORD/SAQ/LAQ)","page":number,"explanation":"string"}]}.' ,
    'Context:',
    context
  ].join('\n');
  const text = await generateText({ prompt, system });
  const parsed = parseQuizJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    return res.json({ questions: [], raw: text });
  }
  // sanitize and enforce proper shape
  parsed.questions = parsed.questions
  .filter(q => q && q.type && ['MCQ','ONEWORD','SAQ','LAQ'].includes(q.type))
    .map((q, idx) => {
      const base = {
        id: String(q.id || `q_${idx}`),
        type: String(q.type),
        question: String(q.question || '').trim(),
        page: Number.isFinite(q.page) ? q.page : 1,
        explanation: String(q.explanation || ''),
      };
      if (q.type === 'MCQ') {
        return {
          ...base,
          options: Array.isArray(q.options) ? q.options.slice(0,4).map(o => String(o)) : ['A','B','C','D'],
          answerIndex: Number.isInteger(q.answerIndex) ? q.answerIndex : 0,
        };
      } else if (q.type === 'ONEWORD') {
          return {
            ...base,
            answer: String(q.answer || '').trim(),
          };
        } else {
        return {
          ...base,
          answer: String(q.answer || ''),
        };
      }
    });
  res.json({ questions: parsed.questions });
});

router.post('/score', authenticateToken, async (req, res) => {
  const { answers, questions, documentId, timeTaken, timeLimit, wasTimedOut, quizParams } = req.body;
  if (!Array.isArray(answers) || !Array.isArray(questions)) return res.status(400).json({ error: 'Invalid payload' });
  
  // Load document topics if available for better topic matching
  let documentTopics = [];
  if (documentId) {
    try {
      const doc = await Document.findById(documentId);
      if (doc && doc.topics && Array.isArray(doc.topics)) {
        documentTopics = doc.topics;
      }
    } catch (e) {
      console.error('Error loading document topics:', e);
    }
  }
  
  let correct = 0;
  const questionResults = [];
  
  // Process each question and collect detailed results with marks
  let totalMarks = 0;
  let obtainedMarks = 0;
  
  const results = await Promise.all(questions.map(async (q, i) => {
    const questionId = q.id || `q_${i}`;
    const page = q.page || 1;
    const questionText = q.question || '';
    
    // Extract topic with document context
    let topic = q.topic || extractTopic(questionText);
    
    // If we have document topics, try to match the extracted topic to them
    if (documentTopics.length > 0) {
      const extractedLower = topic.toLowerCase();
      // Find best matching document topic
      const match = documentTopics.find(dt => {
        const dtLower = dt.toLowerCase();
        return dtLower.includes(extractedLower) || extractedLower.includes(dtLower);
      });
      if (match) {
        topic = match; // Use the document's topic name
      } else if (topic === 'General') {
        // If extracted topic is too generic, use first document topic
        topic = documentTopics[0];
      }
    }
    
    const difficulty = determineDifficulty(questionText, q.type);
    
    // Assign marks based on question type
    const marksPerType = {
      'MCQ': 1,
      'ONEWORD': 1,
      'SAQ': 2,
      'LAQ': 3
    };
    const questionMarks = marksPerType[q.type] || 1;
    totalMarks += questionMarks;
    
    let result;
    if (q.type === 'MCQ') {
      const expectedIndex = Number.isInteger(q.answerIndex) ? q.answerIndex : 0;
      const userIndex = Number.isInteger(answers[i]) ? answers[i] : (typeof answers[i] === 'string' ? q.options.indexOf(answers[i]) : -1);
      const isCorrect = userIndex === expectedIndex;
      if (isCorrect) {
        correct++;
        obtainedMarks += questionMarks;
      }
      
      result = { 
        id: questionId, 
        correct: isCorrect, 
        expectedIndex, 
        userIndex, 
        type: 'MCQ',
        userAnswer: q.options?.[userIndex] || '',
        expectedAnswer: q.options?.[expectedIndex] || ''
      };
      
      questionResults.push({
        questionId,
        type: 'MCQ',
        correct: isCorrect,
        partial: false,
        page,
        topic,
        difficulty,
        question: questionText,
        options: q.options || [],
        userAnswer: q.options?.[userIndex] || '',
        correctAnswer: q.options?.[expectedIndex] || '',
        explanation: q.explanation || '',
        marksObtained: isCorrect ? questionMarks : 0,
        totalMarks: questionMarks
      });
    } else if (q.type === 'ONEWORD') {
      // One-word questions: prefer deterministic exact/number match. Normalize and compare.
      const userAnswer = String(answers[i] || '').trim();
      const expectedAnswer = String(q.answer || '').trim();

      const normalize = (s) => String(s || '').trim().toLowerCase();
      const numA = Number(userAnswer);
      const numB = Number(expectedAnswer);

      let isCorrect = false;
      let isPartial = false;

      // Exact numeric or token match (fast path)
      if (userAnswer && expectedAnswer) {
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
          const a = numA, b = numB
          const diff = Math.abs(a - b)
          const tol = Math.max(1e-6, Math.abs(b) * 1e-3)
          isCorrect = diff <= tol
        } else {
          isCorrect = normalize(userAnswer) === normalize(expectedAnswer)
        }
      }

      // Embedding similarity check (semantic one-token equivalence)
      if (!isCorrect && userAnswer && expectedAnswer) {
        try {
          const emb = await embedTexts([userAnswer, expectedAnswer]);
          if (Array.isArray(emb) && emb.length === 2 && emb[0].length && emb[1].length) {
            // cosine similarity
            const dot = emb[0].reduce((s, v, idx) => s + v * (emb[1][idx] || 0), 0);
            const mag = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
            const sim = dot / (Math.max(1e-9, mag(emb[0]) * mag(emb[1])));
            // If semantic similarity is high for single-token answers, accept as correct
            if (sim >= 0.78) {
              isCorrect = true;
            }
          }
        } catch (e) {
          // embedding failed -> ignore and continue to LLM fallback
        }
      }

      // Fallback to deterministic LLM grader if still not correct
      if (!isCorrect && userAnswer && expectedAnswer) {
        try {
          const system = `You are a strict grader. Compare two one-word answers and respond with a single token ONLY: CORRECT or INCORRECT or PARTIAL.`;
          const prompt = `Expected: ${expectedAnswer}\nStudent: ${userAnswer}\nGrade:`;
          const gradeRaw = await generateText({ prompt, system, temperature: 0.0 });
          let gradeToken = String(gradeRaw || '').trim().split(/\s|\n/)[0]?.toUpperCase() || '';
          if (!['CORRECT','PARTIAL','INCORRECT'].includes(gradeToken)) {
            const m = String(gradeRaw || '').toUpperCase().match(/CORRECT|PARTIAL|INCORRECT/);
            gradeToken = m ? m[0] : 'INCORRECT';
          }
          isCorrect = gradeToken === 'CORRECT'
          isPartial = gradeToken === 'PARTIAL'
        } catch (e) {
          // ignore grader errors, keep isCorrect false
        }
      }

      if (isCorrect) {
        correct++;
        obtainedMarks += questionMarks;
      } else if (isPartial) {
        obtainedMarks += questionMarks * 0.5; // Half marks for partial
      }

      result = {
        id: questionId,
        correct: isCorrect,
        partial: isPartial,
        userAnswer,
        expectedAnswer,
        type: q.type,
      };

      questionResults.push({
        questionId,
        type: q.type,
        correct: isCorrect,
        partial: isPartial,
        page,
        topic,
        difficulty,
        question: questionText,
        userAnswer,
        correctAnswer: expectedAnswer,
        explanation: q.explanation || '',
        marksObtained: isCorrect ? questionMarks : (isPartial ? questionMarks * 0.5 : 0),
        totalMarks: questionMarks
      });

    } else {
      // For SAQ/LAQ, use Gemini to evaluate similarity
      const userAnswer = String(answers[i] || '').trim();
      const expectedAnswer = String(q.answer || '').trim();

      if (!userAnswer || !expectedAnswer) {
        result = { id: questionId, correct: false, userAnswer, expectedAnswer, type: q.type };
        questionResults.push({
          questionId,
          type: q.type,
          correct: false,
          partial: false,
          page,
          topic,
          difficulty,
          question: questionText,
          userAnswer,
          correctAnswer: expectedAnswer,
          explanation: q.explanation || '',
          marksObtained: 0,
          totalMarks: questionMarks
        });
      } else {
        try {
          // Strong, deterministic grading prompt. Instruct model to output a single token only.
          const system = `You are a strict objective grader. Compare the student answer with the expected answer and decide whether the student fully answered the question, partially answered it, or did not answer it. Respond with a single word ONLY: CORRECT, PARTIAL, or INCORRECT. Do not include any other text or explanation.`;
          const prompt = `Expected: ${expectedAnswer}\nStudent: ${userAnswer}\nGrade:`;
          // Use deterministic settings to reduce hallucinations.
          const gradeRaw = await generateText({ prompt, system, temperature: 0.0 });

          // Normalize and extract the first matching token
          let gradeToken = String(gradeRaw || '').trim().split(/\s|\n/)[0]?.toUpperCase() || '';
          if (!['CORRECT', 'PARTIAL', 'INCORRECT'].includes(gradeToken)) {
            const m = String(gradeRaw || '').toUpperCase().match(/CORRECT|PARTIAL|INCORRECT/);
            gradeToken = m ? m[0] : 'INCORRECT';
          }

          const isCorrect = gradeToken === 'CORRECT';
          const isPartial = gradeToken === 'PARTIAL';
          if (isCorrect) {
            correct++;
            obtainedMarks += questionMarks;
          } else if (isPartial) {
            obtainedMarks += questionMarks * 0.5; // Half marks for partial
          }

          result = {
            id: questionId,
            correct: isCorrect,
            partial: isPartial,
            userAnswer,
            expectedAnswer,
            type: q.type,
            graderOutput: gradeRaw
          };

          questionResults.push({
            questionId,
            type: q.type,
            correct: isCorrect,
            partial: isPartial,
            page,
            topic,
            difficulty,
            question: questionText,
            userAnswer,
            correctAnswer: expectedAnswer,
            explanation: q.explanation || '',
            marksObtained: isCorrect ? questionMarks : (isPartial ? questionMarks * 0.5 : 0),
            totalMarks: questionMarks
          });
        } catch (err) {
          console.error('Scoring error for', questionId, err);
          result = { id: questionId, correct: false, userAnswer, expectedAnswer, type: q.type };
          questionResults.push({
            questionId,
            type: q.type,
            correct: false,
            partial: false,
            page,
            topic,
            difficulty,
            question: questionText,
            userAnswer,
            correctAnswer: expectedAnswer,
            explanation: q.explanation || '',
            marksObtained: 0,
            totalMarks: questionMarks
          });
        }
      }
  }

  return result;
  }));
  
  const score = correct;
  const total = questions.length;
  const overallAccuracy = total > 0 ? score / total : 0;
  
  // Calculate accuracy by question type
  const mcqResults = questionResults.filter(q => q.type === 'MCQ');
  const saqResults = questionResults.filter(q => q.type === 'SAQ');
  const laqResults = questionResults.filter(q => q.type === 'LAQ');
  const onewordResults = questionResults.filter(q => q.type === 'ONEWORD');
  
  const mcqAccuracy = mcqResults.length > 0 ? mcqResults.filter(q => q.correct).length / mcqResults.length : 0;
  const saqAccuracy = saqResults.length > 0 ? saqResults.filter(q => q.correct || q.partial).length / saqResults.length : 0;
  const laqAccuracy = laqResults.length > 0 ? laqResults.filter(q => q.correct || q.partial).length / laqResults.length : 0;
  const onewordAccuracy = onewordResults.length > 0 ? onewordResults.filter(q => q.correct || q.partial).length / onewordResults.length : 0;
  
  // Analyze topic performance
  const topicMap = new Map();
  questionResults.forEach(result => {
    if (result.topic) {
      if (!topicMap.has(result.topic)) {
        topicMap.set(result.topic, { correct: 0, total: 0 });
      }
      const topic = topicMap.get(result.topic);
      topic.total++;
      if (result.correct || result.partial) {
        topic.correct++;
      }
    }
  });
  
  const topics = Array.from(topicMap.entries()).map(([name, stats]) => ({
    name,
    accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    questionsCount: stats.total
  }));
  
  // Generate strengths and weaknesses
  const strengths = [];
  const weaknesses = [];
  
  if (mcqAccuracy >= 0.8) strengths.push('Multiple Choice Questions');
  if (saqAccuracy >= 0.8) strengths.push('Short Answer Questions');
  if (laqAccuracy >= 0.8) strengths.push('Long Answer Questions');
  
  if (mcqAccuracy < 0.5) weaknesses.push('Multiple Choice Questions');
  if (saqAccuracy < 0.5) weaknesses.push('Short Answer Questions');
  if (laqAccuracy < 0.5) weaknesses.push('Long Answer Questions');
  
  // Add topic-based strengths/weaknesses
  topics.forEach(topic => {
    if (topic.accuracy >= 0.8 && topic.questionsCount >= 2) {
      strengths.push(topic.name);
    } else if (topic.accuracy < 0.5 && topic.questionsCount >= 2) {
      weaknesses.push(topic.name);
    }
  });
  
  // Get suggested topics based on incorrect answers - improved logic
  let suggestedTopics = [];
  
  // Only suggest topics if user didn't get perfect score
  if (obtainedMarks < totalMarks) {
    // Collect topics from questions that were answered incorrectly with frequency count
    const incorrectTopicFreq = new Map();
    
    questionResults.forEach(result => {
      if (!result.correct && !result.partial) {
        let topicToAdd = null;
        
        // Priority 1: Use the topic already assigned to the question
        if (result.topic && result.topic !== 'General') {
          topicToAdd = result.topic;
        }
        // Priority 2: Re-extract from question text with document context
        else if (result.question) {
          const extractedTopic = extractTopic(result.question);
          if (extractedTopic && extractedTopic !== 'General') {
            topicToAdd = extractedTopic;
          }
        }
        
        // Add to frequency map
        if (topicToAdd) {
          incorrectTopicFreq.set(topicToAdd, (incorrectTopicFreq.get(topicToAdd) || 0) + 1);
        }
      }
    });
    
    // Sort by frequency (most incorrect first) and convert to array
    suggestedTopics = Array.from(incorrectTopicFreq.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
      .map(([topic]) => topic) // Extract just the topic names
      .slice(0, 5); // Top 5
    
    // If still no specific topics found, use weaknesses (but filter out question types)
    if (suggestedTopics.length === 0 && weaknesses.length > 0) {
      const specificWeaknesses = weaknesses.filter(w => 
        !['Multiple Choice Questions', 'Short Answer Questions', 'Long Answer Questions'].includes(w)
      );
      suggestedTopics = specificWeaknesses.slice(0, 5);
    }
    
    // If we have document topics and still no suggestions, use first 3 document topics as fallback
    if (suggestedTopics.length === 0 && documentTopics.length > 0) {
      suggestedTopics = documentTopics.slice(0, 3);
    }
  }
  
  // Create detailed attempt record with quiz mode information
  const attemptData = {
    quizType: 'mixed',
    score: obtainedMarks,
    total: totalMarks,
    questionResults,
    overallAccuracy,
    mcqAccuracy,
    saqAccuracy,
    laqAccuracy,
    onewordAccuracy,
    topics,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    suggestedTopics,
    timeTaken: timeTaken || 0,
    timeLimit: timeLimit || null,
    wasTimedOut: wasTimedOut || false,
    quizParams: quizParams || {},
    // Quiz mode information
    quizMode: quizParams?.mode || 'general', // 'general', 'topic-specific', or 'custom'
    selectedTopics: quizParams?.topics || [], // For mode 2
    customInstruction: quizParams?.instruction || '' // For mode 3
  };
  
  if (documentId) {
    const d = await Document.findById(documentId);
    if (!d) return res.status(404).json({ error: 'Document not found' });
    if (d.uploadedBy && d.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });
    await Document.findByIdAndUpdate(documentId, { $push: { attempts: attemptData } });

    // Invalidate dashboard cache to ensure fresh data
    invalidateCache();
  } else {
    // No document ID - this is a general/non-PDF quiz
    // Save to user's general attempts
    const User = (await import('../models/User.js')).default;
    await User.findByIdAndUpdate(req.user._id, { $push: { generalAttempts: attemptData } });
    
    // Invalidate dashboard cache
    invalidateCache();
  }
  
  res.json({ 
    score: obtainedMarks, 
    total: totalMarks, 
    results,
    analytics: {
      overallAccuracy,
      mcqAccuracy,
      saqAccuracy,
      laqAccuracy,
      onewordAccuracy,
      topics,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      suggestedTopics
    }
  });
});

export default router;


