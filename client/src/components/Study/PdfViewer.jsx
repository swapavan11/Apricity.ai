import React from "react";

export default function PdfViewer({ api, selected, docs }) {
  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {selected !== "all" ? (
        <iframe
          title="pdf"
          src={api.docFileUrl(selected)}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            textAlign: "center",
            padding: "40px",
          }}
        >
          <div>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              PDF Viewer
            </div>
            <div>Select a specific PDF from the navigation bar to view it here.</div>
          </div>
        </div>
      )}
    </div>
  );
}
