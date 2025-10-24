
import React from "react";

export default function PdfViewer({ api, doc, page }) {
  // Helper to build PDF URL with page navigation if supported
  const getPdfUrl = () => {
    if (!doc) return null;
    const baseUrl = api.resolveDocUrl(doc);
    // If page is provided, append fragment or query (adjust for your backend)
    if (page) {
      // Common pattern: #page=2 for PDF.js, ?page=2 for some backends
      if (baseUrl.includes("#")) {
        return `${baseUrl}&page=${page}`;
      }
      return `${baseUrl}#page=${page}`;
    }
    return baseUrl;
  };

  const pdfUrl = getPdfUrl();

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {doc ? (
        <iframe
          title="pdf"
          src={pdfUrl}
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
