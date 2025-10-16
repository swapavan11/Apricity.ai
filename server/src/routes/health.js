import express from 'express';
import { config } from '../lib/config.js';

let lastEmbeddingError = null;
export function setLastEmbeddingError(err) { lastEmbeddingError = err; }

const router = express.Router();

router.get('/ai', (req, res) => {
  res.json({
    embeddingsEnabled: !!config.EMBEDDINGS_ENABLED,
    maxChars: config.EMBEDDINGS_MAX_CHARS,
    lastEmbeddingError: lastEmbeddingError ? String(lastEmbeddingError).slice(0, 400) : null,
  });
});

export default router;


