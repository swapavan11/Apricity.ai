import React from "react";

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
  return (
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ margin: 0 }}>Chat History</h3>
        <button
          className="secondary"
          onClick={() => setChatHistoryVisible(false)}
          style={{ padding: "6px 10px", fontSize: "12px" }}
        >
          ✕
        </button>
      </div>

      {chats.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
          <div>No previous chats found</div>
        </div>
      ) : (
        chats.map((chat) => (
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
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              💬 {chat.messages?.length || 0} messages
            </div>
          </div>
        ))
      )}
    </div>
  );
}
