import React, { useState, useRef, useEffect } from "react";

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
  const chatContainerRef = useRef(null);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingIntervalRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat?.messages, loadingAsk, typingText]);

  // Typewriter effect for tutor response
  const typeText = (text) => {
    setIsTyping(true);
    setTypingText("");
    let index = 0;
    
    // Clear any existing typing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    
    typingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setTypingText((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(typingIntervalRef.current);
        setIsTyping(false);
      }
    }, 2); // 2ms per character for very fast typing
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Ask the tutor a question
  const onAsk = async () => {
    if (!question.trim()) return;
    const userQuestion = question.trim();
    setQuestion(""); // Clear input immediately
    setAnswer("");
    setCitations([]);
    setErrorMsg("");
    setLoadingAsk(true);
    
    try {
      let chatId = activeChatId;
      let chatToUpdate = activeChat;
      
      // If no active chat, create one
      if (!chatId) {
        const ts = new Date();
        const docTitle = docs.find((d) => d._id === selected)?.title || "General";
        const chatTitle = `${userQuestion.slice(0, 40) || docTitle} • ${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`;
        const created = await api.createChat(selected === "all" ? null : selected, chatTitle);
        chatId = created.id;
        setActiveChatId(chatId);
        
        // Initialize active chat with empty messages array
        chatToUpdate = {
          _id: chatId,
          title: chatTitle,
          documentId: selected === "all" ? null : selected,
          messages: []
        };
        setActiveChat(chatToUpdate);
      }

      // Optimistically add user message to active chat display
      const optimisticChat = {
        ...chatToUpdate,
        messages: [
          ...(chatToUpdate?.messages || []),
          { role: "user", text: userQuestion, createdAt: new Date().toISOString(), citations: [] }
        ]
      };
      setActiveChat(optimisticChat);

      // Add placeholder tutor message immediately to reduce perceived delay
      setActiveChat({
        ...optimisticChat,
        messages: [
          ...optimisticChat.messages,
          { role: "tutor", text: "", createdAt: new Date().toISOString(), citations: [], isPlaceholder: true }
        ]
      });

      const res = await api.ask(
        userQuestion,
        selected === "all" ? null : selected,
        false,
        chatId,
        false
      );

      // Stop loading IMMEDIATELY when response arrives
      setLoadingAsk(false);

      // Clear answer/citations state so they don't show in fallback display
      setAnswer("");
      setCitations([]);

      // Add tutor message and start typing animation immediately
      if (res.answer) {
        const tutorMessage = {
          role: "tutor",
          text: "",
          createdAt: new Date().toISOString(),
          citations: res.citations || []
        };
        
        setActiveChat({
          ...optimisticChat,
          messages: [...optimisticChat.messages, tutorMessage]
        });
        
        // Start typing animation with no delay
        requestAnimationFrame(() => {
          typeText(res.answer);
        });
      }

      // Refresh chat to get complete conversation from server after typing finishes
      const typingDuration = res.answer ? res.answer.length * 2 : 0;
      setTimeout(async () => {
        if (chatId) {
          const chatData = await api.getChat(chatId);
          setActiveChat(chatData);
          setTypingText(""); // Clear typing state
          setIsTyping(false);
        }
      }, typingDuration + 100);

      // Refresh chat list to update timestamps
      const lst = await api.listChats(selected === "all" ? null : selected);
      setChats(lst.chats || []);

      // fetch YouTube recommendations
      try {
        const ytRes = await api.youtube(userQuestion, selected === "all" ? null : selected);
        setYt(ytRes);
      } catch {
        setYt({
          query: userQuestion,
          suggestions: [],
          error: "Failed to load YouTube recommendations.",
        });
      }
    } catch (err) {
      console.error("Ask error:", err);
      setErrorMsg(err.message || "Failed to get tutor response");
      setLoadingAsk(false);
      // If error, remove optimistic user message
      setActiveChat(activeChat);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Chat display area */}
      <div
        ref={chatContainerRef}
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

        {activeChat?.messages?.map((m, idx) => {
          const isLastMessage = idx === activeChat.messages.length - 1;
          const showTyping = isLastMessage && m.role === "tutor" && isTyping;
          const displayText = showTyping ? typingText : m.text;
          const isPlaceholder = m.isPlaceholder && !displayText;
          
          return (
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>{m.role === "user" ? "You" : "Gini"}</span>
                  {isPlaceholder && (
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "rgba(34, 197, 94, 0.15)",
                      color: "#22c55e",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                    }}>
                      Gini is thinking...
                    </span>
                  )}
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                  {isPlaceholder ? (
                    <span style={{ opacity: 0.6, fontSize: "14px" }}>
                      <span style={{ animation: "blink 0.8s infinite" }}>●</span>
                      <span style={{ animation: "blink 0.8s infinite 0.2s" }}>●</span>
                      <span style={{ animation: "blink 0.8s infinite 0.4s" }}>●</span>
                    </span>
                  ) : (
                    <>
                      {displayText}
                      {showTyping && <span style={{ opacity: 0.5, animation: "blink 1s infinite" }}>▊</span>}
                    </>
                  )}
                </div>
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
          );
        })}
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
