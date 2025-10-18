import React from "react";

export default function ResizeHandle({ leftPanelWidth, setLeftPanelWidth }) {
  return (
    <div
      className="resize-handle"
      style={{
        width: "8px",
        height: "100vh",
        background: "#1f2b57",
        cursor: "col-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
      onMouseDown={(e) => {
        const startX = e.clientX;
        const startWidth = leftPanelWidth;

        const handleMouseMove = (e) => {
          const deltaX = e.clientX - startX;
          const containerWidth = window.innerWidth;
          const newWidth = Math.max(
            20,
            Math.min(80, startWidth + (deltaX / containerWidth) * 100)
          );
          setLeftPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: "12px" }}>⟷</div>
    </div>
  );
}
