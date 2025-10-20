import React, { useState } from "react";

export default function ChatTutor({
  api,
  selected,
  docs,
  chats,
  setChats,
  activeChat,
  setActiveChat,
  activeChatId,
  setActiveChatId,
  question,
  setQuestion,
  answer,
  setAnswer,
  citations,
  setCitations,
  loadingAsk,
  setLoadingAsk,
  setYt,
}) {
  const [errorMsg, setErrorMsg] = useState("");

  // Ask the tutor a question
  const onAsk = async () => {
    if (!question.trim()) return;
    setAnswer("");
    setCitations([]);
    setErrorMsg("");
    setLoadingAsk(true);
    try {
      let chatId = activeChatId;
      if (!chatId) {
        // create a new chat if none is active
        const ts = new Date();
        const docTitle = docs.find((d) => d._id === selected)?.title || "General";
        const chatTitle = `${question.slice(0, 40) || docTitle} • ${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`;
        const created = await api.createChat(selected === "all" ? null : selected, chatTitle);
        chatId = created.id;
        setActiveChatId(chatId);
        const lst = await api.listChats(selected === "all" ? null : selected);
        setChats(lst.chats || []);
      }

      const res = await api.ask(
        question,
        selected === "all" ? null : selected,
        false,
        chatId,
        false
      );

      setAnswer(res.answer || "");
      setCitations(res.citations || []);

      if (chatId) {
        const chatData = await api.getChat(chatId);
        setActiveChat(chatData);
      }

      // fetch YouTube recommendations
      try {
        const ytRes = await api.youtube(question, selected === "all" ? null : selected);
        setYt(ytRes);
      } catch {
        setYt({
          query: question,
          suggestions: [],
          error: "Failed to load YouTube recommendations.",
        });
      }
    } catch (err) {
      console.error("Ask error:", err);
      setErrorMsg(err.message || "Failed to get tutor response");
    } finally {
      setLoadingAsk(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Chat display area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "16px",
          marginBottom: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minHeight: 0,
        }}
      >
        {!activeChat?.messages?.length && !loadingAsk && (
          <div
            style={{
              color: "var(--muted)",
              textAlign: "center",
              marginTop: "50px",
            }}
          >
            No messages yet. Start a conversation with your tutor below.
          </div>
        )}

        {activeChat?.messages?.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "12px 16px",
                borderRadius: "18px",
                background: m.role === "user" ? "var(--accent)" : "var(--surface)",
                color: m.role === "user" ? "#0a0f25" : "var(--text)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "4px",
                  opacity: 0.8,
                }}
              >
                {m.role === "user" ? "You" : "Tutor"}
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.4" }}>{m.text}</div>
              <div
                style={{
                  fontSize: "10px",
                  opacity: 0.6,
                  marginTop: "4px",
                }}
              >
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loadingAsk && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "12px" }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "18px",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--muted)" }}>💭 Tutor is thinking...</span>
              <div
                style={{
                  width: 12,
                  height: 12,
                  border: "2px solid transparent",
                  borderTop: "2px solid var(--muted)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            rows={1}
            style={{
              flex: 1,
              background: "var(--input-bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "12px",
              resize: "none",
              fontFamily: "inherit",
              fontSize: "14px",
            }}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask your tutor anything..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onAsk();
              }
            }}
          />
          <button
            onClick={onAsk}
            disabled={loadingAsk || !question.trim()}
            style={{
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              borderRadius: "8px",
            }}
          >
            {loadingAsk ? (
              <>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid transparent",
                    borderTop: "2px solid currentColor",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span>Thinking…</span>
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            marginTop: "6px",
            textAlign: "center",
          }}
        >
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div
          style={{
            marginTop: 8,
            color: "#ff7c7c",
            textAlign: "center",
            fontSize: "13px",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
