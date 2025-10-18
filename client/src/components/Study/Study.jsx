import React, { useEffect, useState } from "react";
import useApi from "../../api/useApi";
import PdfViewer from "./PdfViewer";
import ResizeHandle from "../common/ResizeHandle";
import ChatTutor from "./ChatTutor";
import QuizSection from "./QuizSection";
import YouTubeSection from "./YouTubeSection";
import HistorySection from "./HistorySection";
import ChatHistorySlider from "./ChatHistorySlider";

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

  // YouTube
  const [yt, setYt] = useState(null);
  const [loadingYt, setLoadingYt] = useState(false);

  // Loading flags
  const [loadingAsk, setLoadingAsk] = useState(false);

  // Attempt history
  const [attemptHistory, setAttemptHistory] = useState(null);
  const [loadingAttemptHistory, setLoadingAttemptHistory] = useState(false);

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

  // Load attempt history for the currently selected PDF
  const loadAttemptHistory = async () => {
    if (selected === "all") {
      setAttemptHistory(null);
      return;
    }
    setLoadingAttemptHistory(true);
    try {
      const history = await api.getAttemptHistory(selected);
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
        if (selected && selected !== "all") {
          await loadAttemptHistory();
        } else {
          setAttemptHistory(null);
        }
      } catch (err) {
        console.error("Failed to list chats:", err);
        if (mounted) {
          setChats([]);
          setActiveChatId(null);
          setActiveChat(null);
        }
      }
    })();
    return () => { mounted = false; }
  }, [selected]); // eslint-disable-line

  // Handler for creating a new chat (same behavior as earlier monolith new chat button)
  const createNewChat = async () => {
    const ts = new Date();
    const docTitle = (docs.find((d) => d._id === selected)?.title) || "General";
    const base = question?.trim() ? question.trim().slice(0, 40) : docTitle;
    const title = `${base} • ${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`;
    try {
      const created = await api.createChat(selected === "all" ? null : selected, title);
      setActiveChatId(created.id);
      // refresh chat list
      const lst = await api.listChats(selected === "all" ? null : selected);
      setChats(lst.chats || []);
      // load created chat
      const c = await api.getChat(created.id);
      setActiveChat(c);
      setActiveTab("chat");
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
  <PdfViewer api={api} doc={docs.find(d => d._id === selected)} />
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
        <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Top actions */}
          <div className="row" style={{ gap: 8, marginBottom: 16, flexShrink: 0, justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 8 }}>
              <button className={activeTab === 'chat' ? '' : 'secondary'} onClick={() => setActiveTab('chat')}>Chat Tutor</button>
              <button className={activeTab === 'quiz' ? '' : 'secondary'} onClick={() => setActiveTab('quiz')}>Quiz</button>
              <button className={activeTab === 'youtube' ? '' : 'secondary'} onClick={() => setActiveTab('youtube')}>YouTube</button>
              <button className={activeTab === 'history' ? '' : 'secondary'} onClick={() => setActiveTab('history')}>Attempt History</button>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <button
                className="secondary"
                onClick={createNewChat}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}
                title="Start New Chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>New Chat</span>
              </button>

              <button
                className="secondary"
                onClick={() => setChatHistoryVisible(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}
                title="View Chat History"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Chat History</span>
              </button>
            </div>
          </div>

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
            <QuizSection api={api} selected={selected} docs={docs} loadAttemptHistory={loadAttemptHistory} />
          )}

          {activeTab === 'youtube' && (
            <YouTubeSection yt={yt} loadingYt={loadingYt} question={question} refreshYouTubeRecommendations={refreshYouTubeRecommendations} />
          )}

          {activeTab === 'history' && (
            <HistorySection selected={selected} attemptHistory={attemptHistory} loadingAttemptHistory={loadingAttemptHistory} />
          )}
        </div>
      </div>

      {/* Chat history slider (floating) */}
      <ChatHistorySlider
        chats={chats}
        chatHistoryVisible={chatHistoryVisible}
        setChatHistoryVisible={setChatHistoryVisible}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        setActiveChat={setActiveChat}
        api={api}
        docs={docs}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
