# Apricity.ai — Study Companion (MERN + Gemini)

A responsive MERN app for revising NCERT-style coursebooks: upload/view PDFs, chat with a tutor (Gemini), generate quizzes (MCQ/SAQ/LAQ), and track progress.

## Prerequisites
- Node.js 18+
- MongoDB running locally or a connection string
- Gemini API key (GEMINI_API_KEY)

## Setup

### Backend
```bash
cd server
npm i
# Create .env with the following:
# PORT=5000
# MONGO_URI=mongodb://127.0.0.1:27017/Apricityassign
# GEMINI_API_KEY=YOUR_KEY
npm run dev
```

Health check: `http://localhost:5000/api/health`

Seed sample PDF (optional):
```bash
npm run seed
```

### Frontend
```bash
cd client
npm i
npm run dev
```

Open `http://localhost:5173`.

## Features
- Source Selector: choose all PDFs or a specific one; upload PDFs.
- PDF Viewer: shows selected PDF beside chat.
- Chat Tutor: Ask questions with RAG-style citations (pages + snippets).
- Quiz Generator: MCQs/SAQs/LAQs with explanations; score and record attempts.
- Progress Dashboard: aggregates attempt accuracy per document.
- YouTube Suggestions: links based on your query.

## Notes
- Embeddings: A naive lexical similarity is used as a fallback. You can add vector embeddings later.
- NCERT PDFs: For convenience, the seed uses a public sample PDF; upload your own NCERT PDFs in-app.

## Production
- Configure CORS, environment variables, and serve client build behind a proxy.
