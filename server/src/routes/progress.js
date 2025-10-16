import express from 'express';
import Document from '../models/Document.js';
import { analyzePerformanceFast, calculateTrends } from '../lib/analytics.js';
import { getCache, setCache, invalidateCache } from '../lib/cache.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Check cache first
    const cachedData = getCache();
    if (cachedData) {
      return res.json(cachedData);
    }

    const docs = await Document.find({}).select('title attempts createdAt');
    const summary = docs.map(d => {
      const totalAttempts = d.attempts.length;
      const totalQuestions = d.attempts.reduce((s, a) => s + (a.total || 0), 0);
      const totalCorrect = d.attempts.reduce((s, a) => s + (a.score || 0), 0);
      const avg = totalQuestions ? (totalCorrect / totalQuestions) : 0;
      
      // Fast performance analysis without AI calls
      const performance = analyzePerformanceFast(d.attempts);
      const trends = calculateTrends(d.attempts);
      
      // Calculate recent performance (last 3 attempts)
      const recentAttempts = d.attempts.slice(-3);
      const recentAccuracy = recentAttempts.length > 0 ? 
        recentAttempts.reduce((sum, a) => sum + (a.score / a.total), 0) / recentAttempts.length : 0;
      
      // Sort attempts by creation date (newest first) and add attempt numbers
      const sortedAttempts = d.attempts
        .map((attempt, index) => ({
          ...attempt.toObject(),
          attemptNumber: d.attempts.length - index,
          id: `${d._id}_${index}`,
          createdAt: attempt.createdAt || new Date()
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { 
        documentId: d._id, 
        title: d.title, 
        totalAttempts, 
        accuracy: avg,
        recentAccuracy,
        trends,
        attempts: sortedAttempts, // Include individual attempts
        performance: {
          overallAccuracy: performance.overallAccuracy,
          mcqAccuracy: performance.mcqAccuracy,
          saqAccuracy: performance.saqAccuracy,
          laqAccuracy: performance.laqAccuracy,
          topicPerformance: performance.topicPerformance,
          strengths: performance.strengths,
          weaknesses: performance.weaknesses,
          recommendations: [] // Disabled for performance
        }
      };
    });
    
    const result = { summary };
    
    // Cache the result
    setCache(result);
    
    res.json(result);
  } catch (error) {
    console.error('Progress API error:', error);
    res.status(500).json({ error: 'Failed to load progress data' });
  }
});

// Get detailed attempt history for a specific document
router.get('/attempts/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await Document.findById(documentId).select('title attempts createdAt');
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Sort attempts by creation date (newest first)
    const sortedAttempts = doc.attempts
      .map((attempt, index) => ({
        ...attempt.toObject(),
        attemptNumber: doc.attempts.length - index,
        id: `${doc._id}_${index}`
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      documentId: doc._id,
      title: doc.title,
      attempts: sortedAttempts,
      totalAttempts: doc.attempts.length
    });
  } catch (error) {
    console.error('Attempt history error:', error);
    res.status(500).json({ error: 'Failed to load attempt history' });
  }
});

// Invalidate cache endpoint
router.post('/invalidate', (req, res) => {
  invalidateCache();
  res.json({ success: true, message: 'Cache invalidated' });
});

export default router;


