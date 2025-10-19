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
    return res.json({ topics: parsed });
  } catch (err) {
    console.error('Topics extraction failed', err);
    return res.status(500).json({ error: 'Failed to extract topics' });
  }
});

router.post('/generate', authenticateToken, async (req, res) => {
  const { documentId, mcqCount = 5, onewordCount = 0, saqCount = 0, laqCount = 0, instructions = '', topic = '' } = req.body;
  let docs = [];
  if (documentId) {
    const d = await Document.findById(documentId);
    if (!d) return res.status(404).json({ error: 'Document not found' });
    if (d.uploadedBy && d.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });
    docs = [d];
  } else {
    docs = await Document.find({ uploadedBy: req.user._id });
  }
  if (!docs.length) return res.status(404).json({ error: 'No documents found' });
  // estimate pages available
  const totalPages = docs.reduce((s, d) => s + (d.pages || 0), 0) || 1;
  const requestedTotal = Number(mcqCount||0) + Number(onewordCount||0) + Number(saqCount||0) + Number(laqCount||0);
  // if user requests too many questions relative to pages, warn
  if (requestedTotal > totalPages * 6) {
    return res.status(400).json({ error: `Too many questions requested for document size (${requestedTotal} > ${totalPages * 6}). Reduce counts.` });
  }
  const context = docs.flatMap(d => d.chunks.slice(0, 40)).map(c => `Doc: ${c.page}: ${c.text.slice(0, 600)}`).join('\n');
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
  const instructionBlock = ((sanitizedInstructions ? `User Instructions: ${sanitizedInstructions}\n` : '') + (topic ? `Focus Topic: ${topic}\n` : '')) || '';
  const prompt = `Create a quiz with ${mcqCount} MCQs, ${saqCount} SAQs, and ${laqCount} LAQs from the context.${instructionBlock} 
MCQ: 4 options, answerIndex 0-3. SAQ: short text answer. LAQ: detailed text answer.
Schema: {"questions":[{"id":"string","type":"MCQ|SAQ|LAQ","question":"string","options":["A","B","C","D"] (MCQ only),"answerIndex":0 (MCQ only),"answer":"string (SAQ/LAQ)","page":number,"explanation":"string"}]}.\nContext:\n${context}`;
    // Augmented prompt that also mentions ONEWORD questions (single-token answers)
    const augmentedPrompt = `Create a quiz with ${mcqCount} MCQs, ${onewordCount} ONEWORD questions, ${saqCount} SAQs, and ${laqCount} LAQs from the context.${instructionBlock} \nMCQ: 4 options, answerIndex 0-3. ONEWORD: single token answer (word or numeric). SAQ: short text answer. LAQ: detailed text answer.\nSchema: {"questions":[{"id":"string","type":"MCQ|ONEWORD|SAQ|LAQ","question":"string","options":["A","B","C","D"] (MCQ only),"answerIndex":0 (MCQ only),"answer":"string (ONEWORD/SAQ/LAQ)","page":number,"explanation":"string"}]}.\nContext:\n${context}`;
    const text = await generateText({ prompt: augmentedPrompt, system });
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
  res.json(parsed);
});

router.post('/score', authenticateToken, async (req, res) => {
  const { documentId, answers, questions } = req.body;
  if (!Array.isArray(answers) || !Array.isArray(questions)) return res.status(400).json({ error: 'Invalid payload' });
  
  let correct = 0;
  const questionResults = [];
  
  // Process each question and collect detailed results
  const results = await Promise.all(questions.map(async (q, i) => {
    const questionId = q.id || `q_${i}`;
    const page = q.page || 1;
    const questionText = q.question || '';
    
    // Extract topic and determine difficulty
    const topic = extractTopic(questionText);
    const difficulty = determineDifficulty(questionText, q.type);
    
    let result;
    if (q.type === 'MCQ') {
      const expectedIndex = Number.isInteger(q.answerIndex) ? q.answerIndex : 0;
      const userIndex = Number.isInteger(answers[i]) ? answers[i] : (typeof answers[i] === 'string' ? q.options.indexOf(answers[i]) : -1);
      const isCorrect = userIndex === expectedIndex;
      if (isCorrect) correct++;
      
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
        difficulty
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

      if (isCorrect) correct++;

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
        difficulty
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
          difficulty
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
          if (isCorrect) correct++;

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
            difficulty
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
            difficulty
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
  
  // Create detailed attempt record
  const attemptData = {
    quizType: 'mixed',
    score,
    total,
    questionResults,
    overallAccuracy,
    mcqAccuracy,
    saqAccuracy,
    laqAccuracy,
    onewordAccuracy,
    topics,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5)
  };
  
  if (documentId) {
    const d = await Document.findById(documentId);
    if (!d) return res.status(404).json({ error: 'Document not found' });
    if (d.uploadedBy && d.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });
    await Document.findByIdAndUpdate(documentId, { $push: { attempts: attemptData } });

    // Invalidate dashboard cache to ensure fresh data
    invalidateCache();
  }
  
  res.json({ 
    score, 
    total, 
    results,
    analytics: {
      overallAccuracy,
      mcqAccuracy,
      saqAccuracy,
      laqAccuracy,
      onewordAccuracy,
      topics,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3)
    }
  });
});

export default router;


