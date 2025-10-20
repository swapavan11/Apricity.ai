import { useMemo } from "react";

export default function useApi() {
  const base = "";

  return useMemo(() => ({
    listDocs: async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${base}/api/upload`, { headers });
      return res.json();
    },
    // Convenience helper: returns array of documents (or empty array)
    getDocs: async () => {
      const resp = await (async () => {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${base}/api/upload`, { headers });
        return res.json();
      })();
      return (resp && resp.documents) ? resp.documents : [];
    },
    uploadPdf: async (file, title) => {
      const fd = new FormData();
      fd.append("pdf", file);
      if (title) fd.append("title", title);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${base}/api/upload`, { method: "POST", body: fd, headers });
      return res.json();
    },
    docFileUrl: (id, token) => {
      const url = `${base}/api/upload/${id}/file`;
      if (token) return `${url}?token=${encodeURIComponent(token)}`;
      return url;
    },
    resolveDocUrl: (doc) => {
      if (!doc) return null;
      if (doc.cloudinaryUrl) return doc.cloudinaryUrl;
      if (doc.localUrl) return doc.localUrl;
      if (doc._id || doc.id) {
        const id = doc._id || doc.id;
        const token = localStorage.getItem('token');
        const url = `${base}/api/upload/${id}/file`;
        return token ? `${url}?token=${encodeURIComponent(token)}` : url;
      }
      return null;
    },

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

    // Notes autosave
    saveNote: async ({ noteId, title, docId, noteJson, snapshotBlob }) => {
      const fd = new FormData();
      if (noteId) fd.append('noteId', noteId);
      if (title) fd.append('title', title);
      if (docId) fd.append('docId', docId);
      if (noteJson) fd.append('noteJson', typeof noteJson === 'string' ? noteJson : JSON.stringify(noteJson));
      if (snapshotBlob) fd.append('snapshot', snapshotBlob, 'snapshot.png');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${base}/api/notes/save`, { method: 'POST', body: fd, headers });
      try { return await res.json(); } catch { return { success: false, message: 'Invalid server response' }; }
    },

    listNotes: async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${base}/api/notes`, { headers });
      try { return await res.json(); } catch { return { success: false, notes: [] }; }
    },

    newNote: async ({ title, docId }) => {
      const token = localStorage.getItem('token');
      const headers = Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {});
      const res = await fetch(`${base}/api/notes/new`, { method: 'POST', headers, body: JSON.stringify({ title, docId }) });
      try { return await res.json(); } catch { return { success: false }; }
    },

    deleteNote: async (id) => {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${base}/api/notes/${id}`, { method: 'DELETE', headers });
      try { return await res.json(); } catch { return { success: false }; }
    }
  }), [base]);
}
