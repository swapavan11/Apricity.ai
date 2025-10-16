import { generateText, embedTexts } from '../lib/gemini.js';

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

async function scoreOnewordAnswer(expectedRaw, userRaw) {
  const expected = String(expectedRaw || '').trim();
  const user = String(userRaw || '').trim();
  const numA = Number(user);
  const numB = Number(expected);
  let isCorrect = false;
  let isPartial = false;
  let graderOutput = null;

  if (!user || !expected) {
    return { correct: false, partial: false, graderOutput };
  }

  // numeric exact-ish comparison
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    const a = numA, b = numB;
    const diff = Math.abs(a - b);
    const tol = Math.max(1e-6, Math.abs(b) * 1e-3);
    isCorrect = diff <= tol;
    if (isCorrect) return { correct: true, partial: false, graderOutput };
  }

  // token equality
  if (normalize(user) === normalize(expected)) {
    return { correct: true, partial: false, graderOutput };
  }

  // embedding similarity fallback
  try {
    const emb = await embedTexts([user, expected]);
    if (Array.isArray(emb) && emb.length === 2 && emb[0].length && emb[1].length) {
      const dot = emb[0].reduce((s, v, i) => s + v * (emb[1][i] || 0), 0);
      const mag = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const sim = dot / (Math.max(1e-9, mag(emb[0]) * mag(emb[1])));
      if (sim >= 0.78) return { correct: true, partial: false, graderOutput: `emb_sim:${sim.toFixed(3)}` };
    }
  } catch (e) {
    // ignore embedding failure
  }

  // LLM fallback (strict)
  try {
    const system = `You are a strict grader. Compare two one-word answers and respond with a single token ONLY: CORRECT or INCORRECT or PARTIAL.`;
    const prompt = `Expected: ${expected}\nStudent: ${user}\nGrade:`;
    const gradeRaw = await generateText({ prompt, system, temperature: 0.0 });
    graderOutput = String(gradeRaw || '').trim();
    let gradeToken = graderOutput.split(/\s|\n/)[0]?.toUpperCase() || '';
    if (!['CORRECT','PARTIAL','INCORRECT'].includes(gradeToken)) {
      const m = graderOutput.toUpperCase().match(/CORRECT|PARTIAL|INCORRECT/);
      gradeToken = m ? m[0] : 'INCORRECT';
    }
    isCorrect = gradeToken === 'CORRECT';
    isPartial = gradeToken === 'PARTIAL';
  } catch (e) {
    // give up -> incorrect
  }

  return { correct: !!isCorrect, partial: !!isPartial, graderOutput };
}

export { scoreOnewordAnswer };
