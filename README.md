
# Apricity.ai — AI-Powered Study Platform

Apricity.ai is a comprehensive, full-stack learning platform that leverages advanced AI (Google Gemini) to deliver real-time PDF-based chat tutoring, AI quiz generation, YouTube video recommendations, and an interactive notebook for note-taking. Built with the MERN stack, it features secure authentication, branded email notifications, and robust user profile management for a seamless, interactive study experience.

---

## 🚀 Features

- **AI Chat Tutor:** Real-time, context-aware chatbot powered by Google Gemini and custom LLM pipelines. Supports PDF-based Q&A, LaTeX/math rendering, and code highlighting.
- **PDF-Centric Learning:** Upload, view, and interact with coursebook PDFs. Chatbot and quiz generation are contextually aware of your uploaded documents.
- **AI Quiz Generation:** Instantly generate MCQ, SAQ, and LAQ quizzes with explanations. Track scores and progress per document.
- **Interactive Notebook:** Take and organize notes alongside your study materials.
- **YouTube Recommendations:** Get AI-curated video links relevant to your study queries.
- **Authentication & Security:** JWT and Google OAuth login, secure session management, and user profile controls.
- **Email Notifications:** Branded email verification, password reset, and welcome emails.
- **Profile Management:** Update profile, manage account, and view learning stats.
- **Modern UI:** Responsive React (Vite) frontend with dynamic LaTeX/code rendering, real-time uploads, and custom component design.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, ReactMarkdown, rehype-katex, react-syntax-highlighter
- **Backend:** Node.js, Express, Google Gemini API, pdfjs-dist, Cloudinary, Passport (JWT & Google OAuth)
- **Database:** MongoDB
- **Other:** Nodemailer (email), KaTeX (math), Cloudinary (file storage)

---

## ⚡ Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key

### Backend Setup

```bash
cd server
npm install
# Create .env with:
# PORT=5000
# MONGO_URI=mongodb://127.0.0.1:27017/apricity
# GEMINI_API_KEY=your_gemini_key
npm run dev
```

Health check: `http://localhost:5000/api/health`

Seed sample PDF (optional):

```bash
npm run seed
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📚 Usage

- **Upload PDFs:** Add your study materials for AI-powered interaction.
- **Chat with Tutor:** Ask questions, get answers with citations and math/code rendering.
- **Generate Quizzes:** Create and attempt quizzes tailored to your documents.
- **Take Notes:** Use the interactive notebook for organized study.
- **Get Video Suggestions:** Receive relevant YouTube links for deeper learning.
- **Manage Profile:** Update info, view stats, and control your account.

---

## 🏗️ Architecture Overview

- **Client:**
	- React (Vite) SPA with modular components for chat, PDF viewing, quizzes, notebook, and dashboard.
	- Uses ReactMarkdown, rehype-katex, and react-syntax-highlighter for rich content rendering.
	- Handles authentication, profile management, and real-time document uploads.

- **Server:**
	- Express.js REST API for authentication, PDF upload/processing, chat, quiz, and progress tracking.
	- Integrates Google Gemini API for AI chat and quiz generation.
	- Uses pdfjs-dist for PDF parsing and Cloudinary for file storage.
	- Passport.js for JWT and Google OAuth authentication.
	- Nodemailer for branded email notifications (verification, reset, welcome).

- **Database:**
	- MongoDB stores users, documents, chats, quizzes, notes, and progress data.

---

## 🏢 Production

- Configure CORS, environment variables, and serve the client build behind a secure proxy.
- Set up email and Cloudinary credentials for full functionality.

---

## 📄 License

MIT

---

## 👨‍💻 Author

Swapnil Sontakke — [GitHub](https://github.com/swapavan11)

---

For questions, issues, or contributions, please open an issue or pull request on GitHub.
