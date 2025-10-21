import React, { useState, useEffect } from "react";

export default function ChatHistorySlider({
  chats,
  chatHistoryVisible,
  setChatHistoryVisible,
  activeChatId,
  setActiveChatId,
  setActiveChat,
  api,
  docs,
  setActiveTab,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fullChats, setFullChats] = useState({}); // Cache full chat data for searching

  // Load full chat data for search when slider opens
  useEffect(() => {
    if (chatHistoryVisible && chats.length > 0) {
      // Load all chats with messages for search functionality
      const loadChatsForSearch = async () => {
        const loaded = {};
        for (const chat of chats) {
          try {
            const fullChat = await api.getChat(chat._id);
            loaded[chat._id] = fullChat;
          } catch (err) {
            console.error(`Failed to load chat ${chat._id}:`, err);
          }
        }
        setFullChats(loaded);
      };
      loadChatsForSearch();
    }
  }, [chatHistoryVisible, chats, api]);

  // Sort chats by most recently updated/edited first
  const sortedChats = [...chats].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt);
    const dateB = new Date(b.updatedAt || b.createdAt);
    return dateB - dateA; // Most recent first
  });

  // Filter chats based on search query
  const filteredChats = sortedChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const title = (chat.title || "").toLowerCase();
    
    // Search in title
    if (title.includes(query)) return true;
    
    // Search in message content
    const fullChat = fullChats[chat._id];
    if (fullChat && fullChat.messages) {
      return fullChat.messages.some((msg) =>
        (msg.text || "").toLowerCase().includes(query)
      );
    }
    
    return false;
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
            placeholder="Search chats by title or content..."
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
              setActiveChatId(chat._id);
              setActiveChat(null);
              const c = await api.getChat(chat._id);
              setActiveChat(c);
              setChatHistoryVisible(false);
              setActiveTab("chat");
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {chat.title || "Untitled Chat"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {new Date(chat.updatedAt || chat.createdAt).toLocaleString()}
            </div>
          </div>
        ))
      )}
      </div>
    </>
  );
}
