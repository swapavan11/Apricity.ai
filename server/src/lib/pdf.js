import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
// In Node, run without worker; set via getDocument option

export async function extractPagesText(filePath) {
  try {
    console.log('Extracting PDF:', filePath);
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjs.getDocument({ data, disableWorker: true });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    console.log('PDF loaded:', { numPages, filePath });
    
    const pages = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((it) => it.str);
      const text = strings.join(' ');
      pages.push(text);
      console.log(`Page ${i} extracted:`, { textLength: text.length, preview: text.slice(0, 100) });
    }
    
    console.log('PDF extraction complete:', { numPages, totalText: pages.reduce((s, p) => s + p.length, 0) });
    return { numPages, pages };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}


