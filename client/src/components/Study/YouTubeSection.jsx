import React from "react";
import Loader from "../common/Loader";

export default function YouTubeSection({ yt, loadingYt, question, refreshYouTubeRecommendations }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          marginBottom: 12,
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>YouTube Recommendations</div>
          <div style={{ fontSize: "14px", color: "var(--muted)" }}>
            Get video suggestions based on your study topics
          </div>
        </div>
        {question.trim() && (
          <button
            className="secondary"
            onClick={refreshYouTubeRecommendations}
            disabled={loadingYt}
            style={{ padding: "8px 12px", fontSize: "12px" }}
          >
            {loadingYt ? "Generating..." : "Refresh"}
          </button>
        )}
      </div>

      {!yt && !loadingYt && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📺</div>
            <div>Ask a question in the Chat Tutor to get YouTube recommendations</div>
          </div>
        </div>
      )}

      {loadingYt && <Loader text="Generating YouTube recommendations..." />}

      {yt && !loadingYt && (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <div
            style={{
              marginBottom: 12,
              padding: "12px",
              background: "#0d142c",
              borderRadius: 8,
              border: "1px solid #1a244d",
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
              Search Query: {yt.query}
              {yt.generated && <span style={{ color: "var(--accent2)", marginLeft: "8px" }}>• AI Generated</span>}
            </div>
            <div style={{ fontWeight: 600 }}>
              {yt.suggestions?.length > 0
                ? `${yt.suggestions.length} recommendations found`
                : "No recommendations available"}
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {yt.suggestions?.map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#0d142c",
                  border: "1px solid #1a244d",
                  borderRadius: 10,
                  padding: "16px",
                  cursor: "pointer",
                  transition: "0.2s ease",
                }}
                onClick={() => window.open(s.url, "_blank")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      background: "var(--accent)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0a0f25",
                      fontWeight: "bold",
                      fontSize: "18px",
                    }}
                  >
                    ▶
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>YouTube • Click to open</div>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "12px" }}>↗</div>
                </div>
              </div>
            ))}
          </div>
          {yt.suggestions?.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 20px" }}>
              No YouTube recommendations available for this query.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
