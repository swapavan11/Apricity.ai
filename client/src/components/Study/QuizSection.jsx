import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Toast from "../Toast";

export default function QuizSection({ api, selected, docs, loadAttemptHistory, retakeParams }) {
  const [quizMode, setQuizMode] = useState("auto"); // auto | select | custom
  const [topicList, setTopicList] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [quizPrompt, setQuizPrompt] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [submittedAnswers, setSubmittedAnswers] = useState(null);

  // Counts
  const [quizCount, setQuizCount] = useState(5);
  const [onewordCount, setOnewordCount] = useState(0);
  const [saqCount, setSaqCount] = useState(0);
  const [laqCount, setLaqCount] = useState(0);

  // State flags
  const [validationError, setValidationError] = useState("");
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [parsingTopics, setParsingTopics] = useState(false);
  const [fetchingTopics, setFetchingTopics] = useState(false);
  const [showPageRange, setShowPageRange] = useState(false);
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [customTopic, setCustomTopic] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  
  // Timer states
  const [isTimedQuiz, setIsTimedQuiz] = useState(false);
  const [timeLimit, setTimeLimit] = useState(30); // minutes
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const timerRef = useRef(null);

  // Difficulty state
  const [difficulty, setDifficulty] = useState("medium"); // easy | medium | hard
  
  // Modal states
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingRetake, setPendingRetake] = useState(null);
  const [shouldGenerateQuiz, setShouldGenerateQuiz] = useState(false);

  // Handle retake quiz with params (from props or event)
  useEffect(() => {
    const handleRetakeEvent = (event) => {
      const retakeData = event.detail;
      if (retakeData && retakeData.quizParams) {
        setPendingRetake(retakeData);
      }
    };
    
    window.addEventListener('retakeQuiz', handleRetakeEvent);
    
    return () => {
      window.removeEventListener('retakeQuiz', handleRetakeEvent);
    };
  }, []);

  useEffect(() => {
    if (retakeParams && retakeParams.quizParams) {
      setPendingRetake(retakeParams);
    }
  }, [retakeParams]);
  
  // Apply retake params and trigger generation
  useEffect(() => {
    if (pendingRetake && pendingRetake.quizParams) {
      console.log('Applying retake params:', pendingRetake);
      const params = pendingRetake.quizParams;

      // Set quiz parameters
      setQuizMode(params.mode || 'auto');
      setQuizCount(params.mcqCount || 0);
      setOnewordCount(params.onewordCount || 0);
      setSaqCount(params.saqCount || 0);
      setLaqCount(params.laqCount || 0);
      setSelectedTopics(params.topics || []);
      setQuizPrompt(params.instructions || '');
      setDifficulty(params.difficulty || 'medium');

      console.log('Set counts:', {
        mcq: params.mcqCount,
        oneword: params.onewordCount,
        saq: params.saqCount,
        laq: params.laqCount,
        mode: params.mode,
        difficulty: params.difficulty
      });

      // Set timer if specified
      if (pendingRetake.withTimer) {
        setIsTimedQuiz(true);
        setTimeLimit(pendingRetake.timeLimit || 30);
        console.log('Timer enabled:', pendingRetake.timeLimit);
      } else {
        setIsTimedQuiz(false);
        console.log('Timer disabled');
      }

      // Clear existing quiz first
      setQuiz(null);
      setScore(null);
      setAnswers({});
      setSubmittedAnswers(null);

      // Trigger quiz generation after states are set
      setTimeout(() => {
        console.log('Triggering quiz generation...');
        setShouldGenerateQuiz(true);
      }, 300);

      // Clear pending after applying
      setPendingRetake(null);
    }
  }, [pendingRetake]);
  
  // Auto-generate quiz when shouldGenerateQuiz is triggered
  useEffect(() => {
    if (shouldGenerateQuiz && !quiz) {
      console.log('Auto-generating quiz after retake...');
      setShouldGenerateQuiz(false);
      
      // Wait a bit for states to settle, then trigger generation
      setTimeout(() => {
        const generateBtn = document.querySelector('button[data-generate-quiz]');
        if (generateBtn && !generateBtn.disabled) {
          console.log('Clicking generate button...');
          generateBtn.click();
        } else {
          console.error('Generate button not found or disabled');
        }
      }, 100);
    }
  }, [shouldGenerateQuiz, quiz]);

  // Reset validation error when inputs change
  useEffect(() => {
    if (validationError) setValidationError("");
  }, [quizCount, onewordCount, saqCount, laqCount, quizMode, selectedTopics, quizPrompt]);

  // Handle PDF selection changes
  useEffect(() => {
    // If no PDF selected, switch to custom mode
    if ((!selected || selected === 'all') && (quizMode === 'auto' || quizMode === 'select')) {
      setQuizMode('custom');
    }
  }, [selected, quizMode]);
  
  // Clear quiz when PDF selection changes
  useEffect(() => {
    console.log('PDF changed to:', selected);
    // Clear quiz and related state when PDF changes
    setQuiz(null);
    setScore(null);
    setAnswers({});
    setSubmittedAnswers(null);
    setIsTimedQuiz(false);
    setTimeRemaining(null);
    setQuizStartTime(null);
  }, [selected]);
  
  // Persist topics to sessionStorage whenever they change
  useEffect(() => {
    if (topicList.length > 0 && selected) {
      sessionStorage.setItem(`topics_${selected}`, JSON.stringify(topicList));
    }
  }, [topicList, selected]);
  
  // Clear selected topics when PDF changes, but keep topicList for restoration
  useEffect(() => {
    setSelectedTopics([]);
  }, [selected]);

  // Auto-fetch cached topics when select mode is enabled with a specific PDF
  useEffect(() => {
    if (quizMode === 'select' && selected && selected !== 'all') {
      // First check if current topicList is for a different PDF
      const currentCachedPdf = sessionStorage.getItem('currentTopicsPdf');
      if (currentCachedPdf && currentCachedPdf !== selected) {
        // Different PDF - clear current topics
        setTopicList([]);
      }
      
      // Check sessionStorage for this PDF's topics
      const cached = sessionStorage.getItem(`topics_${selected}`);
      if (cached) {
        try {
          const parsedTopics = JSON.parse(cached);
          if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
            console.log('Topics restored from sessionStorage:', parsedTopics);
            setTopicList(parsedTopics);
            sessionStorage.setItem('currentTopicsPdf', selected);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached topics:', e);
        }
      }
      
      console.log('Auto-fetching topics for PDF:', selected);
      setFetchingTopics(true);
      let mounted = true;
      fetch(`/api/quiz/topics?documentId=${selected}`)
        .then((r) => r.json())
        .then((j) => {
          if (!mounted) return;
          console.log('Topics fetched:', j);
          if (j && Array.isArray(j.topics)) {
            setTopicList(j.topics);
            sessionStorage.setItem('currentTopicsPdf', selected);
          }
        })
        .catch((err) => {
          console.error('Error fetching topics:', err);
        })
        .finally(() => {
          if (mounted) setFetchingTopics(false);
        });
      return () => {
        mounted = false;
      };
    } else if (quizMode !== 'select') {
      // Not in select mode - clear the current PDF marker
      sessionStorage.removeItem('currentTopicsPdf');
    }
  }, [quizMode, selected]);

  const onParseTopics = async () => {
    if (!selected || selected === 'all') return;
    console.log('Parsing topics for PDF:', selected, 'Pages:', startPage, '-', endPage);
    setParsingTopics(true);
    try {
      const start = startPage ? parseInt(startPage) : undefined;
      const end = endPage ? parseInt(endPage) : undefined;
      const result = await api.parseTopics(selected, start, end);
      console.log('Parse result:', result);
      
      if (result.requiresPageRange) {
        // Large PDF - show page range inputs
        setShowPageRange(true);
        setTotalPages(result.totalPages);
        alert(result.message + ` Total pages: ${result.totalPages}`);
        setParsingTopics(false);
        return;
      }
      
      if (result.topics && Array.isArray(result.topics)) {
        setTopicList(result.topics);
        setShowPageRange(false);
        console.log('Topics set:', result.topics);
      }
    } catch (err) {
      console.error('Topic parsing error:', err);
      alert('Error parsing topics: ' + err.message);
    } finally {
      setParsingTopics(false);
    }
  };

  const onAddCustomTopic = async () => {
    if (!customTopic.trim() || !selected || selected === 'all') return;
    setAddingTopic(true);
    try {
      const result = await api.addTopic(selected, customTopic.trim());
      if (result.topics && Array.isArray(result.topics)) {
        setTopicList(result.topics);
        setCustomTopic('');
        console.log('Topic added. Updated list:', result.topics);
      }
    } catch (err) {
      console.error('Error adding topic:', err);
      alert('Error adding topic: ' + err.message);
    } finally {
      setAddingTopic(false);
    }
  };

  // Persist quiz to sessionStorage when it changes
  useEffect(() => {
    if (quiz && selected) {
      sessionStorage.setItem(`activeQuiz_${selected}`, JSON.stringify({
        quiz, answers, score, quizStartTime, isTimedQuiz, timeLimit, submittedAnswers
      }));
    }
  }, [quiz, answers, score, selected, quizStartTime, isTimedQuiz, timeLimit, submittedAnswers]);

  // Restore quiz on mount or when selected changes
  useEffect(() => {
    if (selected) {
      const saved = sessionStorage.getItem(`activeQuiz_${selected}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setQuiz(data.quiz);
          setAnswers(data.answers || {});
          setScore(data.score);
          setSubmittedAnswers(data.submittedAnswers || null);
          setQuizStartTime(data.quizStartTime);
          if (data.isTimedQuiz && data.timeLimit && data.quizStartTime) {
            setIsTimedQuiz(true);
            setTimeLimit(data.timeLimit);
            const elapsed = Date.now() - data.quizStartTime;
            const remaining = (data.timeLimit * 60 * 1000) - elapsed;
            if (remaining > 0) {
              setTimeRemaining(remaining);
            }
          }
        } catch (e) {
          console.error('Failed to restore quiz:', e);
        }
      }
    }
  }, [selected]);

  // Timer countdown
  useEffect(() => {
    if (isTimedQuiz && timeRemaining !== null && timeRemaining > 0 && quiz && !score) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            // Time's up - auto submit
            clearInterval(timerRef.current);
            setTimeout(() => onScore(true), 100);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isTimedQuiz, timeRemaining, quiz, score]);

  // Generate quiz
  const onGenQuiz = async () => {
    setLoadingQuiz(true);
    setValidationError("");
    try {
      const mcqCount = Math.max(0, Math.min(20, Number(quizCount) || 5));
      const saqCountVal = Math.max(0, Math.min(10, Number(saqCount) || 0));
      const laqCountVal = Math.max(0, Math.min(5, Number(laqCount) || 0));
      const onewordCountVal = Math.max(0, Math.min(20, Number(onewordCount) || 0));

      let documentIdToUse = null;
      let instructionsToUse = "";

      if (quizMode === "auto") {
        documentIdToUse = selected === "all" ? null : selected;
      } else if (quizMode === "select") {
        documentIdToUse = selected === "all" ? null : selected;
      } else if (quizMode === "custom") {
        documentIdToUse = selected === "all" ? null : selected;
        instructionsToUse = quizPrompt;
      }

      let combinedInstructions = instructionsToUse || "";
      const topicsToUse = quizMode === 'select' ? selectedTopics : [];

      const totalRequested = mcqCount + onewordCountVal + saqCountVal + laqCountVal;
      if (totalRequested > 80) {
        setValidationError("Requested too many questions. Please reduce the total to 80 or fewer.");
        setLoadingQuiz(false);
        return;
      }
      
      // Validate custom mode without PDF requires instructions
      if (quizMode === 'custom' && (!selected || selected === 'all') && !quizPrompt.trim()) {
        setValidationError("Instructions are required when generating a general quiz without selecting a PDF.");
        setLoadingQuiz(false);
        return;
      }
      
      // Validate select mode requires at least one topic
      if (quizMode === 'select' && selectedTopics.length === 0) {
        setValidationError("Please select at least one topic to generate a quiz.");
        setLoadingQuiz(false);
        return;
      }

      const res = await api.genQuiz(
        documentIdToUse,
        mcqCount,
        onewordCountVal,
        saqCountVal,
        laqCountVal,
        combinedInstructions,
        '',
        topicsToUse,
        difficulty
      );

      // If no questions generated, show error and log raw output
      if (!res.questions || !Array.isArray(res.questions) || res.questions.length === 0) {
        setValidationError("Quiz generation failed. Please try again, reduce question counts, or adjust your instructions.");
        if (res.raw) {
          // eslint-disable-next-line no-console
          console.error("Quiz generation LLM output:", res.raw);
        }
        setQuiz(null);
        setLoadingQuiz(false);
        return;
      }

      setQuiz(res);
      setAnswers({});
      setScore(null);
      setSubmittedAnswers(null); // Reset submitted answers for new quiz
      
      // Start timer for timed quizzes
      if (isTimedQuiz) {
        setQuizStartTime(Date.now());
        setTimeRemaining(timeLimit * 60 * 1000);
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
      setQuiz({ questions: [] });
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Score quiz
  const onScore = async (wasTimedOut = false) => {
    if (!quiz?.questions?.length) return;
    
    // Check if already submitted and answers haven't changed
    if (submittedAnswers && !wasTimedOut) {
      const answersChanged = JSON.stringify(answers) !== JSON.stringify(submittedAnswers);
      if (!answersChanged) {
        setToast({ message: 'Quiz already submitted! Edit your answers to resubmit.', type: 'warning' });
        return;
      }
    }
    
    setLoadingScore(true);
    
    const timeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
    
    try {
      const ordered = quiz.questions.map((q) => answers[q.id]);
      
      // Build quiz params for retake
      const quizParams = {
        mcqCount: quiz.questions.filter(q => q.type === 'MCQ').length,
        onewordCount: quiz.questions.filter(q => q.type === 'ONEWORD').length,
        saqCount: quiz.questions.filter(q => q.type === 'SAQ').length,
        laqCount: quiz.questions.filter(q => q.type === 'LAQ').length,
        mode: quizMode,
        topics: quizMode === 'select' ? selectedTopics : [],
        instructions: quizMode === 'custom' ? quizPrompt : '',
        difficulty
      };
      
      const payload = {
        documentId: selected === "all" ? null : selected,
        answers: ordered,
        questions: quiz.questions,
        timeTaken,
        timeLimit: isTimedQuiz ? timeLimit * 60 : null,
        wasTimedOut,
        quizParams
      };
      const res = await api.scoreQuiz(payload);
      setScore(res);
      
      // Save submitted answers to prevent duplicate submission
      setSubmittedAnswers({...answers});
      
      // Clear timer
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeRemaining(null);
      
      // Don't clear sessionStorage immediately - keep quiz visible with results
      // User can manually start new quiz
      
      // Always refresh attempt history after scoring (works for both PDF and general)
      if (typeof loadAttemptHistory === 'function') {
        await loadAttemptHistory();
      }
      // Also trigger dashboard refresh if available
      if (window.dispatchEvent) {
        window.dispatchEvent(new Event('refreshDashboard'));
      }
    } finally {
      setLoadingScore(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Configuration form (shown when quiz not yet generated) */}
      {!quiz && (
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px", scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <div style={{ marginBottom: "15px" }}>
            <h2 style={{ marginTop: 0, marginBottom: "6px", color: "var(--accent)", fontSize: "18px" }}>Quiz Generator</h2>
            <p style={{ color: "var(--muted)", marginBottom: "12px", fontSize: "13px" }}>
              Generate customized quizzes based on your PDF content. Choose question types and counts.
            </p>
          </div>

          {/* Mode selection - Tab style */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              gap: "4px", 
              marginBottom: 12,
              flexWrap: 'wrap',
              background: "#0a0f24",
              borderBottom: "1px solid #1f2b57",
              padding: "6px 8px 0 8px",
              borderRadius: "8px 8px 0 0"
            }}>
              {[
                { 
                  id: 'auto', 
                  label: 'Auto (current PDF)', 
                  disabled: !selected || selected === 'all',
                  tooltip: (!selected || selected === 'all') ? '(Select a PDF first)' : ''
                },
                { 
                  id: 'select', 
                  label: 'Select Topics from PDF', 
                  disabled: !selected || selected === 'all',
                  tooltip: (!selected || selected === 'all') ? '(Select a PDF first)' : ''
                },
                { 
                  id: 'custom', 
                  label: 'General Quiz (Custom Instructions)', 
                  disabled: false,
                  tooltip: ''
                }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (!tab.disabled) {
                      if (tab.id === 'select' && selected && selected !== 'all') {
                        setQuizMode("select");
                      } else if (tab.id === 'auto') {
                        setQuizMode("auto");
                      } else if (tab.id === 'custom') {
                        setQuizMode("custom");
                      }
                    }
                  }}
                  disabled={tab.disabled}
                  style={{
                    background: quizMode === tab.id ? 'var(--panel)' : 'transparent',
                    border: quizMode === tab.id ? '1px solid rgba(124, 156, 255, 0.3)' : '1px solid transparent',
                    borderBottom: 'none',
                    borderRadius: '6px 6px 0 0',
                    padding: '6px 14px',
                    color: tab.disabled ? '#555' : (quizMode === tab.id ? 'var(--text)' : 'var(--muted)'),
                    fontSize: '12px',
                    fontWeight: quizMode === tab.id ? 600 : 400,
                    cursor: tab.disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    marginBottom: '-1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: quizMode === tab.id 
                      ? '0 -2px 6px rgba(124, 156, 255, 0.3), 0 0 8px rgba(124, 156, 255, 0.15)'
                      : 'none',
                    opacity: tab.disabled ? 0.5 : 1,
                    lineHeight: '1.2'
                  }}
                  onMouseEnter={(e) => {
                    if (quizMode !== tab.id && !tab.disabled) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (quizMode !== tab.id && !tab.disabled) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }
                  }}
                  title={tab.tooltip}
                >
                  <span>{tab.label}</span>
                  {tab.tooltip && <span style={{ fontSize: '10px', opacity: 0.7 }}>{tab.tooltip}</span>}
                </button>
              ))}
            </div>
            
            {/* Info message for custom mode when no PDF */}
            {quizMode === "custom" && (!selected || selected === 'all') && (
              <div style={{ textAlign: 'center', padding: 8, background: 'rgba(124, 156, 255, 0.1)', borderRadius: 8, fontSize: '0.9em', color: 'var(--muted)' , margin:'12px auto', width:'80%' ,  display:'flex', alignItems:'center',justifyContent:'center'}}>
                ℹ️ General quiz mode - No PDF context will be used. Please provide detailed instructions below.
              </div>
            )}

            {/* Topic selector for select mode */}
            {quizMode === "select" && selected && selected !== 'all' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: 12 }}>
                {/* Page range input for large PDFs */}
                {showPageRange && (
                  <div style={{ width: '90%', maxWidth: 600, padding: 16, background: 'rgba(124, 156, 255, 0.1)', border: '1px solid var(--accent)', borderRadius: 8 }}>
                    <div style={{ marginBottom: 12, fontWeight: 600, color: 'var(--accent)', textAlign: 'center' }}>
                      📄 Large PDF Detected ({totalPages} pages)
                    </div>
                    <div style={{ fontSize: '0.9em', color: 'var(--muted)', marginBottom: 12, textAlign: 'center' }}>
                      For better topic extraction, please specify a page range:
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--muted)' }}>Start Page</label>
                        <input 
                          type="number" 
                          min="1" 
                          max={totalPages}
                          value={startPage}
                          onChange={(e) => setStartPage(e.target.value)}
                          placeholder="1"
                          style={{ width: 100, padding: '8px', borderRadius: 6, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ fontSize: '1.2em', color: 'var(--muted)', marginTop: 20 }}>—</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--muted)' }}>End Page</label>
                        <input 
                          type="number" 
                          min="1" 
                          max={totalPages}
                          value={endPage}
                          onChange={(e) => setEndPage(e.target.value)}
                          placeholder={totalPages.toString()}
                          style={{ width: 100, padding: '8px', borderRadius: 6, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button 
                    onClick={onParseTopics} 
                    disabled={parsingTopics || fetchingTopics}
                    style={{
                      padding: '10px 20px', 
                      borderRadius: 8, 
                      background: parsingTopics ? 'linear-gradient(90deg, var(--accent) 0%, rgba(124, 156, 255, 0.7) 50%, var(--accent) 100%)' : 'var(--accent)',
                      backgroundSize: parsingTopics ? '200% 100%' : '100% 100%',
                      color: 'white', 
                      border: 'none', 
                      cursor: (parsingTopics || fetchingTopics) ? 'not-allowed' : 'pointer', 
                      opacity: (parsingTopics || fetchingTopics) ? 0.8 : 1, 
                      fontWeight: 600, 
                      transition: 'all 0.3s ease',
                      boxShadow: parsingTopics ? '0 0 20px rgba(124, 156, 255, 0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                      animation: parsingTopics ? 'shimmer 2s infinite linear' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    {parsingTopics ? (
                      <>
                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⚡</span>
                        <span>Extracting Topics...</span>
                      </>
                    ) : fetchingTopics ? (
                      <>
                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔄</span>
                        <span>Loading...</span>
                      </>
                    ) : topicList.length > 0 ? (
                      <>
                        <span>🔄</span>
                        <span>Re-parse Topics</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Parse PDF Topics</span>
                      </>
                    )}
                  </button>
                </div>
                
                {topicList.length > 0 && (
                  <div style={{ width: '90%', maxWidth: 800, padding: 16, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                    <div style={{ marginBottom: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>📚 Select Topics for Quiz:</span>
                      <span style={{ fontSize: '0.85em', color: 'var(--muted)', background: 'rgba(124, 156, 255, 0.1)', padding: '4px 12px', borderRadius: 20 }}>{selectedTopics.length} selected</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, maxHeight: 250, overflowY: 'auto', padding: 4 }}>
                      {topicList.map((topic, idx) => {
                        const isSelected = selectedTopics.includes(topic);
                        return (
                          <label key={idx} style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            padding: '8px 12px', 
                            background: isSelected ? 'rgba(124, 156, 255, 0.15)' : 'var(--input-bg)', 
                            border: '1.5px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)'), 
                            borderRadius: 6, 
                            cursor: 'pointer', 
                            transition: 'all 0.2s ease', 
                            fontSize: '0.9em',
                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                            boxShadow: isSelected ? '0 2px 8px rgba(124, 156, 255, 0.2)' : 'none'
                          }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTopics([...selectedTopics, topic]);
                                } else {
                                  setSelectedTopics(selectedTopics.filter(t => t !== topic));
                                }
                              }}
                              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                            />
                            <span style={{ flex: 1, wordBreak: 'break-word', fontWeight: isSelected ? 600 : 400 }}>{topic}</span>
                          </label>
                        );
                      })}
                    </div>
                    
                    {/* Manual topic input */}
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.9em', color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
                        ➕ Add Custom Topic
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          onKeyPress={(e) => { if (e.key === 'Enter') onAddCustomTopic(); }}
                          placeholder="e.g., Advanced Calculus, Quantum Mechanics..."
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '0.9em' }}
                        />
                        <button 
                          onClick={onAddCustomTopic}
                          disabled={!customTopic.trim() || addingTopic}
                          style={{ 
                            padding: '8px 16px', 
                            borderRadius: 6, 
                            background: 'var(--accent)', 
                            color: 'white', 
                            border: 'none', 
                            cursor: (!customTopic.trim() || addingTopic) ? 'not-allowed' : 'pointer',
                            opacity: (!customTopic.trim() || addingTopic) ? 0.6 : 1,
                            fontWeight: 600,
                            fontSize: '0.9em',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {addingTopic ? '...' : '+ Add'}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
                        Add topics that weren't automatically extracted
                      </div>
                    </div>
                  </div>
                )}
                
                {topicList.length === 0 && !parsingTopics && !fetchingTopics && (
                  <div style={{ color: 'var(--muted)', fontSize: '0.9em', fontStyle: 'italic', padding: '12px 20px', background: 'rgba(124, 156, 255, 0.05)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                    💡 Click "Parse PDF Topics" to extract main topics using AI
                  </div>
                )}
              </div>
            )}

            {/* Custom prompt input */}
            {quizMode === "custom" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 9 }}>
                <textarea
                  rows={3}
                  value={quizPrompt}
                  onChange={(e) => setQuizPrompt(e.target.value)}
                  placeholder={
                    (!selected || selected === 'all') 
                      ? "Enter topic to generate quiz on (e.g., Python Programming, World War II, Calculus, etc.)"
                      : "E.g. Focus on Chapter 3: Kinematics. Make MCQs application-level; include numerical problems."
                  }
                  style={{
                    width: "80%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "#050b29ff",
                    color: "var(--text)",
                    border: "2px solid var(--accent)",
                    resize: "vertical",
                    fontSize: "13px",
                  }}
                />
              </div>
            )}
          </div>

          {/* Timer and Difficulty selector tile */}
          <div style={{
            marginBottom: 15,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 35,
            justifyContent: 'center',
            alignItems: 'stretch',
          }}>
            {/* Timer Card */}
            <div style={{
              flex: '1 1 195px',
              minWidth: 180,
              maxWidth: 255,
              background: 'rgba(124, 156, 255, 0.07)',
              borderRadius: 9,
              border: '1.5px solid var(--border)',
              padding: 15,
              boxShadow: '0 2px 9px rgba(124,156,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                <input 
                  type="checkbox" 
                  checked={isTimedQuiz}
                  onChange={(e) => setIsTimedQuiz(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <span style={{ fontWeight: 700, fontSize: '0.9em', color: 'var(--accent2)' }}>⏱️ Timed Quiz</span>
              </label>
              {isTimedQuiz && (
                <div style={{ marginTop: 8, width: '100%' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}>
                    <span style={{ fontSize: '0.85em', color: 'var(--muted)' }}>Time Limit:</span>
                    <button
                      type="button"
                      aria-label="Decrease time"
                      onClick={() => setTimeLimit(t => Math.max(1, t - 1))}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--accent)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(124,156,255,0.10)',
                        transition: 'background 0.2s',
                      }}
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={timeLimit}
                      onChange={e => {
                        const v = Number(e.target.value.replace(/[^0-9]/g, ''));
                        setTimeLimit(Math.max(1, Math.min(180, v || 1)));
                      }}
                      style={{
                        width: 36,
                        textAlign: 'center',
                        padding: '4px',
                        borderRadius: 5,
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        fontWeight: 600,
                        fontSize: '0.9em',
                        MozAppearance: 'textfield',
                        appearance: 'textfield',
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Increase time"
                      onClick={() => setTimeLimit(t => Math.min(180, t + 1))}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--accent)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(124,156,255,0.10)',
                        transition: 'background 0.2s',
                      }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: '0.85em', color: 'var(--muted)' }}>minutes</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                    {[10, 15, 30, 45, 60, 90, 120, 180].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTimeLimit(val)}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 12,
                          border: timeLimit === val ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                          background: timeLimit === val ? 'var(--accent)' : 'var(--input-bg)',
                          color: timeLimit === val ? 'white' : 'var(--text)',
                          fontWeight: 600,
                          fontSize: '0.85em',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          marginBottom: 2,
                        }}
                      >
                        {val} min
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: 5, fontStyle: 'italic', textAlign: 'center' }}>
                    Quiz will auto-submit when time expires
                  </div>
                </div>
              )}
            </div>
            {/* Difficulty Card */}
            <div style={{
              flex: '1 1 195px',
              minWidth: 180,
              maxWidth: 255,
              background: 'rgba(124, 156, 255, 0.07)',
              borderRadius: 9,
              border: '1.5px solid var(--border)',
              padding: 15,
              boxShadow: '0 2px 9px rgba(124,156,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <label style={{ fontWeight: 700, fontSize: '0.9em', color: 'var(--accent2)', marginBottom: 8 }}>🎯 Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  border: '1.5px solid var(--border)',
                  fontSize: '0.9em',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(124,156,255,0.08)',
                  marginBottom: 5,
                  cursor: 'pointer',
                  transition: 'border 0.2s, box-shadow 0.2s',
                }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: 3, textAlign: 'center' }}>
                Choose how challenging you want your quiz
              </div>
            </div>
          </div>

          {/* Question counts grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginBottom: "15px",
            }}
          >
            {[
              { label: "Multiple Choice Questions (MCQ)", icon: "🔘", desc: "Quick recall & factual knowledge", state: quizCount, setter: setQuizCount, max: 20 },
              { label: "One-Word Answers", icon: "🔤", desc: "Single-word or numeric answers", state: onewordCount, setter: setOnewordCount, max: 20 },
              { label: "Short Answer Questions (SAQ)", icon: "📝", desc: "2–3 sentence conceptual answers", state: saqCount, setter: setSaqCount, max: 10 },
              { label: "Long Answer Questions (LAQ)", icon: "📄", desc: "Detailed analytical explanations", state: laqCount, setter: setLaqCount, max: 5 },
            ].map((q) => (
              <div key={q.label} className="section" style={{ textAlign: "center", padding: "10px" }}>
                <div style={{ fontSize: "1.5em", marginBottom: "6px" }}>{q.icon}</div>
                <h4 style={{ marginTop: 0, marginBottom: "6px", color: "var(--accent2)", fontSize: "13px" }}>{q.label}</h4>
                <p style={{ fontSize: "0.8em", color: "var(--muted)", marginBottom: "9px" }}>{q.desc}</p>
                <div>
                  <div style={{ fontSize: "0.75em", color: "var(--muted)", marginBottom: "3px" }}>
                    Number of Questions
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={q.max}
                    value={q.state}
                    onChange={(e) => q.setter(e.target.value)}
                    style={{ width: "75px", textAlign: "center", padding: "6px", fontSize: "13px" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Difficulty selector */}
          {/* <div style={{ marginBottom: 20, textAlign: 'center', padding: '16px', background: 'rgba(124, 156, 255, 0.05)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <label style={{ fontWeight: 600, fontSize: '1.05em', marginRight: 12 }}>Difficulty:</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '1em' }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div> */}

          {/* Generate and Clear buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: "9px", marginBottom: "15px" }}>
            {/* Clear Quiz Button */}
            {(quiz || score) && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Clear quiz state
                  setQuiz(null);
                  setScore(null);
                  setAnswers({});
                  setSubmittedAnswers(null);
                  setIsTimedQuiz(false);
                  setTimeRemaining(null);
                  setQuizStartTime(null);
                  
                  // Clear active quiz from sessionStorage
                  if (selected) {
                    sessionStorage.removeItem(`activeQuiz_${selected}`);
                  }
                  
                  setToast({ message: 'Quiz cleared! Ready to generate a new quiz.', type: 'success' });
                }}
                style={{
                  padding: "9px 18px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 3px 9px rgba(102, 126, 234, 0.3)",
                }}
              >
                <span>🗑️</span>
                <span>Clear Quiz</span>
              </button>
            )}
            
            {/* Generate Quiz Button */}
            <button
              data-generate-quiz="true"
              onClick={onGenQuiz}
              disabled={
                loadingQuiz ||
                validationError ||
                (quizCount == 0 && onewordCount == 0 && saqCount == 0 && laqCount == 0) ||
                (quizMode === 'select' && selectedTopics.length === 0)
              }
              style={{
                padding: "9px 18px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {loadingQuiz ? (
                <>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid transparent",
                      borderTop: "2px solid currentColor",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Generate Quiz</span>
                </>
              )}
            </button>

            {(quizCount == 0 && onewordCount == 0 && saqCount == 0 && laqCount == 0) && (
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
                Please select at least one question type
              </div>
            )}

            {validationError && (
              <div
                style={{
                  marginTop: 8,
                  color: "#ffb4b4",
                  background: "#3b1a1a",
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: "13px",
                }}
              >
                {validationError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quiz rendering */}
      {quiz && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "8px", color: "var(--accent)" }}>Quiz Questions</h3>
              <p style={{ color: "var(--muted)" }}>
                {quiz.questions?.length || 0} questions generated
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Timer Tag */}
              {isTimedQuiz && timeRemaining > 0 && !score && (
                <div style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: timeRemaining < (timeLimit * 60 * 1000 * 0.1) ? '#ff6464' : '#6ee7b7',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.95em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  animation: timeRemaining < (timeLimit * 60 * 1000 * 0.1) ? 'pulse 1s infinite' : 'none',
                  border: `2px solid ${timeRemaining < (timeLimit * 60 * 1000 * 0.1) ? '#ff4444' : '#4ec99d'}`
                }}>
                  <span>⏱️</span>
                  <span>{Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}</span>
                </div>
              )}

              {/* Clear Quiz Button (moved left) */}
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuiz(null);
                  setScore(null);
                  setAnswers({});
                  setSubmittedAnswers(null);
                  setIsTimedQuiz(false);
                  setTimeRemaining(null);
                  setQuizStartTime(null);
                  if (selected) {
                    sessionStorage.removeItem(`activeQuiz_${selected}`);
                  }
                  setToast({ message: 'Quiz cleared! Ready to generate a new quiz.', type: 'success' });
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                }}
              >
                <span>🗑️</span>
                <span>Clear Quiz</span>
              </button>

              {/* New Quiz Button */}
              <button
                className="secondary"
                onClick={() => {
                  setQuiz(null);
                  setAnswers({});
                  setScore(null);
                  setSubmittedAnswers(null);
                  // Clear sessionStorage for this quiz
                  if (selected) {
                    sessionStorage.removeItem(`activeQuiz_${selected}`);
                  }
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🔄 New Quiz
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
            {quiz.questions?.map((q, idx) => {
              const resultMap = score ? Object.fromEntries(score.results.map((r) => [r.id, r])) : {};
              const result = resultMap[q.id];
              const isCorrect = result ? result.correct : null;
              const isPartial = result ? result.partial : false;
              return (
                <div className="section" key={q.id} style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700 }}>
                    {`Q${idx + 1}. [${q.type}] `}
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({node, ...props}) => <span {...props} />
                      }}
                    >
                      {q.question}
                    </ReactMarkdown>
                    {score && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: isCorrect ? "#6ee7b7" : isPartial ? "#ffa500" : "#ff7c7c",
                        }}
                      >
                        {isCorrect ? "Correct" : isPartial ? "Partial" : "Wrong"}
                      </span>
                    )}
                  </div>

                  {/* MCQ */}
                  {q.type === "MCQ" && Array.isArray(q.options) && (
                    <div style={{ marginTop: 8 }}>
                      {q.options.map((op, oidx) => {
                        let style = {};
                        if (score && result) {
                          if (oidx === result.expectedIndex) style = { color: "#6ee7b7" };
                          else if (!result.correct && oidx === result.userIndex) style = { color: "#ff7c7c" };
                        }
                        return (
                          <label key={oidx} style={{ display: "block", marginBottom: 6 }}>
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              checked={answers[q.id] === oidx}
                              onChange={() => setAnswers((a) => ({ ...a, [q.id]: oidx }))}
                              disabled={!!score}
                            />{" "}
                            <span style={style}>
                              <ReactMarkdown 
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                  p: ({node, ...props}) => <span {...props} />
                                }}
                              >
                                {op}
                              </ReactMarkdown>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Text questions */}
                  {(q.type === "SAQ" || q.type === "LAQ" || q.type === "ONEWORD") && (
                    <div style={{ marginTop: 8 }}>
                      {q.type === "ONEWORD" ? (
                        <input
                          type="text"
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          placeholder="One-word or numeric answer"
                          disabled={!!score}
                          style={{
                            width: "50%",
                            padding: 8,
                            borderRadius: 8,
                            background: "#0f1530",
                            color: "var(--text)",
                            border: "1px solid #1f2b57",
                          }}
                        />
                      ) : (
                        <textarea
                          rows={q.type === "LAQ" ? 4 : 2}
                          style={{
                            width: "100%",
                            background: "#0f1530",
                            color: "var(--text)",
                            border: "1px solid #1f2b57",
                            borderRadius: 10,
                            padding: 10,
                          }}
                          placeholder={`Your ${q.type} answer...`}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          disabled={!!score}
                        />
                      )}
                    </div>
                  )}

                  {/* Explanation / Expected answer */}
                  {score && (
                    <div style={{ marginTop: 8, color: "var(--muted)" }}>
                      <div>
                        p.{q.page} • 
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({node, ...props}) => <span {...props} />
                          }}
                        >
                          {q.explanation}
                        </ReactMarkdown>
                      </div>
                      {(q.type === "SAQ" || q.type === "LAQ" || q.type === "ONEWORD") && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: 8,
                            background: "#0b1024",
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "var(--text)" }}>Expected Answer:</div>
                          <div style={{ whiteSpace: "pre-wrap" }}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {q.answer}
                            </ReactMarkdown>
                          </div>
                          {result && (
                            <div style={{ marginTop: 4, color: "var(--muted)" }}>
                              Your Answer: 
                              <ReactMarkdown 
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                  p: ({node, ...props}) => <span {...props} />
                                }}
                              >
                                {result.userAnswer}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit quiz button */}
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                background: "#0d142c",
                border: "1px solid #1a244d",
                borderRadius: 10,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={loadingScore}
                  style={{
                    padding: "12px 24px",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    margin: "0 auto",
                  }}
                >
                  {loadingScore ? (
                    <>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid transparent",
                          borderTop: "2px solid currentColor",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span>Scoring…</span>
                    </>
                  ) : (
                    <>
                      ✅ <span>Submit Quiz</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Confirmation Modal */}
              {showSubmitConfirm && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }} onClick={() => setShowSubmitConfirm(false)}>
                  <div style={{
                    background: 'var(--panel)',
                    padding: 24,
                    borderRadius: 12,
                    maxWidth: 400,
                    border: '2px solid var(--accent)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                  }} onClick={(e) => e.stopPropagation()}>
                    <h3 style={{ marginTop: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⚠️</span>
                      <span>Submit Quiz?</span>
                    </h3>
                    <p style={{ color: 'var(--text)', marginBottom: 20 }}>
                      Are you sure you want to submit? You won't be able to change your answers after submission.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      <button 
                        className="secondary"
                        onClick={() => setShowSubmitConfirm(false)}
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setShowSubmitConfirm(false);
                          onScore(false);
                        }}
                        style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white' }}
                      >
                        Yes, Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {score && (
              <div className="section" style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: "18px", color: "var(--accent)" }}>
                  Quiz Results
                </div>
                <div style={{ marginBottom: 16, fontSize: "16px" }}>
                  Score:{" "}
                  <span style={{ fontWeight: 700, color: "var(--accent2)" }}>{score.score}</span> /{" "}
                  <span style={{ fontWeight: 700 }}>{score.total}</span>
                  <span style={{ marginLeft: "8px", color: "var(--muted)" }}>
                    ({(score.score / score.total * 100).toFixed(1)}%)
                  </span>
                </div>

                {score.analytics && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "#0b1024",
                      borderRadius: 8,
                      border: "1px solid #1a244d",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>
                      Performance Breakdown
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      {["mcq", "saq", "laq", "oneword"].map((type) => {
                        const acc = score.analytics[`${type}Accuracy`];
                        return (
                          <div key={type} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.8em", color: "var(--muted)" }}>
                              {type.toUpperCase()}
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                color:
                                  acc >= 0.8
                                    ? "#6ee7b7"
                                    : acc >= 0.6
                                    ? "#ffa500"
                                    : "#ff7c7c",
                              }}
                            >
                              {(acc * 100).toFixed(0)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {score.analytics.strengths?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: "0.9em", color: "#6ee7b7", marginBottom: 4 }}>
                          Strengths:
                        </div>
                        <div style={{ fontSize: "0.8em" }}>
                          {score.analytics.strengths.join(", ")}
                        </div>
                      </div>
                    )}
                    {score.analytics.weaknesses?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.9em", color: "#ff7c7c", marginBottom: 4 }}>
                          Focus Areas:
                        </div>
                        <div style={{ fontSize: "0.8em" }}>
                          {score.analytics.weaknesses.join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Suggested Topics from PDF - Only show if score < 100% */}
                {score.analytics?.suggestedTopics && score.analytics.suggestedTopics.length > 0 && score.score < score.total && (
                  <div style={{ marginTop: 16, padding: 16, background: 'rgba(255, 200, 100, 0.1)', border: '1px solid rgba(255, 200, 100, 0.3)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📚</span>
                      <span>Recommended Topics to Study:</span>
                    </div>
                    <div style={{ fontSize: '0.9em', marginBottom: 8, lineHeight: 1.6 }}>
                      {score.analytics.suggestedTopics.map((topic, idx) => (
                        <span key={idx} style={{ 
                          display: 'inline-block',
                          background: 'rgba(255, 200, 100, 0.2)', 
                          padding: '4px 12px', 
                          borderRadius: 16, 
                          margin: '4px',
                          fontSize: '0.9em',
                          border: '1px solid rgba(255, 200, 100, 0.4)'
                        }}>
                          {topic}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.8em', color: 'var(--muted)', fontStyle: 'italic' }}>
                      💡 Based on your performance, we recommend reviewing these topics from your PDF
                    </div>
                  </div>
                )}
                
                {/* Perfect Score Congratulations */}
                {score.score === score.total && (
                  <div style={{ marginTop: 16, padding: 24, background: 'linear-gradient(135deg, rgba(110, 231, 183, 0.2) 0%, rgba(124, 156, 255, 0.2) 100%)', border: '2px solid rgba(110, 231, 183, 0.5)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '3em', marginBottom: 12 }}>
                      🎉
                    </div>
                    <div style={{ fontSize: '1.3em', fontWeight: 700, marginBottom: 8, color: '#6ee7b7' }}>
                      Perfect Score! Outstanding!
                    </div>
                    <div style={{ fontSize: '0.95em', color: 'var(--text)', lineHeight: 1.6 }}>
                      You've mastered all the topics in this quiz. Excellent work! 🌟
                    </div>
                  </div>
                )}
                
                {/* Clear Quiz Button (bottom) - Note: Another Clear button appears at top with Generate */}
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Clear quiz state
                      setQuiz(null);
                      setScore(null);
                      setAnswers({});
                      setSubmittedAnswers(null);
                      setIsTimedQuiz(false);
                      setTimeRemaining(null);
                      setQuizStartTime(null);
                      
                      // Clear active quiz from sessionStorage
                      if (selected) {
                        sessionStorage.removeItem(`activeQuiz_${selected}`);
                      }
                      
                      // Reload attempt history
                      if (loadAttemptHistory) {
                        loadAttemptHistory();
                      }
                      
                      setToast({ message: 'Quiz cleared! Ready to generate a new quiz.', type: 'success' });
                    }}
                    style={{
                      padding: '12px 32px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '1em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                    }}
                  >
                    <span>🗑️</span>
                    <span>Clear Quiz</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
