import express from 'express';
import Document from '../models/Document.js';
import { generateText } from '../lib/gemini.js';
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

router.post('/generate', async (req, res) => {
  const { documentId, mcqCount = 5, saqCount = 0, laqCount = 0 } = req.body;
  const docs = documentId ? await Document.find({ _id: documentId }) : await Document.find({});
  if (!docs.length) return res.status(404).json({ error: 'No documents found' });

  const context = docs.flatMap(d => d.chunks.slice(0, 40)).map(c => `Doc: ${c.page}: ${c.text.slice(0, 600)}`).join('\n');
  const system = 'You generate rigorous quizzes from academic textbooks. Output strict JSON matching schema.';
  const prompt = `Create a quiz with ${mcqCount} MCQs, ${saqCount} SAQs, and ${laqCount} LAQs from the context. 
MCQ: 4 options, answerIndex 0-3. SAQ: short text answer. LAQ: detailed text answer.
Schema: {"questions":[{"id":"string","type":"MCQ|SAQ|LAQ","question":"string","options":["A","B","C","D"] (MCQ only),"answerIndex":0 (MCQ only),"answer":"string (SAQ/LAQ)","page":number,"explanation":"string"}]}.\nContext:\n${context}`;
  const text = await generateText({ prompt, system });
  const parsed = parseQuizJson(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    return res.json({ questions: [], raw: text });
  }
  // sanitize and enforce proper shape
  parsed.questions = parsed.questions
    .filter(q => q && q.type && ['MCQ','SAQ','LAQ'].includes(q.type))
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
      } else {
        return {
          ...base,
          answer: String(q.answer || ''),
        };
      }
    });
  res.json(parsed);
});

router.post('/score', async (req, res) => {
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
          const system = 'You are a fair grader. Compare the student answer with the expected answer. Consider partial credit for relevant points. Return only "CORRECT", "PARTIAL", or "INCORRECT".';
          const prompt = `Expected: ${expectedAnswer}\nStudent: ${userAnswer}\nGrade:`;
          const grade = await generateText({ prompt, system, temperature: 0.1 });
          const isCorrect = grade.includes('CORRECT');
          const isPartial = grade.includes('PARTIAL');
          if (isCorrect) correct++;
          
          result = { 
            id: questionId, 
            correct: isCorrect, 
            partial: isPartial, 
            userAnswer, 
            expectedAnswer, 
            type: q.type 
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
  
  const mcqAccuracy = mcqResults.length > 0 ? mcqResults.filter(q => q.correct).length / mcqResults.length : 0;
  const saqAccuracy = saqResults.length > 0 ? saqResults.filter(q => q.correct || q.partial).length / saqResults.length : 0;
  const laqAccuracy = laqResults.length > 0 ? laqResults.filter(q => q.correct || q.partial).length / laqResults.length : 0;
  
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
    topics,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5)
  };
  
  if (documentId) {
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
      topics,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3)
    }
  });
});

export default router;


