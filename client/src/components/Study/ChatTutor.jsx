import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

      // Add tutor message with full text immediately (for typing animation)
      if (res.answer) {
        const tutorMessage = {
          role: "tutor",
          text: res.answer, // Store the full answer
          createdAt: new Date().toISOString(),
          citations: res.citations || [],
          _fullText: res.answer // Keep original for reference
        };
        
        // Update active chat with the complete message
        const updatedChat = {
          ...optimisticChat,
          messages: [...optimisticChat.messages, tutorMessage]
        };
        setActiveChat(updatedChat);
        
        // Start typing animation with no delay
        requestAnimationFrame(() => {
          typeText(res.answer);
        });
        
        // After typing finishes, just clear typing state (don't refresh from server)
        const typingDuration = res.answer.length * 2;
        setTimeout(() => {
          setTypingText("");
          setIsTyping(false);
        }, typingDuration + 100);
      }

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
      {/* Warning banner when no PDF selected */}
      {selected === "all" && (
        <div style={{
          background: "rgba(234, 179, 8, 0.15)",
          border: "1px solid rgba(234, 179, 8, 0.4)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          color: "#eab308",
        }}>
          <span style={{ fontSize: "16px" }}>💡</span>
          <span>
            <strong>General Chat Mode:</strong> I'm ready for general questions. 
            Want to discuss a specific PDF? Select one from above!
          </span>
        </div>
      )}
      
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
          const showTyping = isLastMessage && (m.role === "tutor" || m.role === "assistant") && isTyping;
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
                <div style={{ lineHeight: "1.6" }}>
                  {isPlaceholder ? (
                    <span style={{ opacity: 0.6, fontSize: "14px" }}>
                      <span style={{ animation: "blink 0.8s infinite" }}>●</span>
                      <span style={{ animation: "blink 0.8s infinite 0.2s" }}>●</span>
                      <span style={{ animation: "blink 0.8s infinite 0.4s" }}>●</span>
                    </span>
                  ) : (m.role === "tutor" || m.role === "assistant") ? (
                    <>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Style markdown elements to match chat theme
                          p: ({node, children, ...props}) => {
                            // Convert page references to clickable badges
                            const processChildren = (children) => {
                              if (typeof children === 'string') {
                                // Match patterns like (Page 5) or "Page 5" or "on Page 5"
                                const parts = children.split(/(\(Page \d+\)|Page \d+)/gi);
                                return parts.map((part, idx) => {
                                  const match = part.match(/Page (\d+)/i);
                                  if (match) {
                                    const pageNum = match[1];
                                    return (
                                      <span
                                        key={idx}
                                        style={{
                                          display: "inline-block",
                                          padding: "1px 6px",
                                          margin: "0 2px",
                                          fontSize: "0.75em",
                                          fontWeight: 500,
                                          borderRadius: "3px",
                                          background: "rgba(124, 156, 255, 0.08)",
                                          color: "var(--text)",
                                          border: "1px solid rgba(124, 156, 255, 0.2)",
                                          cursor: "pointer",
                                          transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.background = "rgba(124, 156, 255, 0.15)";
                                          e.target.style.borderColor = "var(--accent)";
                                          e.target.style.color = "var(--accent)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.background = "rgba(124, 156, 255, 0.08)";
                                          e.target.style.borderColor = "rgba(124, 156, 255, 0.2)";
                                          e.target.style.color = "var(--text)";
                                        }}
                                        onClick={() => console.log("Page clicked:", pageNum)}
                                        title={`Jump to Page ${pageNum}`}
                                      >
                                        {pageNum}
                                      </span>
                                    );
                                  }
                                  return part;
                                });
                              }
                              return children;
                            };
                            
                            return (
                              <p style={{ margin: "0.5em 0", lineHeight: "1.6" }} {...props}>
                                {React.Children.map(children, child => 
                                  typeof child === 'string' ? processChildren(child) : child
                                )}
                              </p>
                            );
                          },
                          h1: ({node, ...props}) => <h1 style={{ fontSize: "1.4em", marginTop: "0.5em", marginBottom: "0.3em" }} {...props} />,
                          h2: ({node, ...props}) => <h2 style={{ fontSize: "1.3em", marginTop: "0.5em", marginBottom: "0.3em" }} {...props} />,
                          h3: ({node, ...props}) => <h3 style={{ fontSize: "1.2em", marginTop: "0.5em", marginBottom: "0.3em" }} {...props} />,
                          ul: ({node, ...props}) => <ul style={{ marginLeft: "1.2em", marginTop: "0.3em", marginBottom: "0.3em" }} {...props} />,
                          ol: ({node, ...props}) => <ol style={{ marginLeft: "1.2em", marginTop: "0.3em", marginBottom: "0.3em" }} {...props} />,
                          li: ({node, ...props}) => <li style={{ margin: "0.2em 0" }} {...props} />,
                          code: ({node, inline, ...props}) => inline ? 
                            <code style={{ background: "rgba(124, 156, 255, 0.15)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.9em" }} {...props} /> :
                            <code style={{ display: "block", background: "rgba(124, 156, 255, 0.1)", padding: "10px", borderRadius: "6px", overflow: "auto", fontSize: "0.85em", marginTop: "0.5em", marginBottom: "0.5em" }} {...props} />,
                          blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "12px", marginLeft: "0", opacity: 0.9, fontStyle: "italic" }} {...props} />,
                          strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }} {...props} />,
                          em: ({node, ...props}) => <em style={{ fontStyle: "italic" }} {...props} />,
                          a: ({node, ...props}) => <a style={{ color: "var(--accent)", textDecoration: "underline" }} {...props} />,
                          table: ({node, ...props}) => <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "0.5em", marginBottom: "0.5em" }} {...props} />,
                          th: ({node, ...props}) => <th style={{ border: "1px solid var(--border)", padding: "8px", background: "rgba(124, 156, 255, 0.1)" }} {...props} />,
                          td: ({node, ...props}) => <td style={{ border: "1px solid var(--border)", padding: "8px" }} {...props} />,
                        }}
                      >
                        {showTyping ? typingText : m.text}
                      </ReactMarkdown>
                      {showTyping && <span style={{ opacity: 0.5, animation: "blink 1s infinite", marginLeft: "2px" }}>▊</span>}
                    </>
                  ) : (
                    <span style={{ whiteSpace: "pre-wrap" }}>{displayText}</span>
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
