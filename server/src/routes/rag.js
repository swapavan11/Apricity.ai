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

// Ask endpoint: support both authenticated and guest users
router.post('/ask', optionalAuth, async (req, res) => {
  try {
  const { query, documentId, allowGeneral = true, chatId, createIfMissing, images = [], inDepthMode = false } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    
    console.log('Ask request:', { query: query.slice(0, 50), documentId, chatId, hasImages: images.length > 0, userId: req.user?._id || 'guest' });
  
  // If documentId is explicitly null or "all", use general knowledge (no PDF)
  if (!documentId || documentId === 'all') {
    console.log('General chat mode - no PDF selected');
    const system = inDepthMode
      ? `You are Gini, an AI tutor from Apricity.ai created by Swapnil Sontakke. Your role is to help students learn deeply and thoroughly.\n\nKey guidelines:\n- Provide **very detailed, comprehensive answers** (4-8 paragraphs or more if needed)\n- Include step-by-step explanations, relevant examples, and deeper context\n- Break down complex concepts into simple parts, and elaborate on each\n- Use analogies, diagrams (describe them), and real-world applications when possible\n- Be conversational and natural, but focus on depth and clarity\n- Only mention your identity if directly asked\n- Remember the conversation context and refer back to previous messages when relevant\n\nAlways be friendly, encouraging, and patient.`
  : `You are Gini, an AI tutor from Apricity.ai created by Swapnil Sontakke. Your role is to help students learn effectively.\n\nKey guidelines:\n- Provide **medium-length answers** (2–4 paragraphs; do NOT give just a short summary or 1–2 sentences)\n- Be clear and direct - get to the point quickly\n- Use simple language with relevant examples when needed\n- Break down complex concepts into understandable parts\n- Be conversational and natural - avoid robotic or repetitive introductions\n- Only mention your identity if directly asked "who are you" or "what are you" and when you get greeting\n- Focus on answering the question directly rather than introducing yourself\n- Remember the conversation context and refer back to previous messages when relevant\n\nAlways be friendly, encouraging, and patient.`;

    // Build context from chat history if available (only for authenticated users)
    let contextPrompt = '';
    if (req.user && chatId) {
      const existingChat = await Chat.findById(chatId);
      if (existingChat && existingChat.userId.toString() === req.user._id.toString() && existingChat.messages && existingChat.messages.length > 0) {
        const recentMessages = existingChat.messages.slice(-16); // Last 16 messages (8 exchanges)
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

    // Persist to chat history if chatId provided (only for authenticated users)
    let chat = null;
    if (req.user) {
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
    }

    return res.json({ answer, citations: [], usedGeneral: true, chatId: chat?._id || chatId || null, isGuest: !req.user });
  }
  
  // Only search documents belonging to the requesting user (or allow public access for guest users if no uploadedBy)
  let docs = [];
  if (documentId) {
    const d = await Document.findById(documentId);
    if (!d) return res.json({ answer: "No documents found. Please upload a PDF first.", citations: [], usedGeneral: true });
    // Only check ownership if user is authenticated and document has an owner
    if (req.user && d.uploadedBy && d.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to document' });
    }
    docs = [d];
  }
  if (!docs.length) {
    return res.json({ answer: "No documents found. Please upload a PDF first.", citations: [], usedGeneral: true });
  }
  // --- Improved PDF context retrieval ---
  // 1. Query expansion: add synonyms and related terms
  function expandQuery(q) {
    // Simple expansion: add synonyms for common question words
    let expanded = [q];
    if (/define|meaning|what is/i.test(q)) expanded.push(q.replace(/define|meaning|what is/gi, 'explain'));
    if (/how/i.test(q)) expanded.push(q.replace(/how/gi, 'method'));
    if (/why/i.test(q)) expanded.push(q.replace(/why/gi, 'reason'));
    // Add more expansions as needed
    return Array.from(new Set(expanded));
  }
  const expandedQueries = expandQuery(query);
  // 2. Embed all expanded queries and average
  let queryVec = null;
  let embeddingError = null;
  try {
    const vecs = await embedTexts(expandedQueries);
    if (Array.isArray(vecs) && vecs.length) {
      queryVec = vecs[0];
      if (vecs.length > 1) {
        // Average all vectors
        for (let i = 1; i < vecs.length; i++) {
          for (let j = 0; j < queryVec.length; j++) {
            queryVec[j] += vecs[i][j];
          }
        }
        for (let j = 0; j < queryVec.length; j++) {
          queryVec[j] /= vecs.length;
        }
      }
    }
  } catch (e) {
    embeddingError = e;
    console.error('Embedding request failed:', e);
  }
  // 3. Score chunks with weighted sum of embedding and lexical scores
  const contexts = [];
  for (const d of docs) {
    if (!d.chunks || !d.chunks.length) {
      console.log(`Document ${d.title} has no chunks`);
      continue;
    }
    for (let idx = 0; idx < Math.min(d.chunks.length, 500); idx++) {
      const c = d.chunks[idx];
      if (!c.text || c.text.trim().length < 10) continue;
      let embScore = queryVec && Array.isArray(c.embedding) ? cosineSimilarityVec(queryVec, c.embedding) : 0;
      let lexScore = lexicalScore(query, c.text);
      // Weighted sum: favor embedding but include lexical
      let score = 0.7 * embScore + 0.3 * lexScore;
      contexts.push({ d, c, score, idx });
    }
  }
  if (!contexts.length) {
    return res.json({ answer: "No relevant content found in the uploaded documents. Please try a different question or upload more documents.", citations: [], usedGeneral: true });
  }
  // 4. Select top 12 chunks, merge adjacent chunks for context
  contexts.sort((a, b) => b.score - a.score);
  let top = contexts.slice(0, 12);
  // Merge adjacent chunks (same doc, consecutive idx)
  const merged = [];
  for (let i = 0; i < top.length; i++) {
    const curr = top[i];
    // If previous chunk is same doc and adjacent idx, merge
    if (
      merged.length > 0 &&
      merged[merged.length - 1].d._id.toString() === curr.d._id.toString() &&
      merged[merged.length - 1].idx + 1 === curr.idx
    ) {
      merged[merged.length - 1].c.text += ' ' + curr.c.text;
      merged[merged.length - 1].score = Math.max(merged[merged.length - 1].score, curr.score);
    } else {
      merged.push({ ...curr });
    }
  }
  // 5. For large PDFs, send only top matched and related chunks (merged for context)
  let citationText = '';
  const MAX_CHUNKS = 20;
  if (merged.length > MAX_CHUNKS) {
    // Only send top MAX_CHUNKS merged chunks
    const seenPages = new Set();
    citationText = merged
      .slice(0, MAX_CHUNKS)
      .filter(m => {
        if (seenPages.has(`${m.d._id}_${m.c.page}`)) return false;
        seenPages.add(`${m.d._id}_${m.c.page}`);
        return true;
      })
      .map(m => `Doc: ${m.d.title} p.${m.c.page}: "${(m.c.text || '').slice(0, 400).replace(/\s+/g, ' ')}"`)
      .join('\n');
  } else {
    // For small PDFs, send all merged chunks
    const seenPages = new Set();
    citationText = merged
      .filter(m => {
        if (seenPages.has(`${m.d._id}_${m.c.page}`)) return false;
        seenPages.add(`${m.d._id}_${m.c.page}`);
        return true;
      })
      .map(m => `Doc: ${m.d.title} p.${m.c.page}: "${(m.c.text || '').slice(0, 400).replace(/\s+/g, ' ')}"`)
      .join('\n');
  }
  const avgScore = merged.length ? (merged.reduce((s, x) => s + x.score, 0) / merged.length) : 0;
  // ...existing code...

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
  } else if (contexts.length === 0 || avgScore <= 0) {
    // No relevant PDF info or very weak match: use general knowledge
    system = inDepthMode
      ? `You are Gini, an AI tutor from Apricity.ai. The user has uploaded a PDF but their question isn't directly related to it.\n\nGuidelines:\n- Give **very detailed, comprehensive answers** (4-8 paragraphs or more if needed)\n- Include step-by-step explanations, relevant examples, and deeper context\n- Break down complex ideas into simple parts, and elaborate on each\n- Use analogies, diagrams (describe them), and real-world applications when possible\n- Be conversational and natural in your tone\n- Only mention your identity if directly asked about who you are\n\nFocus on clarity and ensuring the student understands.`
      : `You are Gini, an AI tutor from Apricity.ai. The user has uploaded a PDF but their question isn't directly related to it.\n\nGuidelines:\n- Give **medium-length answers** (2–4 paragraphs; do NOT give just a short summary or 1–2 sentences)\n- Be clear and direct - get to the point quickly\n- Include relevant examples when helpful\n- Break down complex ideas into understandable parts\n- Be conversational and natural in your tone\n- Only mention your identity if directly asked about who you are\n\nFocus on clarity and ensuring the student understands.`;
    prompt = `Question: ${query}`;
  } else {
    // Special handling for "what is in the PDF" type questions
    const whatInPdfRegex = /^(what('| i)?s in (the )?(pdf|document|file)|show (me )?(the )?(pdf|document|file))/i;
    const summarizeRegex = /^summarize(\s|$)/i;
    const explainCodeRegex = /^(explain( entire)? code( in (the )?pdf)?|explain all code( in (the )?pdf)?)/i;
    if (explainCodeRegex.test(query.trim())) {
      system = `You are Gini, an AI tutor from Apricity.ai. The user wants a detailed explanation of code found in a PDF.\n\nGuidelines:\n- You are receiving code extracted from a PDF document.\n- Break down the code, describe its purpose, logic, and how it works.\n- Reference page numbers naturally (e.g., "Page 5 contains...").\n- Do NOT give a generic explanation about your capabilities.\n- Do NOT ask the user to paste the code.\n- Only mention your identity if asked.\n- Be clear, focused, and informative.`;
      prompt = `Explain the following code extracted from a PDF document. Break down its logic, purpose, and how it works.\n\nCode from PDF:\n${citationText}`;
    } else if (whatInPdfRegex.test(query.trim())) {
      system = `You are Gini, an AI tutor from Apricity.ai. The user wants to know what is inside the PDF.\n\nGuidelines:\n- You are receiving text extracted from a PDF document.\n- Summarize the main topics, sections, and content found in the PDF.\n- List key points, headings, and any important information.\n- Reference page numbers naturally (e.g., "Page 5 covers...", "Page 3 mentions...").\n- Do NOT give a generic explanation about your capabilities.\n- Do NOT ask the user to paste the PDF text.\n- Only mention your identity if asked.\n- Be concise and informative.`;
      prompt = `Summarize the main topics and content found in this PDF document. List key points, sections, and important information.\n\nPDF content:\n${citationText}`;
    } else if (summarizeRegex.test(query.trim())) {
      system = `You are Gini, an AI tutor from Apricity.ai. The user wants a summary of the PDF.\n\nGuidelines:\n- You are receiving text extracted from a PDF document.\n- Read the PDF content below and write a concise summary of the main ideas, topics, and important details.\n- Do NOT explain what summarizing means.\n- Do NOT give a generic answer about summarization.\n- Only mention your identity if asked.\n- Be clear, focused, and informative.`;
      prompt = `Write a concise summary of the following PDF content. Focus on the main ideas, topics, and important details.\n\nPDF content:\n${citationText}`;
    } else {
      system = inDepthMode
        ? `You are Gini, an AI tutor from Apricity.ai. You are helping students by answering questions using both PDF content and your own knowledge.\n\nGuidelines for answering:\n1. **Start with PDF content**: Clearly state what the PDF says about the topic, referencing page numbers naturally (e.g., "According to Page 5..." or "Page 3 mentions...").\n2. **Then add a very detailed, step-by-step explanation**: After the PDF content, provide a comprehensive, multi-paragraph explanation using your own knowledge. Go deep into context, clarify key concepts, and elaborate on each point.\n3. **Natural tone**: Be conversational and educational, not robotic.\n4. **Only mention identity if asked**: Don't introduce yourself unless asked.\n\nIMPORTANT: If user asks "what's in the PDF" or "only what the document says", focus ONLY on PDF content without elaboration.\n\nDo NOT include document titles in citations - use only simple page references like (Page 5).`
        : `You are Gini, an AI tutor from Apricity.ai. You are helping students by answering questions using both PDF content and your own knowledge.\n\nGuidelines for answering:\n1. **Start with PDF content**: Clearly state what the PDF says about the topic, referencing page numbers naturally (e.g., "According to Page 5..." or "Page 3 mentions...").\n2. **Then add a medium-length explanation**: After the PDF content, provide a clear, detailed explanation using your own knowledge. Add context and clarify key concepts.\n3. **Natural tone**: Be conversational and educational, not robotic.\n4. **Only mention identity if asked**: Don't introduce yourself unless asked.\n\nIMPORTANT: If user asks "what's in the PDF" or "only what the document says", focus ONLY on PDF content without elaboration.\n\nDo NOT include document titles in citations - use only simple page references like (Page 5).`;
      prompt = `Question: ${query}\n\nRelevant content from the PDF:\n${citationText}\n\nThis is what the PDF says about your question above.\n\nDetailed explanation with context (using both the PDF and my own knowledge):\n${inDepthMode ? 'Please provide a step-by-step, multi-paragraph answer with deep explanations and examples.' : 'Please provide a clear, focused answer (2-4 paragraphs) with helpful context.'}`;
    }
  }
  answer = await generateText({ prompt, system, temperature: 0.7 });
  const citations = top.map(t => ({ documentId: t.d._id, title: t.d.title, page: t.c.page, snippet: (t.c.text || '').slice(0, 200) }));

  // Persist to chat history if chatId provided (or create one if requested) - only for authenticated users
  let chat = null;
  if (req.user) {
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
  }

  res.json({ answer, citations, usedGeneral: avgScore < 0.01 && allowGeneral, chatId: chat?._id || chatId || null, isGuest: !req.user });
  } catch (error) {
    console.error('Ask endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error', answer: null });
  }
});

export default router;


