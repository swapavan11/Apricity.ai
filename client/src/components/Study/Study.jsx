import React, { useEffect, useState } from "react";
import useApi from "../../api/useApi";
import PdfViewer from "./PdfViewer";
import ResizeHandle from "../common/ResizeHandle";
import ChatTutor from "./ChatTutor";
import QuizSection from "./QuizSection";
import YouTubeSection from "./YouTubeSection";
import HistorySection from "./HistorySection";
import ChatHistorySlider from "./ChatHistorySlider";
import NotebookModal from "./NotebookModal";

export default function Study({ selected, docs }) {
  const api = useApi();

  // Layout
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);

  // Tabs
  const [activeTab, setActiveTab] = useState("chat");

  // Chat-related state (shared)
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatHistoryVisible, setChatHistoryVisible] = useState(false);

  // Input / response
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState([]);

  // PDF page navigation state
  const [pdfPage, setPdfPage] = useState(null);
  const handlePdfPageClick = (pageNum) => {
    setPdfPage(Number(pageNum));
  };

  // YouTube
  const [yt, setYt] = useState(null);
  const [loadingYt, setLoadingYt] = useState(false);

  // Loading flags
  const [loadingAsk, setLoadingAsk] = useState(false);

  // Attempt history
  const [attemptHistory, setAttemptHistory] = useState(null);
  const [loadingAttemptHistory, setLoadingAttemptHistory] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [retakeParams, setRetakeParams] = useState(null);

  // State to trigger chat-based YT recommendations
  const [triggerChatYt, setTriggerChatYt] = useState(0);
  const [generatingChatYt, setGeneratingChatYt] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  
  // Function to generate chat-based video recommendations (called from ChatTutor)
  const generateChatVideoRecommendations = async (messageId) => {
    if (!messageId || !activeChatId) {
      console.error('Missing messageId or activeChatId:', { messageId, activeChatId });
      return false;
    }
    
    console.log('Starting video recommendation generation for:', { messageId, chatId: activeChatId });
    
    // Set loading state
    setGeneratingChatYt(true);
    setCurrentMessageId(messageId);
    
    try {
      // Make API call directly
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      console.log('Calling API endpoint...');
      
      const response = await fetch(`${apiBase}/api/youtube/recommend-by-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          chatId: activeChatId,
          messageId
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`Failed to get recommendations: ${response.status}`);
      }
      
      const recommendations = await response.json();
      console.log('✅ Recommendations received successfully!');
      console.log('📊 Data structure:', {
        hasAnalysis: !!recommendations.chatAnalysis,
        hasKeywords: !!recommendations.extraction?.keywords,
        videoCount: recommendations.suggestions?.length || 0
      });
      
      // Update state with recommendations
      setYt({
        messageId,
        chatId: activeChatId,
        mode: 'chat',
        recommendations
      });
      console.log('💾 Stored recommendations for messageId:', messageId);
      
      // Increment trigger to notify YouTubeSection
      setTriggerChatYt(prev => prev + 1);
      console.log('📡 Triggered YouTubeSection update');
      
      // Switch to YouTube tab after successful generation
      setActiveTab('youtube');
      console.log('🔄 Switched to YouTube tab');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to generate video recommendations:', error);
      alert('Failed to generate video recommendations. Please try again.');
      return false;
    } finally {
      setGeneratingChatYt(false);
      setCurrentMessageId(null);
    }
  };

  // Helper: refresh YouTube suggestions (used from UI)
  const refreshYouTubeRecommendations = async () => {
    if (!question.trim()) return;
    setLoadingYt(true);
    try {
      const ytRes = await api.youtube(question, selected === "all" ? null : selected);
      setYt(ytRes);
    } catch (err) {
      console.error("YouTube recommendation error:", err);
      setYt({ query: question, suggestions: [], error: "Failed to load recommendations" });
    } finally {
      setLoadingYt(false);
    }
  };

  // Load attempt history for the currently selected PDF or general quizzes
  const loadAttemptHistory = async () => {
    setLoadingAttemptHistory(true);
    try {
      let history;
      if (selected === "all") {
        // Load general (non-PDF) quiz attempts
        history = await api.getGeneralAttemptHistory();
      } else {
        // Load PDF-specific attempts
        history = await api.getAttemptHistory(selected);
      }
      setAttemptHistory(history);
    } catch (err) {
      console.error("Failed to load attempt history:", err);
      setAttemptHistory(null);
    } finally {
      setLoadingAttemptHistory(false);
    }
  };

  // Initial load / refresh when selected changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.listChats(selected === "all" ? null : selected);
        if (!mounted) return;
        setChats(res.chats || []);
        setActiveChatId(null);
        setActiveChat(null);
        // Load attempt history (works for both PDF and general quizzes)
        await loadAttemptHistory();
      } catch (err) {
        console.error("Failed to list chats:", err);
      }
    })();
    return () => { mounted = false; }
  }, [selected]); // eslint-disable-line

  // Handler for creating a new chat (optimized for speed)
  const createNewChat = async () => {
    const ts = new Date();
    const docTitle = (docs.find((d) => d._id === selected)?.title) || "General";
    const base = question?.trim() ? question.trim().slice(0, 40) : docTitle;
    const title = `${base} • ${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`;
    
    try {
      // Create chat and immediately set state (optimistic update)
      const created = await api.createChat(selected === "all" ? null : selected, title);
      
      // Immediately set active chat with empty messages (no need to fetch)
      const newChat = {
        _id: created.id,
        title: created.title || title,
        documentId: created.documentId,
        messages: [],
        createdAt: ts.toISOString(),
        updatedAt: ts.toISOString()
      };
      
      setActiveChatId(created.id);
      setActiveChat(newChat);
      setActiveTab("chat");
      
      // Update chat list in background (non-blocking)
      api.listChats(selected === "all" ? null : selected).then(lst => {
        setChats(lst.chats || []);
      }).catch(err => console.error("Failed to refresh chat list:", err));
      
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  // Expose functions/props used by child components:
  const chatTutorProps = {
    api,
    selected,
    docs,
    chats,
    setChats,
    activeChat,
    setActiveChat,
    activeChatId,
    setActiveChatId,
    question,
    setQuestion,
    answer,
    setAnswer,
    citations,
    setCitations,
    loadingAsk,
    setLoadingAsk,
    setYt,
    setActiveTab,
    onPdfPageClick: handlePdfPageClick,
    generateChatVideoRecommendations,
    generatingChatYt,
  };

  return (
    <div style={{ display: "flex", height: "100%", position: "relative", flex: 1 }}>
      {/* Left panel: PDF viewer */}
      <div
        className="left-panel"
        style={{
          width: `${leftPanelWidth}%`,
          height: "100%",
          background: "var(--panel)",
          borderRight: "1px solid #1f2b57",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden"
        }}
      >
  {/* pass the selected document object so viewer can resolve cloudinary/local/protected URLs */}
  <PdfViewer api={api} doc={docs.find(d => d._id === selected)} page={pdfPage} />
      </div>

      {/* Resize handle */}
      <ResizeHandle leftPanelWidth={leftPanelWidth} setLeftPanelWidth={setLeftPanelWidth} />

      {/* Right panel */}
      <div
        className="right-panel"
        style={{
          width: `${100 - leftPanelWidth}%`,
          height: "100%",
          background: "var(--panel)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Chrome-style tabs header */}
        <div style={{
          background: "#0a0f24",
          borderBottom: "1px solid #1f2b57",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          padding: "0 12px",
          paddingTop: "8px",
          flexShrink: 0
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            {[
              { id: 'chat', label: '💬 Chat Tutor', icon: '💬' },
              { id: 'quiz', label: '📝 Quiz', icon: '📝' },
              { id: 'youtube', label: '📺 YouTube', icon: '📺' },
              { id: 'history', label: '📊 History', icon: '📊' }
            ].map((tab, index) => (
              <div key={tab.id} style={{ position: 'relative', display: 'flex' }}>
                
                
                <button
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: activeTab === tab.id ? 'var(--panel)' : 'transparent',
                    border: activeTab === tab.id ? '1px solid rgba(124, 156, 255, 0.3)' : '1px solid transparent',
                    borderBottom: 'none',
                    borderRadius: '8px 8px 0 0',
                    padding: '10px 20px',
                    color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                    fontSize: '14px',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    marginBottom: '-1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: activeTab === tab.id 
                      ? '0 -2px 8px rgba(124, 156, 255, 0.4), 0 0 12px rgba(124, 156, 255, 0.2), inset 0 1px 0 rgba(124, 156, 255, 0.2)'
                      : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label.replace(tab.icon + ' ', '')}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", gap: "8px", paddingBottom: "8px" }}>
            <button
              className="secondary"
              onClick={() => setNotebookOpen(true)}
              title="Open Notebook"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '13px' }}
            >
              <span>📝</span>
              <span>Notebook</span>
            </button>

            <button
              className="secondary"
              onClick={createNewChat}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '13px' }}
              title="Start New Chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>New Chat</span>
            </button>

            <button
              className="secondary"
              onClick={() => setChatHistoryVisible(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '13px' }}
              title="View Chat History"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>History</span>
            </button>
          </div>
        </div>

        {/* Content area with more space */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "16px" }}>

          {/* Tab content */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ChatTutor {...chatTutorProps} />
              {/* If there is a direct answer (and no active chat messages) show it like before */}
              {(answer && !activeChat?.messages?.length) && (
                <div className="section" style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Answer</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{answer}</div>
                  {citations?.length > 0 && (
                    <div style={{ marginTop: 10, color: 'var(--muted)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>Citations</div>
                      {citations.map((c, i) => (
                        <div key={i}>p.{c.page} — {c.title}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'quiz' && (
            <QuizSection api={api} selected={selected} docs={docs} loadAttemptHistory={loadAttemptHistory} retakeParams={retakeParams} />
          )}

          {activeTab === 'youtube' && (
            <YouTubeSection yt={yt} loadingYt={loadingYt} question={question} refreshYouTubeRecommendations={refreshYouTubeRecommendations} selected={selected} docs={docs} chats={chats} activeChatId={activeChatId} triggerChatYt={triggerChatYt} />
          )}

          {activeTab === 'history' && (
            <HistorySection selected={selected} attemptHistory={attemptHistory} loadingAttemptHistory={loadingAttemptHistory} />
          )}
        </div>
      </div>

      {/* Chat history slider (floating) */}
      <ChatHistorySlider
        chats={chats}
        setChats={setChats}
        chatHistoryVisible={chatHistoryVisible}
        setChatHistoryVisible={setChatHistoryVisible}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        setActiveChat={setActiveChat}
        api={api}
        docs={docs}
        setActiveTab={setActiveTab}
        selected={selected}
      />

      <NotebookModal open={notebookOpen} onClose={() => setNotebookOpen(false)} associatedDocId={selected === 'all' ? '' : selected} />
    </div>
  );
}
