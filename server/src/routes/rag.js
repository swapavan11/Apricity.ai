import express from 'express';
import Document from '../models/Document.js';
import Chat from '../models/Chat.js';
import { generateText, embedTexts } from '../lib/gemini.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// --- Chat management routes ---
// Chats are per-user. Require authentication and scope by userId.
router.get('/chats', authenticateToken, async (req, res) => {
  const { documentId } = req.query;
  const q = { userId: req.user._id };
  if (documentId) q.documentId = documentId;
  const chats = await Chat.find(q).select('title documentId updatedAt createdAt').sort({ updatedAt: -1 });
  res.json({ chats });
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
function lexicalScore(a, b) {
  const textA = (a || '').toLowerCase()
  const textB = (b || '').toLowerCase()
  
  // Simple word overlap
  const wordsA = textA.split(/\W+/).filter(w => w.length > 2)
  const wordsB = textB.split(/\W+/).filter(w => w.length > 2)
  const setA = new Set(wordsA)
  const setB = new Set(wordsB)
  const intersection = [...setA].filter(x => setB.has(x))
  const wordScore = intersection.length / Math.sqrt(Math.max(setA.size * setB.size, 1))
  
  // Substring matching for partial matches
  const substringScore = textA.includes(textB.slice(0, 20)) || textB.includes(textA.slice(0, 20)) ? 0.3 : 0
  
  return Math.max(wordScore, substringScore)
}

// Ask endpoint: require authentication to use user-owned documents and persist chats
router.post('/ask', authenticateToken, async (req, res) => {
  const { query, documentId, allowGeneral = true, chatId, createIfMissing } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });
  // Only search documents belonging to the requesting user unless a specific
  // documentId is provided; even then ensure ownership.
  let docs = [];
  if (documentId) {
    const d = await Document.findById(documentId);
    if (!d) return res.json({ answer: "No documents found. Please upload a PDF first.", citations: [], usedGeneral: true });
    if (d.uploadedBy && d.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied to document' });
    }
    docs = [d];
  } else {
    docs = await Document.find({ uploadedBy: req.user._id });
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
  if (avgScore < 0.005 && allowGeneral) {
    // Score is too low, use general knowledge
    const system = 'You are a knowledgeable tutor. Provide a concise, accurate answer even if no citations are present. If the question is vague, ask a clarifying follow-up.';
    const prompt = `Question: ${query}`;
    answer = await generateText({ prompt, system });
    console.log('Using general knowledge (low score):', avgScore);
  } else {
    // Use PDF content - be more aggressive about using uploaded content
    const system = 'You are a helpful tutor. Answer using the provided citations from the PDFs. Always reference the page numbers and document titles. Be comprehensive and detailed. If the citations don\'t fully answer the question, provide what information you can from the documents and explain what might be missing.';
    const prompt = `Question: ${query}\n\nRelevant content from PDFs:\n${citationText}\n\nAnswer based on the provided content from the PDFs, citing page numbers like (p. X from "${docs[0]?.title || 'document'}"). Use the PDF content as your primary source.`;
    answer = await generateText({ prompt, system });
    console.log('Using PDF content (score):', avgScore);
  }
  const citations = top.map(t => ({ documentId: t.d._id, title: t.d.title, page: t.c.page, snippet: (t.c.text || '').slice(0, 200) }));

  // Persist to chat history if chatId provided (or create one if requested)
  let chat = null;
  if (chatId) {
    chat = await Chat.findById(chatId);
    if (!chat) {
      console.error(`Chat ${chatId} not found`);
    } else if (chat.userId.toString() !== req.user._id.toString()) {
      console.error(`Chat ${chatId} access denied for user ${req.user._id}`);
      chat = null;
    }
  } else if (createIfMissing) {
    const docTitle = docs?.[0]?.title || 'General Chat';
    chat = await Chat.create({ 
      documentId: documentId || null, 
      title: docTitle, 
      messages: [],
      userId: req.user._id 
    });
  }

  if (chat) {
    chat.messages.push({ role: 'user', text: query, citations: [], createdAt: new Date() });
    chat.messages.push({ role: 'assistant', text: answer, citations, createdAt: new Date() });
    await chat.save();
  }

  res.json({ answer, citations, usedGeneral: avgScore < 0.01 && allowGeneral, chatId: chat?._id || chatId || null });
});

export default router;


