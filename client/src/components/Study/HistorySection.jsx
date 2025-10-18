import React from "react";
import Loader from "../common/Loader";

export default function HistorySection({ selected, attemptHistory, loadingAttemptHistory }) {
  if (selected === "all") {
    return (
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <div>Select a specific PDF to view attempt history</div>
        </div>
      </div>
    );
  }

  if (loadingAttemptHistory) return <Loader text="Loading attempt history..." />;

  if (!attemptHistory)
    return (
      <div style={{ textAlign: "center", color: "var(--muted)", marginTop: "40px" }}>
        No attempt history available.
      </div>
    );

  return (
    <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
      {attemptHistory.attempts.length === 0 ? (
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
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
            <div>No quiz attempts found for this PDF</div>
            <div style={{ fontSize: "14px", marginTop: "8px" }}>
              Take a quiz to see your performance history
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              background: "#0d142c",
              borderRadius: 8,
              border: "1px solid #1a244d",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>{attemptHistory.title}</div>
            <div style={{ fontSize: "14px", color: "var(--muted)" }}>
              {attemptHistory.totalAttempts} attempt
              {attemptHistory.totalAttempts !== 1 ? "s" : ""} completed
            </div>
          </div>

          {attemptHistory.attempts.map((a, i) => (
            <div
              key={a.id || i}
              style={{
                background: "#0d142c",
                border: "1px solid #1a244d",
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Attempt #{a.attemptNumber}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background:
                      a.overallAccuracy >= 0.8
                        ? "#6ee7b7"
                        : a.overallAccuracy >= 0.6
                        ? "#ffa500"
                        : "#ff7c7c",
                    color: "#000",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {Math.round(a.overallAccuracy * 100)}%
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--accent)" }}>
                    {a.score}/{a.total}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Score</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--accent2)" }}>
                    {a.quizType}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Type</div>
                </div>
              </div>

              {a.strengths?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: "12px", color: "var(--accent2)", fontWeight: 600 }}>
                    Strengths:
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {a.strengths.join(", ")}
                  </div>
                </div>
              )}

              {a.weaknesses?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: "12px", color: "#ff7c7c", fontWeight: 600 }}>
                    Areas to Improve:
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {a.weaknesses.join(", ")}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
