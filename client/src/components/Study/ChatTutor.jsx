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
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [currentVoicePref, setCurrentVoicePref] = useState('');
  const shouldAutoScrollRef = useRef(true); // Track if we should auto-scroll
  const [userBubbleTheme, setUserBubbleTheme] = useState(localStorage.getItem('userBubbleTheme') || 'blue');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // User bubble theme options (imported from localStorage)
  const getBubbleTheme = () => {
    const themes = {
      // Gradient themes
      purple: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      blue: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      green: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      orange: "linear-gradient(135deg, #f46b45 0%, #eea849 100%)",
      pink: "linear-gradient(135deg, #e91e63 0%, #f06292 100%)",
      teal: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      red: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
      indigo: "linear-gradient(135deg, #5f72bd 0%, #9b23ea 100%)",
      // Solid dark themes
      slate: "#1e293b",
      charcoal: "#2d3748",
      navy: "#1a202c",
      forest: "#1b3a2f",
      burgundy: "#3e1f2a",
      midnight: "#0f172a",
    };
    return themes[userBubbleTheme] || themes.blue;
  };

  // Initialize voice preference from localStorage
  useEffect(() => {
    const loadVoicePreference = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const savedPref = localStorage.getItem('voicePreference');
        if (savedPref && voices.find(v => v.name === savedPref)) {
          setCurrentVoicePref(savedPref);
        } else {
          // Find Gini (Google Hindi) as default (best quality), then other good voices
          const defaultVoice = voices.find(v => v.name === 'Google हिन्दी') ||
            voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.name.includes('Microsoft Zira')) ||
            voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0]; // Fallback to first available voice
          
          if (defaultVoice) {
            setCurrentVoicePref(defaultVoice.name);
            localStorage.setItem('voicePreference', defaultVoice.name);
          }
        }
      }
    };
    
    loadVoicePreference();
    window.speechSynthesis.onvoiceschanged = loadVoicePreference;
  }, []);

  // Listen for voice preference changes
  useEffect(() => {
    const handleVoiceChange = (event) => {
      setCurrentVoicePref(event.detail);
    };
    
    const handleThemeChange = (event) => {
      setUserBubbleTheme(event.detail);
    };
    
    window.addEventListener('voicePreferenceChanged', handleVoiceChange);
    window.addEventListener('userBubbleThemeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('voicePreferenceChanged', handleVoiceChange);
      window.removeEventListener('userBubbleThemeChanged', handleThemeChange);
    };
  }, []);

  // Auto-scroll to bottom when messages change (only if user is near bottom)
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      // Auto-scroll if: 1) user is near bottom, OR 2) shouldAutoScrollRef is true (new message sent)
      if (isNearBottom || shouldAutoScrollRef.current) {
        container.scrollTop = container.scrollHeight;
        shouldAutoScrollRef.current = false; // Reset after scrolling
      }
      // Update visibility of scroll-to-bottom button
      setShowScrollToBottom(!isNearBottom);
    }
  }, [activeChat?.messages, loadingAsk, typingText]);

  // Track scroll position to toggle scroll-to-bottom button
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    };
    el.addEventListener('scroll', onScroll);
    // Initialize
    onScroll();
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [activeChatId]);

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
    shouldAutoScrollRef.current = false;
    setShowScrollToBottom(false);
  };

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

  // Stop speech when chat changes or component unmounts
  useEffect(() => {
    // Cancel speech and clear state when switching chats
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    
    return () => {
      // Also cleanup on unmount
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    };
  }, [activeChatId]);

  // Ask the tutor a question
  const onAsk = async () => {
    if (!question.trim()) return;
    const userQuestion = question.trim();
    setQuestion(""); // Clear input immediately
    setAnswer("");
    setCitations([]);
    setErrorMsg("");
    setLoadingAsk(true);
    shouldAutoScrollRef.current = true; // Force scroll to bottom for new message
    
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
      
      {/* Chat display area with scroll-to-bottom control */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div
          ref={chatContainerRef}
          style={{
            height: "100%",
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "16px",
            marginBottom: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
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
                className="chat-message"
                style={{
                  maxWidth: "75%",
                  padding: m.role === "user" ? "8px 14px" : "12px 16px",
                  borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "18px",
                  background: m.role === "user" ? getBubbleTheme() : "var(--surface)",
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                  fontSize: "15px",
                  boxShadow: m.role === "user" ? "0 2px 8px rgba(102, 126, 234, 0.3)" : "none",
                  color: m.role === "user" ? "#ffffff" : "var(--text)",
                }}
              >
                {/* Only show label for Gini (tutor/assistant), not for user */}
                {m.role !== "user" && (
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
                    <span>Gini</span>
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
                )}
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
                    <span style={{ 
                      whiteSpace: "pre-wrap",
                      fontWeight: 500,
                      color: m.role === "user" ? "#ffffff" : "var(--text)",
                      display: "block"
                    }}>{displayText}</span>
                  )}
                </div>
                {/* Action buttons for Gini (tutor/assistant), not for user */}
                {m.role !== "user" && !isPlaceholder && (
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(m.text);
                        setCopiedMessageId(idx);
                        setTimeout(() => setCopiedMessageId(null), 2000);
                      }}
                      style={{
                        background: copiedMessageId === idx ? "rgba(34, 197, 94, 0.15)" : "none",
                        border: "1px solid",
                        borderColor: copiedMessageId === idx ? "rgba(34, 197, 94, 0.4)" : "rgba(124, 156, 255, 0.2)",
                        color: copiedMessageId === idx ? "#22c55e" : "var(--text)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (copiedMessageId !== idx) {
                          e.currentTarget.style.background = "rgba(124, 156, 255, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(124, 156, 255, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (copiedMessageId !== idx) {
                          e.currentTarget.style.background = "none";
                          e.currentTarget.style.borderColor = "rgba(124, 156, 255, 0.2)";
                        }
                      }}
                      title={copiedMessageId === idx ? "Copied!" : "Copy to clipboard"}
                    >
                      {copiedMessageId === idx ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (speakingMessageId === idx) {
                          // Stop speaking this message
                          window.speechSynthesis.cancel();
                          setSpeakingMessageId(null);
                        } else {
                          // Stop any currently speaking message first
                          window.speechSynthesis.cancel();
                          setSpeakingMessageId(null);
                          
                          // Small delay to ensure previous speech is fully stopped
                          setTimeout(() => {
                            // Check if speech synthesis is available
                            if (!window.speechSynthesis) {
                              console.error('Speech synthesis not supported');
                              alert('Text-to-speech is not supported in your browser');
                              return;
                            }
                            
                            // Ensure voices are loaded
                            let availableVoices = window.speechSynthesis.getVoices();
                            if (availableVoices.length === 0) {
                              console.error('No voices available');
                              alert('Please wait for voices to load and try again');
                              return;
                            }
                            
                            // Set speaking state immediately for visual feedback
                            setSpeakingMessageId(idx);
                            
                            // Strip markdown formatting for natural speech
                            let cleanText = m.text
                              .replace(/Gini/gi, 'Ginny') // Fix pronunciation (hard G like "gun")
                              .replace(/#{1,6}\s+/g, '') // Remove markdown headers
                              .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
                              .replace(/\*(.+?)\*/g, '$1') // Remove italic
                              .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
                              .replace(/`(.+?)`/g, '$1') // Remove inline code
                              .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                              .replace(/>\s+/g, '') // Remove blockquotes
                              .replace(/[-*+]\s+/g, '') // Remove list markers
                              .replace(/\d+\.\s+/g, '') // Remove numbered list markers
                              .replace(/\n+/g, '. ') // Replace newlines with pauses
                              .trim();
                            
                            if (!cleanText) {
                              console.error('No text to speak');
                              setSpeakingMessageId(null);
                              return;
                            }
                            
                            const utterance = new SpeechSynthesisUtterance(cleanText);
                            
                            // Try to find the user's preferred voice first
                            let selectedVoice = availableVoices.find(voice => voice.name === currentVoicePref);
                            
                            // If preferred voice not found, use fallback priority
                            if (!selectedVoice) {
                              selectedVoice = availableVoices.find(voice => voice.name === 'Google हिन्दी') ||
                                availableVoices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en')) ||
                                availableVoices.find(voice => voice.name.includes('Microsoft Zira')) ||
                                availableVoices.find(voice => voice.name.includes('Karen')) ||
                                availableVoices.find(voice => voice.name.includes('Victoria')) ||
                                availableVoices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')) ||
                                availableVoices.find(voice => voice.lang.startsWith('en')) ||
                                availableVoices[0];
                            }
                            
                            if (selectedVoice) {
                              utterance.voice = selectedVoice;
                            }
                            
                            // Human-like speech settings
                            utterance.rate = 0.9;
                            utterance.pitch = 1.0;
                            utterance.volume = 1.0;
                            
                            // Track speaking state with proper cleanup
                            utterance.onstart = () => {
                              console.log('✓ Speech started for message:', idx);
                            };
                            
                            utterance.onend = () => {
                              console.log('✓ Speech ended for message:', idx);
                              setSpeakingMessageId(current => current === idx ? null : current);
                            };
                            
                            utterance.onerror = (event) => {
                              console.error('✗ Speech error:', event.error, event);
                              setSpeakingMessageId(null);
                            };
                            
                            // Ensure we're not in a paused state
                            if (window.speechSynthesis.paused) {
                              window.speechSynthesis.resume();
                            }
                            
                            // Start speaking
                            console.log('→ Starting speech for message:', idx, '| Voice:', selectedVoice?.name, '| Text length:', cleanText.length);
                            try {
                              window.speechSynthesis.speak(utterance);
                            } catch (error) {
                              console.error('✗ Failed to start speech:', error);
                              setSpeakingMessageId(null);
                              alert('Failed to start text-to-speech. Please try again.');
                            }
                          }, 100);
                        }
                      }}
                      style={{
                        background: speakingMessageId === idx ? "rgba(239, 68, 68, 0.15)" : "none",
                        border: "1px solid",
                        borderColor: speakingMessageId === idx ? "rgba(239, 68, 68, 0.4)" : "rgba(124, 156, 255, 0.2)",
                        color: speakingMessageId === idx ? "#ef4444" : "var(--text)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (speakingMessageId !== idx) {
                          e.currentTarget.style.background = "rgba(124, 156, 255, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(124, 156, 255, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (speakingMessageId !== idx) {
                          e.currentTarget.style.background = "none";
                          e.currentTarget.style.borderColor = "rgba(124, 156, 255, 0.2)";
                        }
                      }}
                      title={speakingMessageId === idx ? "Stop reading" : "Read aloud"}
                    >
                      {speakingMessageId === idx ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                          </svg>
                          Stop
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                          </svg>
                          Read aloud
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            title="Scroll to latest"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 22,
              transform: "translateX(-50%)",
              width: 36,
              height: 36,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--btn-secondary-bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              boxShadow: "0 6px 16px rgba(0,0,0,0.22)",
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.2s ease",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, 0)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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
              fontSize: "15px", 
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
