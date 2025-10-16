import { generateText } from './gemini.js';

/**
 * Extract topic from question text using simple keyword matching
 */
export function extractTopic(questionText) {
  const text = questionText.toLowerCase();
  
  // Simple keyword-based topic extraction for better performance
  const topicKeywords = {
    'Physics': ['force', 'motion', 'energy', 'velocity', 'acceleration', 'newton', 'gravity', 'electric', 'magnetic', 'wave', 'light', 'sound'],
    'Chemistry': ['atom', 'molecule', 'reaction', 'bond', 'acid', 'base', 'element', 'compound', 'oxidation', 'reduction'],
    'Biology': ['cell', 'dna', 'protein', 'photosynthesis', 'respiration', 'evolution', 'ecosystem', 'organism', 'gene', 'enzyme'],
    'Mathematics': ['equation', 'function', 'derivative', 'integral', 'algebra', 'geometry', 'trigonometry', 'calculus', 'statistics'],
    'History': ['war', 'revolution', 'empire', 'ancient', 'medieval', 'modern', 'battle', 'treaty', 'civilization'],
    'Geography': ['continent', 'ocean', 'mountain', 'river', 'climate', 'population', 'country', 'capital', 'latitude', 'longitude']
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return topic;
    }
  }
  
  return 'General';
}

/**
 * Determine question difficulty based on content
 */
export function determineDifficulty(questionText, questionType) {
  const text = questionText.toLowerCase();
  const wordCount = questionText.split(' ').length;
  
  // Simple heuristics for difficulty
  const complexWords = ['analyze', 'evaluate', 'compare', 'contrast', 'explain', 'describe', 'discuss', 'justify', 'prove', 'derive'];
  const hasComplexWords = complexWords.some(word => text.includes(word));
  
  if (questionType === 'LAQ' || hasComplexWords || wordCount > 50) {
    return 'hard';
  } else if (questionType === 'SAQ' || wordCount > 20) {
    return 'medium';
  } else {
    return 'easy';
  }
}

/**
 * Analyze performance and generate insights
 */
export async function analyzePerformance(attempts) {
  if (!attempts || attempts.length === 0) {
    return {
      overallAccuracy: 0,
      totalAttempts: 0,
      mcqAccuracy: 0,
      saqAccuracy: 0,
      laqAccuracy: 0,
      topicPerformance: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    };
  }

  // Calculate overall metrics
  const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  // Calculate accuracy by question type
  const mcqResults = attempts.flatMap(a => a.questionResults?.filter(q => q.type === 'MCQ') || []);
  const saqResults = attempts.flatMap(a => a.questionResults?.filter(q => q.type === 'SAQ') || []);
  const laqResults = attempts.flatMap(a => a.questionResults?.filter(q => q.type === 'LAQ') || []);

  const mcqAccuracy = mcqResults.length > 0 ? mcqResults.filter(q => q.correct).length / mcqResults.length : 0;
  const saqAccuracy = saqResults.length > 0 ? saqResults.filter(q => q.correct || q.partial).length / saqResults.length : 0;
  const laqAccuracy = laqResults.length > 0 ? laqResults.filter(q => q.correct || q.partial).length / laqResults.length : 0;

  // Analyze topic performance
  const topicMap = new Map();
  const allResults = attempts.flatMap(a => a.questionResults || []);
  
  allResults.forEach(result => {
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

  const topicPerformance = Array.from(topicMap.entries()).map(([name, stats]) => ({
    name,
    accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    questionsCount: stats.total
  })).sort((a, b) => b.accuracy - a.accuracy);

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
  topicPerformance.forEach(topic => {
    if (topic.accuracy >= 0.8 && topic.questionsCount >= 2) {
      strengths.push(topic.name);
    } else if (topic.accuracy < 0.5 && topic.questionsCount >= 2) {
      weaknesses.push(topic.name);
    }
  });

  return {
    overallAccuracy,
    totalAttempts: attempts.length,
    mcqAccuracy,
    saqAccuracy,
    laqAccuracy,
    topicPerformance,
    strengths: strengths.slice(0, 5), // Top 5 strengths
    weaknesses: weaknesses.slice(0, 5), // Top 5 weaknesses
    recommendations: [] // Disabled for performance
  };
}

/**
 * Fast performance analysis without AI calls
 */
export function analyzePerformanceFast(attempts) {
  if (!attempts || attempts.length === 0) {
    return {
      overallAccuracy: 0,
      totalAttempts: 0,
      mcqAccuracy: 0,
      saqAccuracy: 0,
      laqAccuracy: 0,
      topicPerformance: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    };
  }

  // Calculate overall metrics
  const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  // Calculate accuracy by question type
  const mcqResults = attempts.flatMap(a => a.questionResults?.filter(q => q.type === 'MCQ') || []);
  const saqResults = attempts.flatMap(a => a.questionResults?.filter(q => q.type === 'SAQ') || []);
  const laqResults = attempts.flatMap(a => a.questionResults?.filter(q => q.type === 'LAQ') || []);

  const mcqAccuracy = mcqResults.length > 0 ? mcqResults.filter(q => q.correct).length / mcqResults.length : 0;
  const saqAccuracy = saqResults.length > 0 ? saqResults.filter(q => q.correct || q.partial).length / saqResults.length : 0;
  const laqAccuracy = laqResults.length > 0 ? laqResults.filter(q => q.correct || q.partial).length / laqResults.length : 0;

  // Analyze topic performance
  const topicMap = new Map();
  const allResults = attempts.flatMap(a => a.questionResults || []);
  
  allResults.forEach(result => {
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

  const topicPerformance = Array.from(topicMap.entries()).map(([name, stats]) => ({
    name,
    accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    questionsCount: stats.total
  })).sort((a, b) => b.accuracy - a.accuracy);

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
  topicPerformance.forEach(topic => {
    if (topic.accuracy >= 0.8 && topic.questionsCount >= 2) {
      strengths.push(topic.name);
    } else if (topic.accuracy < 0.5 && topic.questionsCount >= 2) {
      weaknesses.push(topic.name);
    }
  });

  return {
    overallAccuracy,
    totalAttempts: attempts.length,
    mcqAccuracy,
    saqAccuracy,
    laqAccuracy,
    topicPerformance,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    recommendations: []
  };
}

/**
 * Generate AI-powered study recommendations
 */
async function generateRecommendations(performance) {
  try {
    const system = 'You are an educational tutor. Analyze the student\'s quiz performance and provide specific, actionable study recommendations. Focus on areas that need improvement.';
    
    const prompt = `Student Performance Analysis:
- Overall Accuracy: ${(performance.overallAccuracy * 100).toFixed(1)}%
- MCQ Accuracy: ${(performance.mcqAccuracy * 100).toFixed(1)}%
- SAQ Accuracy: ${(performance.saqAccuracy * 100).toFixed(1)}%
- LAQ Accuracy: ${(performance.laqAccuracy * 100).toFixed(1)}%

Strengths: ${performance.strengths.join(', ') || 'None identified'}
Weaknesses: ${performance.weaknesses.join(', ') || 'None identified'}

Topic Performance:
${performance.topicPerformance.map(t => `- ${t.name}: ${(t.accuracy * 100).toFixed(1)}% (${t.questionsCount} questions)`).join('\n')}

Provide 3-5 specific recommendations for improvement:`;

    const response = await generateText({ prompt, system, temperature: 0.3 });
    return response.split('\n').filter(line => line.trim()).slice(0, 5);
  } catch (error) {
    console.error('Recommendation generation error:', error);
    return [
      'Review topics with low accuracy scores',
      'Practice more questions in weak areas',
      'Focus on understanding concepts rather than memorization'
    ];
  }
}

/**
 * Calculate performance trends over time
 */
export function calculateTrends(attempts) {
  if (attempts.length < 2) return { trend: 'insufficient_data', recentAccuracy: 0 };

  const sortedAttempts = attempts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recent = sortedAttempts.slice(-3); // Last 3 attempts
  const older = sortedAttempts.slice(0, -3);

  const recentAccuracy = recent.reduce((sum, a) => sum + (a.score / a.total), 0) / recent.length;
  const olderAccuracy = older.length > 0 ? 
    older.reduce((sum, a) => sum + (a.score / a.total), 0) / older.length : recentAccuracy;

  if (recentAccuracy > olderAccuracy + 0.1) return { trend: 'improving', recentAccuracy };
  if (recentAccuracy < olderAccuracy - 0.1) return { trend: 'declining', recentAccuracy };
  return { trend: 'stable', recentAccuracy };
}
