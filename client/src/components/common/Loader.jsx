import React from "react";

export default function Loader({ text = "Loading..." }) {
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
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          ⏳
        </div>
        <div>{text}</div>
      </div>
    </div>
  );
}
