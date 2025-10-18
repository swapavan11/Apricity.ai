import { useMemo } from "react";

export default function useApi() {
  const base = "";

  return useMemo(() => ({
    listDocs: async () => (await fetch(`${base}/api/upload`)).json(),
    uploadPdf: async (file, title) => {
      const fd = new FormData();
      fd.append("pdf", file);
      if (title) fd.append("title", title);
      const res = await fetch(`${base}/api/upload`, { method: "POST", body: fd });
      return res.json();
    },
    docFileUrl: (id) => `${base}/api/upload/${id}/file`,

    // Chat APIs
    listChats: async (documentId) =>
      (await fetch(`${base}/api/rag/chats${documentId ? `?documentId=${documentId}` : ""}`)).json(),
    getChat: async (chatId) => (await fetch(`${base}/api/rag/chats/${chatId}`)).json(),
    createChat: async (documentId, title) => {
      const res = await fetch(`${base}/api/rag/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, title }),
      });
      return res.json();
    },
    ask: async (query, documentId, allowGeneral = false, chatId = null, createIfMissing = false) => {
      const res = await fetch(`${base}/api/rag/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, documentId, allowGeneral, chatId, createIfMissing }),
      });
      return res.json();
    },

    // Quiz APIs
    genQuiz: async (documentId, mcqCount, onewordCount, saqCount, laqCount, instructions, topic) => {
      const res = await fetch(`${base}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          mcqCount,
          onewordCount,
          saqCount,
          laqCount,
          instructions,
          topic,
        }),
      });
      return res.json();
    },
    scoreQuiz: async (payload) => {
      const res = await fetch(`${base}/api/quiz/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },

    // Progress & YouTube
    progress: async () => (await fetch(`${base}/api/progress`)).json(),
    getAttemptHistory: async (documentId) =>
      (await fetch(`${base}/api/progress/attempts/${documentId}`)).json(),
    youtube: async (q, documentId) => {
      const params = new URLSearchParams({ q: q || "" });
      if (documentId) params.append("documentId", documentId);
      return (await fetch(`${base}/api/youtube/recommend?${params}`)).json();
    },
    invalidateCache: async () => {
      const res = await fetch(`${base}/api/progress/invalidate`, { method: "POST" });
      return res.json();
    },
  }), [base]);
}
