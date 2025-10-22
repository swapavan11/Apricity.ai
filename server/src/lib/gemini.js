// import { GoogleGenerativeAI } from '@google/generative-ai';

// const apiKey = process.env.GEMINI_API_KEY;
// if (!apiKey) {
//   console.warn('GEMINI_API_KEY not set. Please add it to your .env');
// }

// export function getGemini(model = 'gemini-1.5-flash-latest') {
//   const genAI = new GoogleGenerativeAI(apiKey);
//   return genAI.getGenerativeModel({ model });
// }

// export async function generateText({ prompt, system, model = 'gemini-1.5-flash-latest', temperature = 0.2 }) {
//   const m = getGemini(model);
//   const fullPrompt = [
//     system ? `System: ${system}` : null,
//     prompt,
//   ].filter(Boolean).join('\n\n');
//   const result = await m.generateContent(fullPrompt);
//   const response = await result.response;
//   return response.text();
// }

// export async function embedTexts(texts, { model = 'text-embedding-004' } = {}) {
//   const genAI = new GoogleGenerativeAI(apiKey);
//   const inputs = texts.map(t => ({ content: { parts: [{ text: String(t || '') }] } }));
//   // Prefer batch embeddings when available
//   try {
//     const res = await genAI.batchEmbedContents({ model, requests: inputs });
//     if (Array.isArray(res?.embeddings)) {
//       return res.embeddings.map(e => e?.values || e?.embedding?.values || []);
//     }
//   } catch (e) {
//     // Fallback to per-text embedding
//     const out = [];
//     for (const t of texts) {
//       try {
//         const single = await genAI.embedContent({ model, content: { parts: [{ text: String(t || '') }] } });
//         out.push(single?.embedding?.values || []);
//       } catch (e2) {
//         out.push([]);
//       }
//     }
//     return out;
//   }
//   return texts.map(() => []);
// }


import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config.js";

// --- Load API Key ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY not set. Please add it to your .env file.");
}

// --- Initialize Client ---
const genAI = new GoogleGenerativeAI(apiKey);

// --- Model Configuration ---
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODELS = [ 
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

/**
 * Get a Gemini model instance.
 * @param {string} model - Model name (default: gemini-1.5-flash)
 */
export function getGemini(model = DEFAULT_MODEL) {
  return genAI.getGenerativeModel({ model });
}

/**
 * Generate text or content using Gemini.
 * @param {object} options
 * @param {string} options.prompt - Main user prompt.
 * @param {string} [options.system] - Optional system-level instruction.
 * @param {string} [options.model] - Model name (default: gemini-1.5-flash).
 * @param {number} [options.temperature] - Creativity control (0–1 range).
 * @returns {Promise<string>} Generated text content.
 */
async function withRetry(fn, { attempts = 3, baseDelayMs = 500 }) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.statusCode;
      const retriable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!retriable) break;
      const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export async function generateText({ prompt, system, model = DEFAULT_MODEL, temperature = 0.2 }) {
  // Build unique, ordered candidate list (env/param first, then fallbacks)
  const modelsToTry = Array.from(new Set([model, ...FALLBACK_MODELS])).filter(Boolean);
  for (const mName of modelsToTry) {
    try {
      const m = getGemini(mName);
      const fullPrompt = [system ? `System: ${system}` : null, prompt].filter(Boolean).join("\n\n");
      const result = await withRetry(() => m.generateContent({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature },
      }), { attempts: 3, baseDelayMs: 600 });
      const response = result?.response;
      const text = response?.text?.() || "";
      if (text) return text;
    } catch (err) {
      const status = err?.status || err?.statusCode || "?";
      const code = err?.error?.code || err?.code || "";
      console.warn(`Model ${mName} failed [status ${status}${code ? ", code " + code : ""}], trying next`);
      continue;
    }
  }
  return "(Service temporarily unavailable. Please try again.)";
}

/**
 * Generate text with image support using Gemini Vision.
 * @param {object} options
 * @param {string} options.prompt - Main user prompt.
 * @param {string} [options.system] - Optional system-level instruction.
 * @param {string[]} [options.imageUrls] - Array of image URLs to analyze.
 * @param {string} [options.model] - Model name (default: gemini-2.0-flash-exp for vision).
 * @param {number} [options.temperature] - Creativity control (0–1 range).
 * @returns {Promise<string>} Generated text content.
 */
export async function generateTextWithImages({ prompt, system, imageUrls = [], model = "gemini-2.0-flash-exp", temperature = 0.2 }) {
  const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"];
  
  for (const mName of modelsToTry) {
    try {
      const m = getGemini(mName);
      
      // Build parts array with text and images
      const parts = [];
      
      // Add system message if provided
      if (system) {
        parts.push({ text: `System: ${system}\n\n` });
      }
      
      // Add images first
      for (const url of imageUrls) {
        try {
          // Fetch image and convert to base64
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          
          // Determine mime type from URL or response
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          
          parts.push({
            inlineData: {
              mimeType: contentType,
              data: base64
            }
          });
        } catch (imgErr) {
          console.error(`Failed to fetch image ${url}:`, imgErr.message);
        }
      }
      
      // Add text prompt
      parts.push({ text: prompt });
      
      const result = await withRetry(() => m.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature },
      }), { attempts: 3, baseDelayMs: 600 });
      
      const response = result?.response;
      const text = response?.text?.() || "";
      if (text) return text;
    } catch (err) {
      const status = err?.status || err?.statusCode || "?";
      const code = err?.error?.code || err?.code || "";
      console.warn(`Vision model ${mName} failed [status ${status}${code ? ", code " + code : ""}], trying next`);
      continue;
    }
  }
  return "(Service temporarily unavailable. Please try again.)";
}

/**
 * Generate embeddings for an array of texts.
 * @param {string[]} texts - List of texts to embed.
 * @param {object} [options]
 * @param {string} [options.model] - Embedding model (default: text-embedding-004).
 * @returns {Promise<number[][]>} List of embedding vectors.
 */
export async function embedTexts(
  texts,
  { model = "text-embedding-004" } = {}
) {
  const out = [];
  for (const t of texts) {
    const text = String(t || "").slice(0, config.EMBEDDINGS_MAX_CHARS);
    try {
      const single = await genAI.embedContent({
        model,
        content: { parts: [{ text }] },
      });
      out.push(single?.embedding?.values || []);
    } catch (err) {
      console.error("Embedding failed for:", text.slice(0,80), err?.message || err);
      out.push([]);
    }
  }
  return out;
}

// const models = await genAI.listModels();
// console.log(models);
