import { GoogleGenerativeAI } from "@google/generative-ai";
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
function getGemini(model = DEFAULT_MODEL) {
  return genAI.getGenerativeModel({ model });
}

import { config } from "./config.js";
import { localEmbedTexts } from "./local-embed.js";
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
  // Use local embedding server only
  try {
    return await localEmbedTexts(texts);
  } catch (err) {
    console.error("Local embedding server failed:", err?.message || err);
    return texts.map(() => []);
  }
}

// const models = await genAI.listModels();
// console.log(models);
