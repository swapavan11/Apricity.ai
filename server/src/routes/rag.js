import express from 'express';
import Document from '../models/Document.js';
import Chat from '../models/Chat.js';
import { generateText, generateTextWithImages, embedTexts } from '../lib/gemini.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// --- Chat management routes ---
// Chats are per-user. Require authentication and scope by userId.
router.get('/chats', authenticateToken, async (req, res) => {
  const { documentId } = req.query;
  const q = { userId: req.user._id };
  if (documentId) q.documentId = documentId;
  
  // Find chats and filter out those with empty messages
  const allChats = await Chat.find(q).select('title documentId updatedAt createdAt messages').sort({ updatedAt: -1 });
  const chats = allChats.filter(chat => chat.messages && chat.messages.length > 0);
  
  // Return chats without the messages field (keep it lightweight)
  const chatsResponse = chats.map(chat => ({
    _id: chat._id,
    title: chat.title,
    documentId: chat.documentId,
    updatedAt: chat.updatedAt,
    createdAt: chat.createdAt
  }));
  
  res.json({ chats: chatsResponse });
});

router.get('/chats/:id', authenticateToken, async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (chat.userId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied' });
  res.json(chat);
});

router.post('/chats', authenticateToken, async (req, res) => {
  const { documentId, title } = req.body;
  // Verify document ownership if provided
  if (documentId) {
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.uploadedBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied to document' });
  }
  const chat = await Chat.create({ documentId: documentId || null, title: title || 'New Chat', messages: [], userId: req.user._id });
  res.json({ id: chat._id, title: chat.title, documentId: chat.documentId });
});

// Delete chat
router.delete('/chats/:id', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.userId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied' });
    
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Rename chat
router.patch('/chats/:id', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.userId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied' });
    
    chat.title = title.trim();
    await chat.save();
    res.json({ success: true, chat: { _id: chat._id, title: chat.title } });
  } catch (error) {
    console.error('Rename chat error:', error);
    res.status(500).json({ error: 'Failed to rename chat' });
  }
});

router.get('/debug', async (req, res) => {
  const docs = await Document.find({});
  const summary = docs.map(d => ({
    id: d._id,
    title: d.title,
    pages: d.pages,
    chunksCount: d.chunks?.length || 0,
    firstChunkText: d.chunks?.[0]?.text?.slice(0, 100) || 'No text',
    hasEmbeddings: d.chunks?.[0]?.embedding ? 'Yes' : 'No'
  }));
  res.json({ docsFound: docs.length, summary });
});

function cosineSimilarityVec(a, b) {
  let dot = 0, na = 0, nb = 0
  const len = Math.min(a.length, b.length)
  for (let i=0;i<len;i++) { const x=a[i], y=b[i]; dot+=x*y; na+=x*x; nb+=y*y }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}
const levenshtein = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

function lexicalScore(a, b) {
  const textA = (a || '').toLowerCase();
  const textB = (b || '').toLowerCase();
  const wordsA = textA.split(/\W+/).filter(w => w.length > 2);
  const wordsB = textB.split(/\W+/).filter(w => w.length > 2);
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  // Fuzzy intersection: allow Levenshtein distance <= 1 for word match
  const fuzzyIntersection = [...setA].filter(x =>
    [...setB].some(y => x === y || levenshtein(x, y) <= 1)
  );
  const wordScore = fuzzyIntersection.length / Math.sqrt(Math.max(setA.size * setB.size, 1));
  // Substring matching for partial matches (more tolerant)
  const substringScore = (textA.includes(textB.slice(0, 12)) || textB.includes(textA.slice(0, 12))) ? 0.5 : 0;
  return Math.max(wordScore, substringScore);
}

// Ask endpoint: require authentication to use user-owned documents and persist chats
router.post('/ask', authenticateToken, async (req, res) => {
  try {
  const { query, documentId, allowGeneral = true, chatId, createIfMissing, images = [], inDepthMode = false } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    
    console.log('Ask request:', { query: query.slice(0, 50), documentId, chatId, hasImages: images.length > 0, userId: req.user._id });
  
  // If documentId is explicitly null or "all", use general knowledge (no PDF)
  if (!documentId || documentId === 'all') {
    console.log('General chat mode - no PDF selected');
    const system = inDepthMode
      ? `You are Gini, an AI tutor from Apricity.ai created by Swapnil Sontakke. Your role is to help students learn deeply and thoroughly.\n\nKey guidelines:\n- Provide **very detailed, comprehensive answers** (4-8 paragraphs or more if needed)\n- Include step-by-step explanations, relevant examples, and deeper context\n- Break down complex concepts into simple parts, and elaborate on each\n- Use analogies, diagrams (describe them), and real-world applications when possible\n- Be conversational and natural, but focus on depth and clarity\n- Only mention your identity if directly asked\n- Remember the conversation context and refer back to previous messages when relevant\n\nAlways be friendly, encouraging, and patient.`
  : `You are Gini, an AI tutor from Apricity.ai created by Swapnil Sontakke. Your role is to help students learn effectively.\n\nKey guidelines:\n- Provide **medium-length answers** (2–4 paragraphs; do NOT give just a short summary or 1–2 sentences)\n- Be clear and direct - get to the point quickly\n- Use simple language with relevant examples when needed\n- Break down complex concepts into understandable parts\n- Be conversational and natural - avoid robotic or repetitive introductions\n- Only mention your identity if directly asked "who are you" or "what are you" and when you get greeting\n- Focus on answering the question directly rather than introducing yourself\n- Remember the conversation context and refer back to previous messages when relevant\n\nAlways be friendly, encouraging, and patient.`;

    // Build context from chat history if available
    let contextPrompt = '';
    if (chatId) {
      const existingChat = await Chat.findById(chatId);
      if (existingChat && existingChat.messages && existingChat.messages.length > 0) {
        const recentMessages = existingChat.messages.slice(-6); // Last 6 messages (3 exchanges)
        contextPrompt = '\n\nPrevious conversation:\n' + recentMessages.map(m => 
          `${m.role === 'user' ? 'Student' : 'You'}: ${m.text.slice(0, 200)}`
        ).join('\n') + '\n\n';
      }
    }

    const prompt = `${contextPrompt}Current question: ${query}`;

    // Use vision API if images are present
    const answer = images.length > 0
      ? await generateTextWithImages({ prompt, system, imageUrls: images, temperature: 0.7 })
      : await generateText({ prompt, system, temperature: 0.7 });

    // Persist to chat history if chatId provided
    let chat = null;
    if (chatId) {
      chat = await Chat.findById(chatId);
      if (chat && chat.userId.toString() === req.user._id.toString()) {
        chat.messages.push({ role: 'user', text: query, images: images.length > 0 ? images : undefined, citations: [], createdAt: new Date() });
        chat.messages.push({ role: 'assistant', text: answer, citations: [], createdAt: new Date() });
        await chat.save();
      }
    } else if (createIfMissing) {
      chat = await Chat.create({ 
        documentId: null, 
        title: 'General Chat', 
        messages: [
          { role: 'user', text: query, images: images.length > 0 ? images : undefined, citations: [], createdAt: new Date() },
          { role: 'assistant', text: answer, citations: [], createdAt: new Date() }
        ],
        userId: req.user._id 
      });
    }

    return res.json({ answer, citations: [], usedGeneral: true, chatId: chat?._id || chatId || null });
  }
  
  // Only search documents belonging to the requesting user
  let docs = [];
  if (documentId) {
    const d = await Document.findById(documentId);
    if (!d) return res.json({ answer: "No documents found. Please upload a PDF first.", citations: [], usedGeneral: true });
    if (d.uploadedBy && d.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to document' });
    }
    docs = [d];
  }
  
  if (!docs.length) {
    return res.json({ answer: "No documents found. Please upload a PDF first.", citations: [], usedGeneral: true });
  }
  
  const contexts = [];
  let queryVec = null
  try {
    const [v] = await embedTexts([query])
    if (Array.isArray(v)) queryVec = v
  } catch (e) {}
  
  for (const d of docs) {
    if (!d.chunks || !d.chunks.length) {
      console.log(`Document ${d.title} has no chunks`);
      continue;
    }
    for (const c of d.chunks.slice(0, 500)) {
      if (!c.text || c.text.trim().length < 10) continue;
      let score = 0
      if (queryVec && Array.isArray(c.embedding)) {
        score = cosineSimilarityVec(queryVec, c.embedding)
      } else {
        score = lexicalScore(query, c.text)
      }
      contexts.push({ d, c, score });
    }
  }
  if (!contexts.length) {
    return res.json({ answer: "No relevant content found in the uploaded documents. Please try a different question or upload more documents.", citations: [], usedGeneral: true });
  }
  
  contexts.sort((a, b) => b.score - a.score);
  const top = contexts.slice(0, 5);
  const avgScore = top.length ? (top.reduce((s, x) => s + x.score, 0) / top.length) : 0;
  const citationText = top.map(t => `Doc: ${t.d.title} p.${t.c.page}: "${(t.c.text || '').slice(0, 300).replace(/\s+/g, ' ')}"`).join('\n');

  console.log('RAG Debug:', { 
    query, 
    documentId, 
    docsFound: docs.length, 
    totalChunks: docs.reduce((s, d) => s + d.chunks.length, 0),
    topScores: top.map(t => t.score),
    avgScore,
    citationText: citationText.slice(0, 200)
  });

  let answer;
  // Use PDF content if we have any relevant citations with decent scores
  // Lower the threshold to be more inclusive of PDF content
  // Always use Gemini's generative power for the best answer, even if PDF is weak or missing
  // Detect greetings or small talk for concise response
  const greetingRegex = /^(hi|hello|hey|greetings|good (morning|afternoon|evening)|what'?s up|how are you|how's it going|yo|sup|namaste|salaam|hola|bonjour|ciao|hallo|hey there)[!.,\s]*$/i;
  let system, prompt;
  if (greetingRegex.test(query.trim())) {
    system = `You are Gini, an AI tutor from Apricity.ai. If the user greets you or makes small talk, respond concisely and warmly (1-2 sentences max). Do not give a long or detailed answer for greetings.`;
    prompt = query;
  } else if (contexts.length === 0 || avgScore < 0.01) {
    // No relevant PDF info or very weak match: use general knowledge
    system = inDepthMode
      ? `You are Gini, an AI tutor from Apricity.ai. The user has uploaded a PDF but their question isn't directly related to it.\n\nGuidelines:\n- Give **very detailed, comprehensive answers** (4-8 paragraphs or more if needed)\n- Include step-by-step explanations, relevant examples, and deeper context\n- Break down complex ideas into simple parts, and elaborate on each\n- Use analogies, diagrams (describe them), and real-world applications when possible\n- Be conversational and natural in your tone\n- Only mention your identity if directly asked about who you are\n\nFocus on clarity and ensuring the student understands.`
      : `You are Gini, an AI tutor from Apricity.ai. The user has uploaded a PDF but their question isn't directly related to it.\n\nGuidelines:\n- Give **medium-length answers** (2–4 paragraphs; do NOT give just a short summary or 1–2 sentences)\n- Be clear and direct - get to the point quickly\n- Include relevant examples when helpful\n- Break down complex ideas into understandable parts\n- Be conversational and natural in your tone\n- Only mention your identity if directly asked about who you are\n\nFocus on clarity and ensuring the student understands.`;
    prompt = `Question: ${query}`;
  } else {
    // Use PDF content, but always let Gemini add its own generative context for a better answer
    system = inDepthMode
      ? `You are Gini, an AI tutor from Apricity.ai analyzing PDF documents.\n\nGuidelines for answering:\n1. **Start with PDF content**: State what the PDF says about the topic\n   - Reference page numbers naturally (e.g., "According to Page 5..." or "Page 3 mentions...")\n   - If PDF has limited info, state: "The PDF briefly mentions [summary]"\n\n2. **Then add a very detailed, step-by-step explanation**: After the PDF content, provide a comprehensive, multi-paragraph explanation:\n   - Go deep into context, clarify key concepts, and elaborate on each point\n   - Use analogies, diagrams (describe them), and real-world applications\n   - Include relevant examples and deeper insights\n\n3. **Natural tone**: Be conversational and educational, not robotic\n4. **Only mention identity if asked**: Don't introduce yourself unless asked\n\nIMPORTANT: If user asks "what's in the PDF" or "only what the document says", focus ONLY on PDF content without elaboration.\n\nDo NOT include document titles in citations - use only simple page references like (Page 5).`
      : `You are Gini, an AI tutor from Apricity.ai analyzing PDF documents.\n\nGuidelines for answering:\n1. **Start with PDF content**: State what the PDF says about the topic\n   - Reference page numbers naturally (e.g., "According to Page 5..." or "Page 3 mentions...")\n   - If PDF has limited info, state: "The PDF briefly mentions [summary]"\n\n2. **Then add a medium-length explanation**: After the PDF content, provide a clear, detailed explanation:\n   - Keep it **medium-length** (2–4 paragraphs; do NOT give just a short summary or 1–2 sentences)\n   - Add context and clarify key concepts\n   - Include relevant examples\n\n3. **Natural tone**: Be conversational and educational, not robotic\n4. **Only mention identity if asked**: Don't introduce yourself unless asked\n\nIMPORTANT: If user asks "what's in the PDF" or "only what the document says", focus ONLY on PDF content without elaboration.\n\nDo NOT include document titles in citations - use only simple page references like (Page 5).`;
    prompt = `Question: ${query}\n\nRelevant content from the PDF:\n${citationText}\n\nProvide a clear, focused answer${inDepthMode ? ' (4-8 paragraphs, step-by-step, with deep explanations and examples)' : ' (2-4 paragraphs)'}. Start with what the PDF says (reference page numbers like "Page 5"), then add context and explanation to help the student understand.\n\nIf the PDF does not fully answer the question, use your own knowledge to provide a complete, helpful answer.`;
  }
  answer = await generateText({ prompt, system, temperature: 0.7 });
  const citations = top.map(t => ({ documentId: t.d._id, title: t.d.title, page: t.c.page, snippet: (t.c.text || '').slice(0, 200) }));

  // Persist to chat history if chatId provided (or create one if requested)
  let chat = null;
  if (chatId) {
    chat = await Chat.findById(chatId);
    if (!chat) {
      console.warn(`Chat ${chatId} not found - will return answer without saving to chat`);
      // Still return the answer, just don't save to chat
    } else if (chat.userId.toString() !== req.user._id.toString()) {
      console.error(`Chat ${chatId} access denied for user ${req.user._id}`);
      chat = null;
    } else {
      // Chat found and authorized - save messages
      chat.messages.push({ role: 'user', text: query, images: images.length > 0 ? images : undefined, citations: [], createdAt: new Date() });
      chat.messages.push({ role: 'assistant', text: answer, citations, createdAt: new Date() });
      await chat.save();
      console.log(`Messages saved to chat ${chatId}`);
    }
  } else if (createIfMissing) {
    const docTitle = docs?.[0]?.title || 'General Chat';
    chat = await Chat.create({ 
      documentId: documentId || null, 
      title: docTitle, 
      messages: [
        { role: 'user', text: query, images: images.length > 0 ? images : undefined, citations: [], createdAt: new Date() },
        { role: 'assistant', text: answer, citations, createdAt: new Date() }
      ],
      userId: req.user._id 
    });
    console.log(`New chat created with ID ${chat._id}`);
  }

  res.json({ answer, citations, usedGeneral: avgScore < 0.01 && allowGeneral, chatId: chat?._id || chatId || null });
  } catch (error) {
    console.error('Ask endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error', answer: null });
  }
});

export default router;


