import express from 'express';
import { generateText } from '../lib/gemini.js';

const router = express.Router();

router.get('/recommend', async (req, res) => {
  const { q, documentId } = req.query;
  
  try {
    // Generate relevant YouTube search queries based on the user's question and PDF content
    const system = `You are an educational content curator. Based on the user's question and PDF content, generate 3-5 relevant YouTube search queries that would help the student learn more about the topic. Focus on educational channels and specific topics that relate to the question.

Return only the search queries, one per line, without any additional text or formatting.`;

    let prompt = `User Question: ${q || 'General study topic'}`;
    
    // If we have a specific document, try to get some context about it
    if (documentId && documentId !== 'all') {
      const Document = (await import('../models/Document.js')).default;
      const doc = await Document.findById(documentId);
      if (doc) {
        prompt += `\n\nPDF Document: ${doc.title}`;
        // Add some sample content from the document to help generate relevant queries
        if (doc.chunks && doc.chunks.length > 0) {
          const sampleContent = doc.chunks.slice(0, 3).map(c => c.text).join(' ').slice(0, 500);
          prompt += `\n\nDocument Content Sample: ${sampleContent}`;
        }
      }
    }

    const searchQueries = await generateText({ prompt, system, temperature: 0.7 });
    const queries = searchQueries.split('\n').filter(q => q.trim()).slice(0, 5);

    // Generate YouTube suggestions based on the search queries
    const suggestions = queries.map((query, index) => {
      const cleanQuery = query.trim().replace(/^\d+\.\s*/, ''); // Remove numbering if present
      const encodedQuery = encodeURIComponent(cleanQuery);
      
      // Generate more specific titles based on the query
      const channelSuggestions = [
        'Physics Wallah',
        'Khan Academy', 
        'Magnet Brains',
        'Unacademy',
        'Vedantu',
        'BYJU\'S',
        'Toppr',
        'Aakash Institute'
      ];
      
      const randomChannel = channelSuggestions[Math.floor(Math.random() * channelSuggestions.length)];
      
      return {
        title: `${randomChannel} - ${cleanQuery}`,
        url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
        query: cleanQuery
      };
    });

    res.json({ 
      query: q || 'General study topic',
      suggestions,
      generated: true
    });

  } catch (error) {
    console.error('YouTube recommendation error:', error);
    
    // Fallback to static suggestions if AI generation fails
    const query = q || 'NCERT Class 11 Physics lecture';
    const suggestions = [
      { 
        title: 'Physics Wallah - Class 11 Physics Complete Course', 
        url: `https://www.youtube.com/results?search_query=Physics+Wallah+Class+11+Physics+${encodeURIComponent(query)}`,
        query: `Physics Wallah Class 11 Physics ${query}`
      },
      { 
        title: 'Khan Academy - Physics Fundamentals', 
        url: `https://www.youtube.com/results?search_query=Khan+Academy+Physics+${encodeURIComponent(query)}`,
        query: `Khan Academy Physics ${query}`
      },
      { 
        title: 'Magnet Brains - NCERT Physics 11', 
        url: `https://www.youtube.com/results?search_query=Magnet+Brains+NCERT+Physics+11+${encodeURIComponent(query)}`,
        query: `Magnet Brains NCERT Physics 11 ${query}`
      },
    ];
    
    res.json({ 
      query, 
      suggestions,
      generated: false,
      error: 'AI generation failed, using fallback'
    });
  }
});

export default router;


