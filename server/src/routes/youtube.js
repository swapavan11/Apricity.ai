import express from 'express';
import { generateText } from '../lib/gemini.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Function to get video details from YouTube search without API
async function getVideoDetailsFromSearch(query) {
  try {
    // Add filter to search: exclude shorts, prefer videos > 4 minutes
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIYAw%253D%253D`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    const html = await response.text();
    
    // Extract video data from YouTube's initial data
    const ytInitialDataMatch = html.match(/var ytInitialData = (\{.+?\});/);
    if (!ytInitialDataMatch) {
      console.warn('Could not find ytInitialData');
      return null;
    }
    
    try {
      const ytData = JSON.parse(ytInitialDataMatch[1]);
      
      // Navigate to video renderers
      const contents = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      if (!contents) return null;
      
      // Find video renderers
      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents;
        if (!items) continue;
        
        for (const item of items) {
          const videoRenderer = item?.videoRenderer;
          if (!videoRenderer) continue;
          
          const videoId = videoRenderer?.videoId;
          const title = videoRenderer?.title?.runs?.[0]?.text || videoRenderer?.title?.simpleText;
          const channel = videoRenderer?.ownerText?.runs?.[0]?.text;
          const lengthText = videoRenderer?.lengthText?.simpleText;
          
          // Check video length (filter shorts)
          if (lengthText) {
            const parts = lengthText.split(':').map(p => parseInt(p));
            let totalSeconds = 0;
            if (parts.length === 2) {
              totalSeconds = parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
              totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
            
            // Skip shorts (< 90 seconds)
            if (totalSeconds < 90) continue;
          }
          
          if (videoId && title && channel) {
            console.log(`Found video: "${title}" by ${channel} (${videoId})`);
            return {
              videoId,
              title,
              channel,
              url: `https://www.youtube.com/watch?v=${videoId}`
            };
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing YouTube data:', parseError.message);
    }
    
    // Fallback: Try regex extraction
    const videoIdMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    const titleMatches = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"/g)];
    const channelMatches = [...html.matchAll(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/g)];
    
    if (videoIdMatches.length > 0 && titleMatches.length > 0 && channelMatches.length > 0) {
      const videoId = videoIdMatches[0][1];
      const title = titleMatches[0][1];
      const channel = channelMatches[0][1];
      
      console.log(`Found video (fallback): "${title}" by ${channel} (${videoId})`);
      return {
        videoId,
        title,
        channel,
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    }
    
    console.warn(`No suitable video found for query: "${query}"`);
    return null;
  } catch (error) {
    console.error('Error fetching video details:', error.message);
    return null;
  }
}

router.get('/recommend', async (req, res) => {
  const { q, documentId } = req.query;
  
  try {
    // Step 1: Extract keywords and create reasoning flow
    const extractionSystem = `You are an educational content analyzer. Extract the most important keywords and concepts from the given text. 

IMPORTANT RULES:
1. Extract 7-8 specific, descriptive keywords (each keyword can be 1-3 words)
2. Keywords should be concrete concepts, topics, or terms (e.g., "Photosynthesis", "Cell Structure", "Quantum Mechanics")
3. Avoid generic words like "basics", "introduction", "learning"
4. Make keywords specific and searchable
    
Return a JSON object with this structure:
{
  "keywords": ["keyword1", "keyword2", "keyword3", ...],
  "mainTopics": ["topic1", "topic2", ...],
  "reasoning": "Brief explanation of what topics would be most helpful to learn about"
}`;

    let extractionPrompt = `Analyze this text and extract 7-8 key concepts/keywords:\n\n${q || 'General study topic'}`;
    
    // If we have a specific document, add context
    if (documentId && documentId !== 'all') {
      const Document = (await import('../models/Document.js')).default;
      const doc = await Document.findById(documentId);
      if (doc) {
        extractionPrompt += `\n\nPDF Context: ${doc.title}`;
        if (doc.chunks && doc.chunks.length > 0) {
          const sampleContent = doc.chunks.slice(0, 3).map(c => c.text).join(' ').slice(0, 500);
          extractionPrompt += `\n\nDocument Sample: ${sampleContent}`;
        }
      }
    }

    const extractionResult = await generateText({ prompt: extractionPrompt, system: extractionSystem, temperature: 0.5 });
    let extraction;
    try {
      extraction = JSON.parse(extractionResult);
      // Ensure we have 7-8 keywords
      if (!extraction.keywords || extraction.keywords.length < 7) {
        // Add more keywords from main topics if needed
        const combined = [...(extraction.keywords || []), ...(extraction.mainTopics || [])];
        extraction.keywords = combined.slice(0, 8);
      }
    } catch {
      // Fallback if JSON parsing fails - extract keywords from query
      const words = (q || 'General study topic').split(/\s+/).filter(w => w.length > 3);
      extraction = {
        keywords: words.slice(0, 8).length > 0 ? words.slice(0, 8) : [q],
        mainTopics: [q],
        reasoning: "Analyzing the provided content for relevant educational videos."
      };
    }

    // Step 2: Generate learning flow with video recommendations
    const flowSystem = `You are an educational content curator. Based on the keywords, create 6-10 video recommendations in learning sequence.

STRICT RULES:
1. Video title: MAXIMUM 4 words (e.g., "Photosynthesis Basics", "Cell Division Process")
2. Description: MAXIMUM 8 words (e.g., "Understand basic concepts and processes")
3. Stage: Must be exactly one of: Foundation, Core Concepts, Advanced, Practice

Return ONLY valid JSON array:
[
  {
    "title": "max 4 words",
    "description": "max 8 words",
    "stage": "Foundation/Core Concepts/Advanced/Practice"
  }
]

DO NOT include any text outside the JSON array.`;

    const flowPrompt = `Keywords: ${extraction.keywords.slice(0, 5).join(', ')}
Topics: ${extraction.mainTopics.slice(0, 3).join(', ')}

Generate SHORT video recommendations.`;

    const flowResult = await generateText({ prompt: flowPrompt, system: flowSystem, temperature: 0.5 });
    
    let videoFlow;
    try {
      // Clean the response - remove any markdown formatting
      const cleanResult = flowResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      videoFlow = JSON.parse(cleanResult);
      
      // Ensure titles are short
      videoFlow = videoFlow.slice(0, 10).map(v => ({
        title: v.title.split(' ').slice(0, 4).join(' '),
        description: v.description.split(' ').slice(0, 8).join(' '),
        stage: v.stage
      }));
    } catch (e) {
      console.error('JSON parse error:', e);
      // Fallback with very short titles
      videoFlow = extraction.keywords.slice(0, 6).map((keyword, i) => ({
        title: keyword.split(' ').slice(0, 3).join(' '),
        description: i < 2 ? "Learn basics" : i < 4 ? "Understand concepts" : "Practice skills",
        stage: i < 2 ? "Foundation" : i < 4 ? "Core Concepts" : "Practice"
      }));
    }

    // Step 3: Fetch actual videos from YouTube dynamically (NO hardcoded channels)
    const suggestions = [];
    
    for (let index = 0; index < videoFlow.length; index++) {
      const video = videoFlow[index];
      
      // Create highly contextual search query WITHOUT channel restriction
      const mainContext = (q || '').split(' ').slice(0, 3).join(' ');
      const contextKeywords = extraction.keywords.slice(0, 3).join(' ');
      const mainSubject = extraction.mainTopics && extraction.mainTopics.length > 0 
        ? extraction.mainTopics[0].split(',')[0].trim() 
        : '';
      
      let searchQuery;
      
      // Build comprehensive search query based on stage (NO channel name)
      if (video.stage === 'Foundation') {
        searchQuery = `${video.title} ${mainSubject} ${mainContext} introduction basics explained tutorial`;
      } 
      else if (video.stage === 'Advanced') {
        searchQuery = `${video.title} ${mainSubject} ${contextKeywords} advanced detailed tutorial`;
      }
      else if (video.stage === 'Practice') {
        searchQuery = `${video.title} ${mainSubject} ${contextKeywords} practice problems solved examples`;
      }
      else {
        searchQuery = `${video.title} ${mainSubject} ${contextKeywords} complete tutorial explained`;
      }
      
      // Get actual video details from YouTube search (with real channel)
      const videoDetails = await getVideoDetailsFromSearch(searchQuery);
      
      if (videoDetails) {
        suggestions.push({
          title: videoDetails.title, // Real video title from YouTube
          description: video.description,
          stage: video.stage,
          sequence: index + 1,
          channel: videoDetails.channel, // Real channel from YouTube
          url: videoDetails.url, // Direct video link
          videoId: videoDetails.videoId,
          query: searchQuery
        });
      } else {
        // Skip if no video found - better than showing broken links
        console.warn(`No video found for: ${searchQuery}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({ 
      query: q || 'General study topic',
      extraction: {
        keywords: extraction.keywords,
        mainTopics: extraction.mainTopics,
        reasoning: extraction.reasoning
      },
      suggestions,
      generated: true
    });

  } catch (error) {
    console.error('YouTube recommendation error:', error);
    
    // Fallback to static suggestions if AI generation fails
    const shortQuery = (q || 'Study topic').split(' ').slice(0, 3).join(' ');
    
    // Create fallback recommendations with dynamic search
    const fallbackVideos = [
      { title: `${shortQuery} Basics`, stage: 'Foundation', description: 'Learn foundational concepts' },
      { title: `${shortQuery} Explained`, stage: 'Core Concepts', description: 'Detailed explanation with examples' },
      { title: `${shortQuery} Practice`, stage: 'Practice', description: 'Apply concepts with problems' }
    ];
    
    // Fetch actual videos dynamically for fallback too
    const suggestions = [];
    
    for (let index = 0; index < fallbackVideos.length; index++) {
      const video = fallbackVideos[index];
      
      // Create better search query for fallback WITHOUT channel restriction
      let searchQuery;
      if (video.stage === 'Foundation') {
        searchQuery = `${shortQuery} introduction basics complete explained tutorial`;
      } else if (video.stage === 'Practice') {
        searchQuery = `${shortQuery} practice problems solved examples`;
      } else {
        searchQuery = `${shortQuery} complete tutorial explained`;
      }
      
      // Get actual video details dynamically
      const videoDetails = await getVideoDetailsFromSearch(searchQuery);
      
      if (videoDetails) {
        suggestions.push({
          title: videoDetails.title, // Real video title from YouTube
          description: video.description,
          stage: video.stage,
          sequence: index + 1,
          channel: videoDetails.channel, // Real channel from YouTube
          url: videoDetails.url, // Direct video link
          videoId: videoDetails.videoId,
          query: searchQuery
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    res.json({ 
      query: shortQuery, 
      extraction: {
        keywords: [shortQuery],
        mainTopics: [shortQuery],
        reasoning: "Using fallback recommendations due to analysis error."
      },
      suggestions,
      generated: false,
      error: 'AI generation failed, using fallback'
    });
  }
});

// Recommend videos based on entire PDF content
router.get('/recommend-by-pdf', optionalAuth, async (req, res) => {
  const { documentId } = req.query;
  
  if (!documentId) {
    return res.status(400).json({ error: 'documentId required' });
  }
  
  try {
    // Import Document model
    const Document = (await import('../models/Document.js')).default;
    const doc = await Document.findById(documentId);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Extract comprehensive content from PDF
    const pdfContent = doc.chunks && doc.chunks.length > 0
      ? doc.chunks.map(c => c.text).join(' ').slice(0, 5000) // Take first 5000 chars for analysis
      : doc.title;
    
    // Extract keywords from entire PDF
    const extractionSystem = `You are an educational content analyzer for PDF documents. Extract key concepts from the entire document to create a comprehensive learning series.

IMPORTANT RULES:
1. Extract 8-12 main topics/keywords that cover the ENTIRE document
2. Keywords should be specific concepts, chapters, or major themes
3. Each keyword can be 1-3 words
4. Focus on creating a complete learning path

Return JSON:
{
  "keywords": ["keyword1", "keyword2", ...],
  "mainTopics": ["Main theme 1", "Main theme 2", ...],
  "chapters": ["Chapter/section titles if identifiable"]
}`;

    const extractionPrompt = `Analyze this PDF content and extract comprehensive topics:

Document Title: ${doc.title}
Content Sample: ${pdfContent}

Extract all major topics to create a complete learning series.`;

    const extractionResult = await generateText({
      prompt: extractionPrompt,
      system: extractionSystem,
      temperature: 0.3
    });
    
    let extraction;
    try {
      const cleanResult = extractionResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extraction = JSON.parse(cleanResult);
    } catch {
      extraction = {
        keywords: [doc.title],
        mainTopics: [doc.title],
        chapters: []
      };
    }
    
    // Generate comprehensive video series covering entire PDF
    const seriesSystem = `You are creating a comprehensive YouTube learning series for an entire PDF document.

RULES:
1. Create 8-15 videos that cover the ENTIRE document from start to finish
2. Videos should be in LEARNING ORDER (basics -> advanced)
3. Each video title: 3-5 words max
4. Each video should have 2-4 relevant tags
5. Tags are specific topics covered in that video

Return JSON array:
[
  {
    "title": "Short video title",
    "description": "What this video covers",
    "tags": ["tag1", "tag2", "tag3"]
  }
]`;

    const seriesPrompt = `Create a comprehensive video learning series for this PDF:

Document: ${doc.title}
Main Topics: ${extraction.mainTopics.join(', ')}
Key Concepts: ${extraction.keywords.join(', ')}

Create 8-15 videos in learning order that cover EVERYTHING in this document.`;

    const seriesResult = await generateText({
      prompt: seriesPrompt,
      system: seriesSystem,
      temperature: 0.5
    });
    
    let videoSeries;
    try {
      const cleanSeries = seriesResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      videoSeries = JSON.parse(cleanSeries);
    } catch {
      // Fallback: create simple series from keywords
      videoSeries = extraction.keywords.slice(0, 10).map((keyword, i) => ({
        title: keyword,
        description: `Learn about ${keyword}`,
        tags: [keyword, extraction.mainTopics[0] || doc.title]
      }));
    }
    
    // Fetch actual videos for each topic
    const suggestions = [];
    
    for (let index = 0; index < Math.min(videoSeries.length, 15); index++) {
      const video = videoSeries[index];
      
      // Create focused search query using video title and tags only (NO PDF name)
      // This gives better, more relevant results
      const tags = video.tags && video.tags.length > 0 ? video.tags.slice(0, 2).join(' ') : '';
      const searchQuery = `${video.title} ${tags} tutorial explained`.trim();
      
      // Get actual video details
      const videoDetails = await getVideoDetailsFromSearch(searchQuery);
      
      if (videoDetails) {
        suggestions.push({
          title: videoDetails.title,
          description: video.description,
          sequence: index + 1,
          channel: videoDetails.channel,
          url: videoDetails.url,
          videoId: videoDetails.videoId,
          tags: video.tags || [],
          query: searchQuery
        });
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    res.json({
      pdfName: doc.title,
      extraction: {
        keywords: extraction.keywords,
        mainTopics: extraction.mainTopics
      },
      suggestions,
      generated: true
    });
    
  } catch (error) {
    console.error('PDF video recommendation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF-based recommendations',
      message: error.message
    });
  }
});

// Recommend videos based on user instruction
router.post('/recommend-by-instruction', optionalAuth, async (req, res) => {
  const { instruction } = req.body;
  
  if (!instruction || !instruction.trim()) {
    return res.status(400).json({ error: 'instruction required' });
  }
  
  try {
    // Generate study plan and video series based on user instruction
    const planSystem = `You are an educational content curator creating a YouTube learning series based on user instructions.

RULES:
1. Analyze the user's learning goal, context, and preferences
2. Create 8-12 videos in optimal learning order
3. Each video title: 3-5 words, specific and searchable
4. Each video has 2-4 relevant tags
5. Consider video type preference (beginner/advanced, theoretical/practical, etc.)

Return JSON:
{
  "studyPlan": "Brief 2-3 sentence overview of the learning path",
  "videos": [
    {
      "title": "Video topic",
      "description": "What this covers",
      "tags": ["tag1", "tag2"]
    }
  ],
  "keywords": ["main", "topics"]
}`;

    const planPrompt = `Create a comprehensive YouTube learning series based on this instruction:

${instruction}

Generate an optimal learning path with specific, searchable video topics.`;

    const planResult = await generateText({
      prompt: planPrompt,
      system: planSystem,
      temperature: 0.5
    });
    
    let plan;
    try {
      const cleanResult = planResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      plan = JSON.parse(cleanResult);
    } catch {
      return res.status(500).json({ error: 'Failed to generate study plan' });
    }
    
    // Fetch actual videos
    const suggestions = [];
    
    for (let index = 0; index < Math.min(plan.videos.length, 12); index++) {
      const video = plan.videos[index];
      const tags = video.tags && video.tags.length > 0 ? video.tags.slice(0, 2).join(' ') : '';
      const searchQuery = `${video.title} ${tags} tutorial`;
      
      const videoDetails = await getVideoDetailsFromSearch(searchQuery);
      
      if (videoDetails) {
        suggestions.push({
          title: videoDetails.title,
          description: video.description,
          sequence: index + 1,
          channel: videoDetails.channel,
          url: videoDetails.url,
          videoId: videoDetails.videoId,
          tags: video.tags || [],
          query: searchQuery
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    res.json({
      studyPlan: plan.studyPlan,
      extraction: {
        keywords: plan.keywords || [],
        mainTopics: [instruction.split(' ').slice(0, 5).join(' ')]
      },
      suggestions,
      generated: true
    });
    
  } catch (error) {
    console.error('Instruction-based recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations', message: error.message });
  }
});

// Recommend videos based on chat history analysis
router.post('/recommend-by-chat', optionalAuth, async (req, res) => {
  const { chatId } = req.body;
  
  if (!chatId) {
    return res.status(400).json({ error: 'chatId required' });
  }
  
  try {
    // Import Chat model
    const Chat = (await import('../models/Chat.js')).default;
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Extract topics from chat messages
    const chatContent = chat.messages
      .map(m => m.content)
      .join(' ')
      .slice(0, 3000);
    
    const analysisSystem = `Analyze this chat conversation and identify key learning topics for video recommendations.

RULES:
1. Extract 6-10 main topics discussed
2. Create 8-12 video recommendations covering these topics
3. Videos in learning order
4. Each video has 2-4 tags

Return JSON:
{
  "topics": ["topic1", "topic2", ...],
  "videos": [{"title": "...", "description": "...", "tags": [...]}]
}`;

    const analysisPrompt = `Analyze this chat and suggest educational videos:

${chatContent}`;

    const analysisResult = await generateText({
      prompt: analysisPrompt,
      system: analysisSystem,
      temperature: 0.4
    });
    
    let analysis;
    try {
      const cleanResult = analysisResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanResult);
    } catch {
      return res.status(500).json({ error: 'Failed to analyze chat' });
    }
    
    // Fetch actual videos
    const suggestions = [];
    
    for (let index = 0; index < Math.min(analysis.videos.length, 12); index++) {
      const video = analysis.videos[index];
      const tags = video.tags && video.tags.length > 0 ? video.tags.slice(0, 2).join(' ') : '';
      const searchQuery = `${video.title} ${tags} explained`;
      
      const videoDetails = await getVideoDetailsFromSearch(searchQuery);
      
      if (videoDetails) {
        suggestions.push({
          title: videoDetails.title,
          description: video.description,
          sequence: index + 1,
          channel: videoDetails.channel,
          url: videoDetails.url,
          videoId: videoDetails.videoId,
          tags: video.tags || [],
          query: searchQuery
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    res.json({
      chatAnalysis: `Analyzed ${chat.messages.length} messages`,
      extraction: {
        keywords: analysis.topics || [],
        mainTopics: analysis.topics ? analysis.topics.slice(0, 3) : []
      },
      suggestions,
      generated: true
    });
    
  } catch (error) {
    console.error('Chat-based recommendation error:', error);
    res.status(500).json({ error: 'Failed to analyze chat', message: error.message });
  }
});

// Summarize YouTube video by URL/ID
router.post('/summarize', optionalAuth, async (req, res) => {
  const { videoUrl, videoId } = req.body;
  
  // Extract video ID from URL if provided
  let extractedVideoId = videoId;
  if (videoUrl && !extractedVideoId) {
    const urlMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) {
      extractedVideoId = urlMatch[1];
    }
  }
  
  if (!extractedVideoId) {
    return res.status(400).json({ error: 'videoUrl or videoId required' });
  }
  
  try {
    // Fetch video info from YouTube (no API key needed)
    // Note: This is a simplified version. In production, you'd use YouTube Transcript API
    const videoInfoUrl = `https://www.youtube.com/watch?v=${extractedVideoId}`;
    
    // Fetch video title and info from YouTube page
    const response = await fetch(videoInfoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // Extract video title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const videoTitle = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'Video';
    
    // Generate educational summary based on title and context
    const system = `You are an AI educational assistant that creates detailed, helpful summaries for students.

Create a comprehensive study guide with:
1. **Overview**: What the video likely covers (2-3 sentences)
2. **Key Concepts**: Main topics and ideas (4-6 bullet points)
3. **Learning Objectives**: What students will understand after watching
4. **Study Tips**: How to best learn from this content
5. **Related Topics**: What to explore next

Make it actionable and helpful for students.`;

    const prompt = `Create a detailed study guide for this educational video:

Video Title: "${videoTitle}"
Video URL: ${videoInfoUrl}

Based on the title and educational context, provide a comprehensive guide that helps students understand and learn from this video effectively.`;

    const summary = await generateText({ 
      prompt, 
      system, 
      temperature: 0.7 
    });
    
    res.json({ 
      success: true,
      summary,
      videoId: extractedVideoId,
      videoTitle,
      videoUrl: videoInfoUrl
    });
    
  } catch (error) {
    console.error('Video summarization error:', error);
    res.status(500).json({ 
      error: 'Failed to summarize video',
      message: error.message 
    });
  }
});

export default router;


