import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { extractPagesText } from './lib/pdf.js';
import { connectMongo } from './lib/mongo.js';
import Document from './models/Document.js';
import User from './models/User.js';

const uploadsDir = path.resolve('server/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const samples = [
  {
    title: 'NCERT Class 11 Physics Part 1',
    url: 'https://ncert.nic.in/textbook/pdf/kephy1dd.zip' // placeholder, many ncert PDFs are zipped; use a fallback sample
  },
];

async function downloadToFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed download: ${res.status}`);
  const fileStream = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

async function createDocFromPdf(filePath, title) {
  const parsed = await extractPagesText(filePath);
  const pages = parsed.numPages;
  const pageTexts = parsed.pages;
  const chunks = pageTexts.map((t, i) => ({ page: i + 1, text: t || '' }));
  const stat = fs.statSync(filePath);
  // Ensure a test user exists to satisfy required uploadedBy field
  let testUser = await User.findOne({ email: 'seed@example.com' });
  if (!testUser) {
    testUser = await User.create({
      email: 'seed@example.com',
      name: 'Seed User',
      password: 'password123'
    });
  }

  return await Document.create({
    title,
    filename: path.basename(filePath),
    mimeType: 'application/pdf',
    size: stat.size,
    pages,
    storagePath: filePath,
    chunks,
    uploadedBy: testUser._id
  });
}

async function main() {
  await connectMongo();
  console.log('Connected to MongoDB');
  // Provide a simple public sample PDF instead of NCERT zip
  const url = 'https://arxiv.org/pdf/1706.03762.pdf'; // Attention Is All You Need (for local testing)
  const dest = path.join(uploadsDir, `sample_${Date.now()}.pdf`);
  await downloadToFile(url, dest);
  const doc = await createDocFromPdf(dest, 'Sample Physics-like PDF');
  console.log('Seeded document:', doc._id.toString());
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


