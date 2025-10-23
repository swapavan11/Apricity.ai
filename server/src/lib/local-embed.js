/**
 * Get in-depth local embeddings: for each text, combine with previous and next for richer context.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Embedding vectors
 */
export async function localEmbedTextsInDepth(texts) {
  // For each text, combine with previous and next (if available)
  const inDepthTexts = texts.map((t, i) => {
    const prev = texts[i - 1] || '';
    const next = texts[i + 1] || '';
    return [prev, t, next].filter(Boolean).join(' ');
  });
  const res = await fetch('http://127.0.0.1:8080/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: inDepthTexts }),
  });
  const data = await res.json();
  return data.embeddings || texts.map(() => []);
}
import fetch from 'node-fetch';

/**
 * Get local embeddings from a Python FastAPI server running on localhost:8080
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Embedding vectors
 */
export async function localEmbedTexts(texts) {
  const res = await fetch('http://127.0.0.1:8080/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });
  const data = await res.json();
  return data.embeddings || texts.map(() => []);
}
