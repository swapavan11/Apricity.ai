import React, { useState } from "react";
import Loader from "../common/Loader";
import axios from "axios";

export default function YouTubeSection({ yt, loadingYt, question, refreshYouTubeRecommendations, selected, docs, chats, activeChatId }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState("");
  
  // YouTube section tabs
  const [ytTab, setYtTab] = useState(selected && selected !== 'all' ? 'pdf' : 'instruction');
  
  // PDF-specific recommendations
  const [pdfYt, setPdfYt] = useState(null);
  const [loadingPdfYt, setLoadingPdfYt] = useState(false);
  
  // Instruction-based recommendations
  const [instruction, setInstruction] = useState("");
  const [instructionYt, setInstructionYt] = useState(null);
  const [loadingInstructionYt, setLoadingInstructionYt] = useState(false);
  
  // Chat-based recommendations
  const [chatYt, setChatYt] = useState(null);
  const [loadingChatYt, setLoadingChatYt] = useState(false);
  
  // Video summarization
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSummary, setVideoSummary] = useState(null);
  const [loadingVideoSummary, setLoadingVideoSummary] = useState(false);
  
  // Update tab when selected document changes
  React.useEffect(() => {
    if (selected && selected !== 'all') {
      setYtTab('pdf');
    }
  }, [selected]);
  
  // Parse PDF and generate comprehensive video series
  const parsePdfForVideos = async () => {
    if (!selected || selected === 'all') return;
    
    setLoadingPdfYt(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/youtube/recommend-by-pdf?documentId=${selected}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setPdfYt(response.data);
    } catch (error) {
      console.error("PDF parsing error:", error);
      setPdfYt({ error: "Failed to parse PDF and generate recommendations" });
    } finally {
      setLoadingPdfYt(false);
    }
  };
  
  // Generate videos based on user instruction
  const generateFromInstruction = async () => {
    if (!instruction.trim()) return;
    
    setLoadingInstructionYt(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/youtube/recommend-by-instruction`,
        { instruction },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setInstructionYt(response.data);
    } catch (error) {
      console.error("Instruction generation error:", error);
      setInstructionYt({ error: "Failed to generate recommendations" });
    } finally {
      setLoadingInstructionYt(false);
    }
  };
  
  // Analyze chat and generate recommendations
  const generateFromChat = async () => {
    if (!activeChatId) return;
    
    setLoadingChatYt(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/youtube/recommend-by-chat`,
        { chatId: activeChatId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setChatYt(response.data);
    } catch (error) {
      console.error("Chat analysis error:", error);
      setChatYt({ error: "Failed to analyze chat" });
    } finally {
      setLoadingChatYt(false);
    }
  };
  
  // Summarize video by URL
  const summarizeVideo = async () => {
    if (!videoUrl.trim()) return;
    
    setLoadingVideoSummary(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/youtube/summarize`,
        { videoUrl },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setVideoSummary(response.data);
    } catch (error) {
      console.error("Video summarization error:", error);
      setVideoSummary({ error: "Failed to summarize video" });
    } finally {
      setLoadingVideoSummary(false);
    }
  };
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Chrome-style YouTube section tabs */}
      <div style={{
        background: "#0a0f24",
        borderBottom: "1px solid #1f2b57",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingTop: "8px",
        marginBottom: "16px",
        flexShrink: 0
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { id: 'pdf', label: '📄 By PDF', icon: '📄', disabled: !selected || selected === 'all' },
            { id: 'instruction', label: '💡 By Instruction', icon: '💡' },
            { id: 'chat', label: '💬 By Chat', icon: '💬' },
            { id: 'summarize', label: '🎬 Summarize Video', icon: '🎬' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setYtTab(tab.id)}
              disabled={tab.disabled}
              style={{
                background: ytTab === tab.id ? 'var(--panel)' : 'transparent',
                border: ytTab === tab.id ? '1px solid rgba(124, 156, 255, 0.3)' : '1px solid transparent',
                borderBottom: 'none',
                borderRadius: '6px 6px 0 0',
                padding: '8px 16px',
                color: tab.disabled ? '#555' : (ytTab === tab.id ? 'var(--text)' : 'var(--muted)'),
                fontSize: '13px',
                fontWeight: ytTab === tab.id ? 600 : 400,
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                marginBottom: '-1px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: ytTab === tab.id 
                  ? '0 -2px 6px rgba(124, 156, 255, 0.3), 0 0 8px rgba(124, 156, 255, 0.15)'
                  : 'none',
                opacity: tab.disabled ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (ytTab !== tab.id && !tab.disabled) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (ytTab !== tab.id && !tab.disabled) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--muted)';
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label.replace(tab.icon + ' ', '')}</span>
            </button>
          ))}
        </div>
        
        {/* Refresh button */}
        {question.trim() && ytTab !== 'summarize' && (
          <button
            className="secondary"
            onClick={refreshYouTubeRecommendations}
            disabled={loadingYt}
            style={{ padding: "6px 12px", fontSize: "12px", marginBottom: "8px", marginRight: "8px" }}
          >
            {loadingYt ? "Generating..." : "🔄 Refresh"}
          </button>
        )}
      </div>

      {/* By PDF Mode - Empty State */}
      {ytTab === 'pdf' && !pdfYt && !loadingPdfYt && (
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
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "var(--text)" }}>
              Parse PDF for Video Recommendations
            </div>
            <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
              Generate a comprehensive learning series of videos to understand the entire PDF content
            </div>
            <button
              className="primary"
              onClick={parsePdfForVideos}
              style={{ padding: "12px 24px", fontSize: "14px" }}
            >
              📄 Parse PDF & Get Videos
            </button>
          </div>
        </div>
      )}
      
      {/* By Instruction Mode - Input State */}
      {ytTab === 'instruction' && !instructionYt && !loadingInstructionYt && (
        <div style={{ flex: 1, padding: "40px 20px", overflowY: "auto" }} className="hide-scrollbar">
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px", textAlign: "center" }}>💡</div>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "var(--text)", textAlign: "center" }}>
              Get Custom Learning Series
            </div>
            <div style={{ marginBottom: "24px", color: "var(--muted)", textAlign: "center" }}>
              Describe what you want to learn and how. We'll create a personalized video study plan.
            </div>
            
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Example: I want to learn machine learning from basics to advanced. Focus on practical coding examples with Python. I prefer beginner-friendly explanations and real-world applications."
              style={{
                width: "100%",
                minHeight: "150px",
                padding: "16px",
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
                resize: "vertical",
                marginBottom: "16px"
              }}
            />
            
            <button
              className="primary"
              onClick={generateFromInstruction}
              disabled={!instruction.trim()}
              style={{ width: "100%", padding: "14px", fontSize: "15px" }}
            >
              🚀 Generate Learning Series
            </button>
          </div>
        </div>
      )}
      
      {/* By Chat Mode - Analysis State */}
      {ytTab === 'chat' && !chatYt && !loadingChatYt && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ textAlign: "center", maxWidth: "500px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "var(--text)" }}>
              Analyze Active Chat for Videos
            </div>
            {activeChatId ? (
              <>
                <div style={{ marginBottom: "20px", color: "var(--muted)" }}>
                  We'll analyze your current chat conversation and recommend relevant educational videos
                </div>
                <button
                  className="primary"
                  onClick={generateFromChat}
                  style={{ padding: "12px 24px", fontSize: "14px" }}
                >
                  🔍 Analyze Chat & Get Videos
                </button>
              </>
            ) : (
              <div style={{ color: "var(--muted)" }}>
                Start a chat conversation first, then come back here to get video recommendations based on your discussion
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Summarize Video Mode - Input State */}
      {ytTab === 'summarize' && !videoSummary && !loadingVideoSummary && (
        <div style={{ flex: 1, padding: "40px 20px", overflowY: "auto" }} className="hide-scrollbar">
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px", textAlign: "center" }}>🎬</div>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "var(--text)", textAlign: "center" }}>
              Summarize YouTube Video
            </div>
            <div style={{ marginBottom: "24px", color: "var(--muted)", textAlign: "center" }}>
              Paste any YouTube video URL and get an educational summary with key points and learning objectives
            </div>
            
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "var(--input-bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "14px",
                marginBottom: "16px"
              }}
            />
            
            <button
              className="primary"
              onClick={summarizeVideo}
              disabled={!videoUrl.trim()}
              style={{ width: "100%", padding: "14px", fontSize: "15px" }}
            >
              📝 Summarize Video
            </button>
          </div>
        </div>
      )}

      {loadingYt && <Loader text="Generating YouTube recommendations..." />}
      {loadingPdfYt && <Loader text="Parsing PDF and generating video series..." />}
      {loadingInstructionYt && <Loader text="Creating your custom learning series..." />}
      {loadingChatYt && <Loader text="Analyzing chat and finding relevant videos..." />}
      {loadingVideoSummary && <Loader text="Summarizing video content..." />}

      {/* By PDF Mode - Show PDF-based recommendations */}
      {ytTab === 'pdf' && pdfYt && !loadingPdfYt && (
        <div style={{ 
          flex: 1, 
          overflow: "auto", 
          minHeight: 0,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }} className="hide-scrollbar">
          {/* PDF Content Analysis */}
          {pdfYt.extraction && (
            <div
              style={{
                marginBottom: 16,
                padding: "16px",
                background: "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)",
                borderRadius: 10,
                border: "1px solid #2a3a6d",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                  📄 PDF Analysis
                </div>
                {pdfYt.suggestions?.length > 0 && (
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent2)" }}>
                    {pdfYt.suggestions.length} Video Series
                  </div>
                )}
              </div>
              
              {/* PDF Name */}
              {pdfYt.pdfName && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                    Document:
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 600 }}>
                    {pdfYt.pdfName}
                  </div>
                </div>
              )}
              
              {/* Keywords */}
              {pdfYt.extraction.keywords && pdfYt.extraction.keywords.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                    Key Topics:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {pdfYt.extraction.keywords.slice(0, 10).map((keyword, i) => {
                      const colors = [
                        { bg: "rgba(124, 156, 255, 0.15)", border: "rgba(124, 156, 255, 0.4)", text: "#7c9cff" },
                        { bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.4)", text: "#22c55e" },
                        { bg: "rgba(251, 146, 60, 0.15)", border: "rgba(251, 146, 60, 0.4)", text: "#fb923c" },
                        { bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.4)", text: "#a855f7" },
                        { bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.4)", text: "#ec4899" },
                      ];
                      const color = colors[i % colors.length];
                      
                      return (
                        <span
                          key={i}
                          style={{
                            padding: "5px 12px",
                            background: color.bg,
                            border: `1px solid ${color.border}`,
                            borderRadius: "14px",
                            fontSize: "11px",
                            color: color.text,
                            fontWeight: 600,
                          }}
                        >
                          {keyword}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Video Series Header */}
          <div style={{ 
            marginBottom: 16, 
            padding: "12px 16px",
            background: "rgba(124, 156, 255, 0.08)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "6px"
          }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
              📚 Comprehensive Learning Series
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>
              Watch in order to master the entire PDF content • Each video tagged with relevant topics
            </div>
          </div>

          {/* Video Grid with Tags */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: "16px",
            width: "100%"
          }}>
            {pdfYt.suggestions?.map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#0d142c",
                  border: "1px solid #1a244d",
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
                onClick={() => {
                  setSelectedVideo(s);
                  setSummary("");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1a244d";
                  e.currentTarget.style.borderColor = "#2a3a6d";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(124, 156, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#0d142c";
                  e.currentTarget.style.borderColor = "#1a244d";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  background: s.videoId
                    ? `url(https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg) center/cover`
                    : "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {/* Play button */}
                  <div style={{
                    width: "60px",
                    height: "60px",
                    background: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    color: "#dc2626",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}>
                    ▶
                  </div>
                  
                  {/* Sequence number */}
                  <div style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: "32px",
                    height: "32px",
                    background: "rgba(0,0,0,0.8)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#fff",
                    border: "2px solid var(--accent)"
                  }}>
                    {s.sequence || i + 1}
                  </div>
                </div>
                
                {/* Video info */}
                <div style={{ padding: "12px" }}>
                  <div style={{
                    fontWeight: 600,
                    marginBottom: 6,
                    fontSize: "14px",
                    color: "var(--text)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: "1.4"
                  }}>
                    {s.title}
                  </div>
                  
                  <div style={{
                    fontSize: "11px",
                    color: "#7c9cff",
                    fontWeight: 500,
                    marginBottom: 8
                  }}>
                    📺 {s.channel}
                  </div>
                  
                  {/* Tags for this video */}
                  {s.tags && s.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                      {s.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          style={{
                            padding: "3px 8px",
                            background: "rgba(124, 156, 255, 0.1)",
                            border: "1px solid rgba(124, 156, 255, 0.3)",
                            borderRadius: "10px",
                            fontSize: "10px",
                            color: "#7c9cff",
                            fontWeight: 600
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {pdfYt.suggestions?.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 20px" }}>
              No videos generated for this PDF.
            </div>
          )}
        </div>
      )}
      
      {/* By Instruction Mode - Show Results */}
      {ytTab === 'instruction' && instructionYt && !loadingInstructionYt && (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
          {/* Study Plan */}
          {instructionYt.studyPlan && (
            <div style={{ marginBottom: 16, padding: "16px", background: "rgba(124, 156, 255, 0.1)", borderLeft: "3px solid var(--accent)", borderRadius: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)", marginBottom: "8px" }}>📋 Your Study Plan</div>
              <div style={{ fontSize: "13px", color: "var(--text)", lineHeight: "1.6" }}>{instructionYt.studyPlan}</div>
            </div>
          )}
          
          {/* Keywords */}
          {instructionYt.extraction?.keywords && instructionYt.extraction.keywords.length > 0 && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)", borderRadius: 8, border: "1px solid #2a3a6d" }}>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>Key Topics:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {instructionYt.extraction.keywords.map((keyword, i) => (
                  <span key={i} style={{ padding: "4px 10px", background: "rgba(124, 156, 255, 0.15)", border: "1px solid rgba(124, 156, 255, 0.3)", borderRadius: "12px", fontSize: "11px", color: "#7c9cff", fontWeight: 600 }}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Video Grid */}
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(124, 156, 255, 0.08)", borderLeft: "3px solid var(--accent)", borderRadius: "6px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>📚 Learning Path</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>Videos organized to match your learning goals</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", width: "100%" }}>
            {instructionYt.suggestions?.map((s, i) => (
              <div key={i} style={{ background: "#0d142c", border: "1px solid #1a244d", borderRadius: 12, cursor: "pointer", transition: "all 0.2s ease", overflow: "hidden" }}
                onClick={() => { setSelectedVideo(s); setSummary(""); }}>
                <div style={{ width: "100%", aspectRatio: "16/9", background: s.videoId ? `url(https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg) center/cover` : "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "60px", height: "60px", background: "rgba(255, 255, 255, 0.95)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "#dc2626" }}>▶</div>
                  <div style={{ position: "absolute", top: 8, right: 8, width: "32px", height: "32px", background: "rgba(0,0,0,0.8)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#fff", border: "2px solid var(--accent)" }}>{s.sequence || i + 1}</div>
                </div>
                <div style={{ padding: "12px" }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: "14px", color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.4" }}>{s.title}</div>
                  <div style={{ fontSize: "11px", color: "#7c9cff", fontWeight: 500, marginBottom: 8 }}>📺 {s.channel}</div>
                  {s.tags && s.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {s.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} style={{ padding: "3px 8px", background: "rgba(124, 156, 255, 0.1)", border: "1px solid rgba(124, 156, 255, 0.3)", borderRadius: "10px", fontSize: "10px", color: "#7c9cff", fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* By Chat Mode - Show Results */}
      {ytTab === 'chat' && chatYt && !loadingChatYt && (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
          {/* Chat Analysis Info */}
          {chatYt.chatAnalysis && (
            <div style={{ marginBottom: 16, padding: "16px", background: "rgba(110, 231, 183, 0.1)", borderLeft: "3px solid var(--accent2)", borderRadius: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent2)", marginBottom: "4px" }}>💬 Chat Analysis</div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>{chatYt.chatAnalysis}</div>
            </div>
          )}
          
          {/* Keywords */}
          {chatYt.extraction?.keywords && chatYt.extraction.keywords.length > 0 && (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)", borderRadius: 8, border: "1px solid #2a3a6d" }}>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>Topics Discussed:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {chatYt.extraction.keywords.map((keyword, i) => (
                  <span key={i} style={{ padding: "4px 10px", background: "rgba(110, 231, 183, 0.15)", border: "1px solid rgba(110, 231, 183, 0.3)", borderRadius: "12px", fontSize: "11px", color: "#6ee7b7", fontWeight: 600 }}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Video Grid */}
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(110, 231, 183, 0.08)", borderLeft: "3px solid var(--accent2)", borderRadius: "6px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent2)", marginBottom: "4px" }}>📚 Related Videos</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>Based on your chat conversation</div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", width: "100%" }}>
            {chatYt.suggestions?.map((s, i) => (
              <div key={i} style={{ background: "#0d142c", border: "1px solid #1a244d", borderRadius: 12, cursor: "pointer", transition: "all 0.2s ease", overflow: "hidden" }}
                onClick={() => { setSelectedVideo(s); setSummary(""); }}>
                <div style={{ width: "100%", aspectRatio: "16/9", background: s.videoId ? `url(https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg) center/cover` : "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "60px", height: "60px", background: "rgba(255, 255, 255, 0.95)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "#dc2626" }}>▶</div>
                  <div style={{ position: "absolute", top: 8, right: 8, width: "32px", height: "32px", background: "rgba(0,0,0,0.8)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#fff", border: "2px solid var(--accent2)" }}>{s.sequence || i + 1}</div>
                </div>
                <div style={{ padding: "12px" }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: "14px", color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.4" }}>{s.title}</div>
                  <div style={{ fontSize: "11px", color: "#6ee7b7", fontWeight: 500, marginBottom: 8 }}>📺 {s.channel}</div>
                  {s.tags && s.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {s.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} style={{ padding: "3px 8px", background: "rgba(110, 231, 183, 0.1)", border: "1px solid rgba(110, 231, 183, 0.3)", borderRadius: "10px", fontSize: "10px", color: "#6ee7b7", fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Summarize Video Mode - Show Summary */}
      {ytTab === 'summarize' && videoSummary && !loadingVideoSummary && (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0, padding: "20px", scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {/* Video Info */}
            {videoSummary.videoTitle && (
              <div style={{ marginBottom: 24, padding: "20px", background: "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)", borderRadius: 12, border: "1px solid #2a3a6d" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)", marginBottom: "12px" }}>🎬 Video Summary</div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>{videoSummary.videoTitle}</div>
                {videoSummary.videoUrl && (
                  <a href={videoSummary.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>
                    Watch on YouTube →
                  </a>
                )}
              </div>
            )}
            
            {/* Summary Content */}
            <div style={{ background: "var(--panel)", padding: "24px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "14px", color: "var(--text)", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                {videoSummary.summary || videoSummary.error || "No summary available"}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
              <button
                className="secondary"
                onClick={() => setVideoSummary(null)}
                style={{ flex: 1, padding: "12px" }}
              >
                Clear & Try Another Video
              </button>
              {videoSummary.videoUrl && (
                <button
                  className="primary"
                  onClick={() => window.open(videoSummary.videoUrl, "_blank")}
                  style={{ flex: 1, padding: "12px" }}
                >
                  Open in YouTube
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Other modes - Show regular recommendations (fallback) */}
      {ytTab !== 'pdf' && ytTab !== 'instruction' && ytTab !== 'chat' && ytTab !== 'summarize' && yt && !loadingYt && (
        <div style={{ 
          flex: 1, 
          overflow: "auto", 
          minHeight: 0,
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none'  /* IE and Edge */
        }} className="hide-scrollbar">
          {/* Extraction Information */}
          {yt.extraction && (
            <div
              style={{
                marginBottom: 16,
                padding: "16px",
                background: "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)",
                borderRadius: 10,
                border: "1px solid #2a3a6d",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                  📊 Content Analysis
                </div>
                {yt.suggestions?.length > 0 && (
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent2)" }}>
                    {yt.suggestions.length} Recommendations
                  </div>
                )}
              </div>
              
              {/* Main Topics - Show First */}
              {yt.extraction.mainTopics && yt.extraction.mainTopics.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                    Main Topics:
                  </div>
                  <div style={{ 
                    fontSize: "13px", 
                    color: "var(--text)", 
                    lineHeight: "1.5",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {yt.extraction.mainTopics.join(', ')}
                  </div>
                </div>
              )}
              
              {/* Keywords - Show as Tags Below with Different Colors */}
              {yt.extraction.keywords && yt.extraction.keywords.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "6px" }}>
                    Keywords:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {yt.extraction.keywords.slice(0, 8).map((keyword, i) => {
                      // Cycle through different colors
                      const colors = [
                        { bg: "rgba(124, 156, 255, 0.15)", border: "rgba(124, 156, 255, 0.4)", text: "#7c9cff" }, // Blue
                        { bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.4)", text: "#22c55e" }, // Green
                        { bg: "rgba(251, 146, 60, 0.15)", border: "rgba(251, 146, 60, 0.4)", text: "#fb923c" }, // Orange
                        { bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.4)", text: "#a855f7" }, // Purple
                        { bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.4)", text: "#ec4899" }, // Pink
                        { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.4)", text: "#3b82f6" }, // Light Blue
                        { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.4)", text: "#f59e0b" }, // Amber
                        { bg: "rgba(14, 165, 233, 0.15)", border: "rgba(14, 165, 233, 0.4)", text: "#0ea5e9" }, // Sky
                      ];
                      const color = colors[i % colors.length];
                      
                      return (
                        <span
                          key={i}
                          style={{
                            padding: "5px 12px",
                            background: color.bg,
                            border: `1px solid ${color.border}`,
                            borderRadius: "14px",
                            fontSize: "11px",
                            color: color.text,
                            fontWeight: 600,
                            transition: "all 0.2s ease",
                          }}
                        >
                          {keyword}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          

          {/* Learning Flow Heading */}
          <div style={{ 
            marginBottom: 16, 
            padding: "12px 16px",
            background: "rgba(124, 156, 255, 0.08)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "6px"
          }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
              📚 Learning Path
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>
              Click any video to watch • Grid adapts to panel size
            </div>
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: "16px",
            width: "100%"
          }}>
            {yt.suggestions?.map((s, i) => (
              <div
                key={i}
                style={{
                  background: "#0d142c",
                  border: "1px solid #1a244d",
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
                onClick={() => {
                  setSelectedVideo(s);
                  setSummary("");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1a244d";
                  e.currentTarget.style.borderColor = "#2a3a6d";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(124, 156, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#0d142c";
                  e.currentTarget.style.borderColor = "#1a244d";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  background: s.videoId
                    ? `url(https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg) center/cover`
                    : "linear-gradient(135deg, #1a244d 0%, #0d142c 100%)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {/* Play button overlay */}
                  <div style={{
                    width: "60px",
                    height: "60px",
                    background: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    color: "#dc2626",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }}>
                    ▶
                  </div>
                  
                  {/* Stage badge */}
                  <div style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    padding: "4px 8px",
                    background: s.stage === 'Foundation' 
                      ? "#22c55e"
                      : s.stage === 'Core Concepts'
                      ? "#7c9cff"
                      : s.stage === 'Advanced'
                      ? "#f59e0b"
                      : "#ef4444",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    {s.stage}
                  </div>
                  
                  {/* Sequence number */}
                  <div style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: "28px",
                    height: "28px",
                    background: "rgba(0,0,0,0.7)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#fff"
                  }}>
                    {s.sequence || i + 1}
                  </div>
                </div>
                
                {/* Video info */}
                <div style={{ padding: "12px" }}>
                  <div style={{
                    fontWeight: 600,
                    marginBottom: 4,
                    fontSize: "14px",
                    color: "var(--text)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: "1.4"
                  }}>
                    {s.title}
                  </div>
                  
                  <div style={{
                    fontSize: "11px",
                    color: "#7c9cff",
                    fontWeight: 500,
                    marginTop: 6
                  }}>
                    📺 {s.channel}
                  </div>
                </div>
              </div>
            ))}
            {yt.suggestions?.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 20px", gridColumn: "1 / -1" }}>
                No YouTube recommendations available for this query.
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Video Modal */}
          {selectedVideo && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 0, 0, 0.85)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
              }}
              onClick={() => setSelectedVideo(null)}
            >
              <div
                style={{
                  background: "#0d142c",
                  borderRadius: 16,
                  maxWidth: summary ? "1400px" : "900px",
                  width: "100%",
                  maxHeight: "90vh",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: summary ? "row" : "column",
                  border: "1px solid #2a3a6d"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Video Section */}
                <div style={{ flex: summary ? "0 0 60%" : "1", display: "flex", flexDirection: "column" }}>
                  {/* Header */}
                  <div style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #1a244d",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                        {selectedVideo.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#7c9cff" }}>
                        📺 {selectedVideo.channel}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedVideo(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        fontSize: "24px",
                        cursor: "pointer",
                        padding: "4px 8px",
                        lineHeight: 1
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Video Player */}
                  {selectedVideo.videoId ? (
                    <div style={{ position: "relative", paddingBottom: summary ? "0" : "56.25%", height: summary ? "400px" : 0 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          border: "none"
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                      Video preview not available
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div style={{
                    padding: "16px 20px",
                    borderTop: "1px solid #1a244d",
                    display: "flex",
                    gap: "12px"
                  }}>
                    <button
                      onClick={() => window.open(selectedVideo.url, "_blank")}
                      className="primary"
                      style={{
                        flex: 1,
                        padding: "12px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      <span>🔗</span>
                      Open in YouTube
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedVideo.videoId) return;
                        setSummarizing(true);
                        try {
                          const token = localStorage.getItem("token");
                          const response = await axios.post(
                            "http://localhost:5000/api/youtube/summarize",
                            { videoId: selectedVideo.videoId },
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          setSummary(response.data.summary);
                        } catch (error) {
                          console.error("Summarization error:", error);
                          setSummary("Failed to summarize video. Please try again.");
                        } finally {
                          setSummarizing(false);
                        }
                      }}
                      className="secondary"
                      disabled={summarizing || !selectedVideo.videoId}
                      style={{
                        flex: 1,
                        padding: "12px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      <span>📝</span>
                      {summarizing ? "Summarizing..." : "Summarize Video"}
                    </button>
                  </div>
                </div>
                
                {/* Summary Section */}
                {summary && (
                  <div style={{
                    flex: "0 0 40%",
                    borderLeft: "1px solid #1a244d",
                    padding: "20px",
                    overflowY: "auto",
                    maxHeight: "90vh"
                  }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
                      📄 Video Summary
                    </div>
                    <div style={{
                      fontSize: "13px",
                      color: "var(--text)",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap"
                    }}>
                      {summary}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
    </div>
  );
}
