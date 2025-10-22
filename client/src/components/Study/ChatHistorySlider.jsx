import React, { useState, useEffect } from "react";

export default function ChatHistorySlider({
  chats,
  setChats,
  chatHistoryVisible,
  setChatHistoryVisible,
  activeChatId,
  setActiveChatId,
  setActiveChat,
  api,
  docs,
  setActiveTab,
  selected,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [chatToDelete, setChatToDelete] = useState(null);

  // Cancel rename when panel closes
  useEffect(() => {
    if (!chatHistoryVisible) {
      setRenamingChatId(null);
      setNewTitle("");
    }
  }, [chatHistoryVisible]);

  // Filter chats by selected PDF or general mode first
  const relevantChats = chats.filter((chat) => {
    if (selected === "all" || !selected) {
      // General mode - show only chats without documentId (general chats)
      return !chat.documentId || chat.documentId === null;
    } else {
      // PDF mode - show only chats for this specific PDF
      return chat.documentId === selected;
    }
  });

  // Sort chats by most recently updated/edited first
  const sortedChats = [...relevantChats].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt);
    const dateB = new Date(b.updatedAt || b.createdAt);
    return dateB - dateA; // Most recent first
  });

  // Filter chats based on search query (title only for performance)
  const filteredChats = sortedChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const title = (chat.title || "").toLowerCase();
    
    return title.includes(query);
  });

  return (
    <>
      {/* Backdrop with subtle blur - closes slider when clicked outside */}
      {chatHistoryVisible && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 999,
            top: "70px",
          }}
          onClick={() => setChatHistoryVisible(false)}
        />
      )}

      {/* Slider panel */}
      <div
        className="chat-history-slider"
        style={{
          position: "fixed",
          right: chatHistoryVisible ? "0" : "-400px",
          top: "70px",
          width: "400px",
          height: "calc(100vh - 70px)",
          background: "var(--panel)",
          borderLeft: "1px solid #1f2b57",
          padding: "20px",
          zIndex: 1000,
          transition: "right 0.3s ease",
          overflow: "auto",
          boxShadow: "-4px 0 12px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Chat History</h3>
          <button
            className="secondary"
            onClick={() => setChatHistoryVisible(false)}
            style={{ padding: "6px 10px", fontSize: "12px" }}
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div style={{ marginBottom: "16px", position: "relative" }}>
          <input
            type="text"
            placeholder="Search chats by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 36px 10px 12px",
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "13px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
            }}
          />
          {/* Search icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          {/* Clear button */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "36px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                fontSize: "16px",
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "12px" }}>
          {searchQuery ? (
            <>
              {filteredChats.length} result{filteredChats.length !== 1 ? 's' : ''} found
              {filteredChats.length < sortedChats.length && (
                <> out of {sortedChats.length} total</>
              )}
            </>
          ) : (
            <>{sortedChats.length} chat{sortedChats.length !== 1 ? 's' : ''} • Sorted by recent</>
          )}
        </div>

      {filteredChats.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>
            {searchQuery ? "�" : "�💬"}
          </div>
          <div>
            {searchQuery ? `No chats match "${searchQuery}"` : "No previous chats found"}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "6px",
                color: "#0a0f25",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        filteredChats.map((chat) => (
          <div
            key={chat._id}
            style={{
              background: activeChatId === chat._id ? "rgba(124,156,255,0.15)" : "#0d142c",
              border:
                activeChatId === chat._id
                  ? "1px solid rgba(124,156,255,0.3)"
                  : "1px solid #1a244d",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "10px",
              cursor: "pointer",
            }}
            onClick={async () => {
              // Don't reload if already active
              if (activeChatId === chat._id) {
                setChatHistoryVisible(false);
                setActiveTab("chat");
                return;
              }
              
              setActiveChatId(chat._id);
              // Load chat data
              try {
                const c = await api.getChat(chat._id);
                setActiveChat(c);
              } catch (err) {
                console.error('Failed to load chat:', err);
              }
              setChatHistoryVisible(false);
              setActiveTab("chat");
            }}
          >
            {renamingChatId === chat._id ? (
              // Rename mode
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newTitle.trim()) {
                      try {
                        await api.renameChat(chat._id, newTitle.trim());
                        setChats(chats.map(c => c._id === chat._id ? { ...c, title: newTitle.trim() } : c));
                        setRenamingChatId(null);
                        setNewTitle("");
                      } catch (err) {
                        console.error('Failed to rename chat:', err);
                      }
                    } else if (e.key === 'Escape') {
                      setRenamingChatId(null);
                      setNewTitle("");
                    }
                  }}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--accent)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "14px",
                    marginBottom: "8px"
                  }}
                  placeholder="Enter new title..."
                />
                <div style={{ display: "flex", gap: "8px", fontSize: "11px" }}>
                  <button
                    onClick={async () => {
                      if (newTitle.trim()) {
                        try {
                          await api.renameChat(chat._id, newTitle.trim());
                          setChats(chats.map(c => c._id === chat._id ? { ...c, title: newTitle.trim() } : c));
                          setRenamingChatId(null);
                          setNewTitle("");
                        } catch (err) {
                          console.error('Failed to rename chat:', err);
                        }
                      }
                    }}
                    style={{
                      padding: "4px 12px",
                      background: "var(--accent)",
                      border: "none",
                      borderRadius: "4px",
                      color: "#0a0f25",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setRenamingChatId(null);
                      setNewTitle("");
                    }}
                    style={{
                      padding: "4px 12px",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      color: "var(--text)",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, flex: 1 }}>
                    {chat.title || "Untitled Chat"}
                  </div>
                  <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                    {/* Rename button */}
                    <button
                      onClick={() => {
                        setRenamingChatId(chat._id);
                        setNewTitle(chat.title || "");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "4px",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(124, 156, 255, 0.2)";
                        e.currentTarget.style.color = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--muted)";
                      }}
                      title="Rename chat"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => {
                        setChatToDelete(chat);
                        setDeletingChatId(chat._id);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "4px",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                        e.currentTarget.style.color = "#ef4444";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--muted)";
                      }}
                      title="Delete chat"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {new Date(chat.updatedAt || chat.createdAt).toLocaleString()}
                </div>
              </>
            )}
          </div>
        ))
      )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingChatId && chatToDelete && (
        <>
          {/* Modal backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              setDeletingChatId(null);
              setChatToDelete(null);
            }}
          >
            {/* Modal content */}
            <div
              style={{
                background: "var(--panel)",
                borderRadius: "12px",
                padding: "24px",
                maxWidth: "400px",
                width: "90%",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                border: "1px solid var(--border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 12px 0", color: "#ef4444", fontSize: "18px", fontWeight: 600 }}>
                Delete Chat?
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--muted)", fontSize: "14px", lineHeight: "1.5" }}>
                Are you sure you want to delete <strong style={{ color: "var(--text)" }}>"{chatToDelete.title || 'Untitled Chat'}"</strong>? This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setDeletingChatId(null);
                    setChatToDelete(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.deleteChat(chatToDelete._id);
                      setChats(chats.filter(c => c._id !== chatToDelete._id));
                      if (activeChatId === chatToDelete._id) {
                        setActiveChatId(null);
                        setActiveChat(null);
                      }
                      setDeletingChatId(null);
                      setChatToDelete(null);
                    } catch (err) {
                      console.error('Failed to delete chat:', err);
                      setDeletingChatId(null);
                      setChatToDelete(null);
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
