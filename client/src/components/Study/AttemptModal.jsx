import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function AttemptModal({ attempt, onClose, onRetake, documentId }) {
  const [showRetakePrompt, setShowRetakePrompt] = useState(false);
  const [retakeWithTimer, setRetakeWithTimer] = useState(false);
  const [retakeTimeLimit, setRetakeTimeLimit] = useState(30);
  const [hasActiveQuiz, setHasActiveQuiz] = useState(false);
  const [activeQuizTime, setActiveQuizTime] = useState(null);
  
  useEffect(() => {
    // Check if there's an active quiz for this document
    if (documentId) {
      const savedQuiz = sessionStorage.getItem(`activeQuiz_${documentId}`);
      if (savedQuiz) {
        try {
          const data = JSON.parse(savedQuiz);
          setHasActiveQuiz(true);
          if (data.isTimedQuiz && data.timeLimit) {
            const elapsed = Date.now() - (data.quizStartTime || 0);
            const remaining = (data.timeLimit * 60 * 1000) - elapsed;
            if (remaining > 0) {
              setActiveQuizTime({
                remaining: Math.floor(remaining / 1000),
                limit: data.timeLimit
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse active quiz:', e);
        }
      }
    }
  }, [documentId]);
  
  if (!attempt) return null;

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return 'Non-timed Quiz';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  };

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20,
          overflowY: 'auto'
        }}
        onClick={onClose}
      >
        <div 
          style={{
            background: 'var(--panel)',
            borderRadius: 12,
            maxWidth: '95vw',
            width: '100%',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid var(--accent)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header with Retake Button */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '2px solid var(--accent)',
          background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.15) 0%, rgba(124, 156, 255, 0.05) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.8em' }}>📝</span>
            <div>
              <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: '1.4em', fontWeight: 700 }}>
                Quiz Attempt Details
              </h2>
              {attempt.createdAt && (
                <div style={{ fontSize: '0.85em', color: 'var(--muted)', marginTop: 4 }}>
                  {formatDate(attempt.createdAt)}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onRetake && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowRetakePrompt(true);
                }}
                style={{
                  padding: '10px 20px',
                  background: hasActiveQuiz ? '#ffa500' : 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.95em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span>{hasActiveQuiz ? '▶️' : '🔄'}</span>
                <span>{hasActiveQuiz ? 'Retake Quiz' : 'Retake Quiz'}</span>
              </button>
            )}
            <button 
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid var(--border)',
                fontSize: '1.4em',
                cursor: 'pointer',
                color: 'var(--text)',
                padding: '6px 14px',
                borderRadius: 8,
                fontWeight: 700,
                transition: 'all 0.2s ease'
              }}
            >
              ×
            </button>
          </div>

        </div>


        {/* Main Content Area - 30-70 Split */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* LEFT PANEL - 30% - Details + Performance */}
          <div style={{ 
            width: '30%', 
            borderRight: '2px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Score Summary - Glowy Tile */}
            <div style={{ 
              padding: '20px',
              margin: '16px',
              background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.12) 0%, rgba(124, 156, 255, 0.05) 100%)',
              border: '2px solid var(--accent)',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(124, 156, 255, 0.3)'
            }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>Score</div>
                <div style={{ fontSize: '1.5em', fontWeight: 700, color: 'var(--accent)' }}>
                  {attempt.score} / {attempt.total}
                </div>
                <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>
                  {((attempt.score / attempt.total) * 100).toFixed(1)}%
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>Time Taken</div>
                <div style={{ fontSize: '1.2em', fontWeight: 600, color: 'var(--accent2)' }}>
                  {formatTime(attempt.timeTaken)}
                </div>
                {attempt.timeLimit && attempt.timeLimit > 0 && (
                  <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>
                    Limit: {formatTime(attempt.timeLimit)}
                  </div>
                )}
              </div>
              
              <div>
                <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>Accuracy</div>
                <div style={{ fontSize: '1.2em', fontWeight: 600, color: attempt.overallAccuracy >= 0.8 ? '#6ee7b7' : attempt.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c' }}>
                  {(attempt.overallAccuracy * 100).toFixed(0)}%
                </div>
              </div>
              
              {attempt.wasTimedOut && (
                <div>
                  <div style={{ fontSize: '0.85em', color: '#ff7c7c' }}>⏱️ Time Expired</div>
                  <div style={{ fontSize: '0.8em', color: 'var(--muted)' }}>Auto-submitted</div>
                </div>
              )}
            </div>
            </div>

            {/* Quiz Mode Information - Glowy Tile */}
            <div style={{ 
              padding: '16px',
              margin: '0 16px 16px 16px',
              background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.15) 0%, rgba(124, 156, 255, 0.08) 100%)',
              border: '2px solid var(--accent)',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(124, 156, 255, 0.3)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 14, color: 'var(--accent)', fontSize: '1.05em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                🎯 Quiz Mode
              </h3>
              
              {/* Mode Badge */}
              <div style={{ marginBottom: 14 }}>
                <span style={{
                  padding: '8px 16px',
                  background: 'var(--accent)',
                  color: 'white',
                  borderRadius: 12,
                  fontSize: '0.9em',
                  fontWeight: 700,
                  display: 'inline-block',
                  boxShadow: '0 2px 8px rgba(124, 156, 255, 0.4)'
                }}>
                  {/* 1st radio button - Default Mode (auto) */}
                  {(!attempt.quizParams?.mode || attempt.quizParams?.mode === 'auto') && '🎯 Default Mode'}
                  {/* 2nd radio button - PDF Parsed Topics Mode (select) */}
                  {attempt.quizParams?.mode === 'select' && '📚 PDF Parsed Topics'}
                  {/* 3rd radio button - Custom Instruction Mode (custom) */}
                  {attempt.quizParams?.mode === 'custom' && '✨ Custom Instruction Mode'}
                </span>
              </div>

              {/* Selected Topics for select mode (2nd radio - PDF parsed topics) */}
              {attempt.quizParams?.mode === 'select' && attempt.quizParams?.topics && attempt.quizParams.topics.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.85em', color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>
                    📚 Selected Topics:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {attempt.quizParams.topics.map((topic, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: 'rgba(110, 231, 183, 0.2)',
                        color: '#6ee7b7',
                        borderRadius: 8,
                        fontSize: '0.8em',
                        fontWeight: 600,
                        border: '2px solid rgba(110, 231, 183, 0.4)',
                        boxShadow: '0 2px 6px rgba(110, 231, 183, 0.2)'
                      }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Instruction for custom mode (3rd radio) */}
              {attempt.quizParams?.mode === 'custom' && attempt.quizParams?.instructions && (
                <div>
                  <div style={{ fontSize: '0.85em', color: 'var(--muted)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✨ User's Custom Instruction:
                  </div>
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 200, 100, 0.1)',
                    borderRadius: 10,
                    fontSize: '0.85em',
                    color: 'var(--text)',
                    lineHeight: 1.7,
                    border: '2px solid rgba(255, 200, 100, 0.4)',
                    boxShadow: '0 2px 8px rgba(255, 200, 100, 0.2)',
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>
                    "{attempt.quizParams.instructions}"
                  </div>
                </div>
              )}
            </div>

            {/* Performance Analysis Section - Bordered Box */}
            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              padding: '0 16px 16px 16px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            className="hide-scrollbar">
              {(attempt.strengths || attempt.weaknesses || attempt.suggestedTopics) && (
                <div style={{ 
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(110, 231, 183, 0.1) 0%, rgba(110, 231, 183, 0.05) 100%)',
                  border: '2px solid rgba(110, 231, 183, 0.4)',
                  borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(110, 231, 183, 0.3)'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: 16, color: 'var(--accent)', fontSize: '1.1em', fontWeight: 700 }}>
                    📊 Performance Analysis
                  </h3>
                  
                  {attempt.strengths && attempt.strengths.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.9em', color: '#6ee7b7', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✓</span> <span>Strengths:</span>
                      </div>
                      <div style={{ fontSize: '0.85em', lineHeight: 1.6, color: 'var(--muted)' }}>
                        {attempt.strengths.map((s, i) => (
                          <div key={i} style={{ marginBottom: 6, paddingLeft: 16 }}>• {s}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {attempt.weaknesses && attempt.weaknesses.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.9em', color: '#ff7c7c', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚠</span> <span>Focus Areas:</span>
                      </div>
                      <div style={{ fontSize: '0.85em', lineHeight: 1.6, color: 'var(--muted)' }}>
                        {attempt.weaknesses.map((w, i) => (
                          <div key={i} style={{ marginBottom: 6, paddingLeft: 16 }}>• {w}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {attempt.suggestedTopics && attempt.suggestedTopics.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.9em', color: 'var(--accent)', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📚</span> <span>Recommended Topics:</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {attempt.suggestedTopics.map((topic, idx) => (
                          <span 
                            key={idx}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(255, 200, 100, 0.2)',
                              border: '1px solid rgba(255, 200, 100, 0.4)',
                              borderRadius: 16,
                              fontSize: '0.8em',
                              fontWeight: 600
                            }}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - 70% - Questions */}
          <div style={{ 
            width: '70%', 
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Questions List */}
            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--accent) rgba(124, 156, 255, 0.1)'
            }}
            className="custom-scrollbar">
              <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(124, 156, 255, 0.05);
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: var(--accent);
                  border-radius: 10px;
                  transition: background 0.2s;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(124, 156, 255, 0.8);
                }
              `}</style>
              
              {attempt.questionResults && attempt.questionResults.length > 0 ? (
                attempt.questionResults.map((q, idx) => {
              const isCorrect = q.correct;
              const isPartial = q.partial;
              const statusColor = isCorrect ? 'var(--accent2)' : isPartial ? '#ffa500' : '#ff7c7c';
              const statusText = isCorrect ? 'Correct' : isPartial ? 'Partial' : 'Incorrect';
              
              return (
                <div 
                  key={q.questionId || idx}
                  style={{
                    marginBottom: 16,
                    padding: '14px 16px',
                    background: 'var(--input-bg)',
                    borderRadius: 8,
                    border: '1px solid var(--border)'
                  }}
                >
                  {/* Question Header - Slimmer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95em', color: 'var(--text)', lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--accent)', marginRight: 6 }}>Q{idx + 1}.</span>
                        <span style={{ 
                          background: 'rgba(124, 156, 255, 0.2)', 
                          padding: '2px 6px', 
                          borderRadius: 4, 
                          fontSize: '0.75em',
                          fontWeight: 600,
                          marginRight: 8,
                          color: 'var(--accent)'
                        }}>{q.type}</span>
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({node, ...props}) => <span {...props} />
                          }}
                        >
                          {q.question}
                        </ReactMarkdown>
                      </div>
                      {q.page && (
                        <div style={{ fontSize: '0.7em', color: 'var(--muted)', marginTop: 4 }}>
                          📄 Page {q.page}
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      marginLeft: 12,
                      padding: '3px 10px',
                      background: statusColor,
                      color: '#000',
                      borderRadius: 12,
                      fontSize: '0.75em',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      {statusText}
                    </div>
                  </div>

                  {/* MCQ Options */}
                  {q.type === 'MCQ' && q.options && (
                    <div style={{ marginTop: 10, marginBottom: 10 }}>
                      {q.options.map((option, oidx) => {
                        const isUserAnswer = q.userAnswer === option;
                        const isCorrectAnswer = q.correctAnswer === option;
                        
                        return (
                          <div 
                            key={oidx}
                            style={{
                              padding: '7px 12px',
                              marginBottom: 5,
                              borderRadius: 6,
                              background: isCorrectAnswer ? '#6ee7b720' : isUserAnswer ? '#ff7c7c20' : 'transparent',
                              border: `1.5px solid ${isCorrectAnswer ? '#6ee7b7' : isUserAnswer ? '#ff7c7c' : 'var(--border)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: '0.9em'
                            }}
                          >
                            {isCorrectAnswer && <span style={{ color: '#6ee7b7' }}>✓</span>}
                            {isUserAnswer && !isCorrectAnswer && <span style={{ color: '#ff7c7c' }}>✗</span>}
                            <span style={{ color: isCorrectAnswer ? '#6ee7b7' : isUserAnswer ? '#ff7c7c' : 'var(--text)' }}>
                              <ReactMarkdown 
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                  p: ({node, ...props}) => <span {...props} />
                                }}
                              >
                                {option}
                              </ReactMarkdown>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Answers */}
                  {(q.type === 'SAQ' || q.type === 'LAQ' || q.type === 'ONEWORD') && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.8em', color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>
                          Your Answer:
                        </div>
                        <div style={{ 
                          padding: '8px 12px', 
                          background: isCorrect ? '#6ee7b710' : '#ff7c7c10',
                          border: `1.5px solid ${statusColor}`,
                          borderRadius: 6,
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.9em',
                          lineHeight: 1.5
                        }}>
                          {q.userAnswer ? (
                            <ReactMarkdown 
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {q.userAnswer}
                            </ReactMarkdown>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No answer provided</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '0.8em', color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>
                          Correct Answer:
                        </div>
                        <div style={{ 
                          padding: '8px 12px', 
                          background: '#6ee7b710',
                          border: '1.5px solid #6ee7b7',
                          borderRadius: 6,
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.9em',
                          lineHeight: 1.5
                        }}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {q.correctAnswer}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Marks */}
                  {q.marksObtained !== undefined && q.totalMarks !== undefined && (
                    <div style={{ 
                      marginTop: 10, 
                      fontSize: '0.85em', 
                      color: statusColor,
                      fontWeight: 700,
                      background: `${statusColor}15`,
                      padding: '4px 8px',
                      borderRadius: 4,
                      display: 'inline-block'
                    }}>
                      Marks: {q.marksObtained} / {q.totalMarks}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div style={{ 
                      marginTop: 10, 
                      padding: '8px 12px', 
                      background: 'rgba(124, 156, 255, 0.08)', 
                      borderRadius: 4,
                      border: '1px solid rgba(124, 156, 255, 0.2)',
                      fontSize: '0.85em',
                      color: 'var(--muted)',
                      lineHeight: 1.5
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>💡 Explanation:</span>{" "}
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
                  )}
                </div>
              );
            })
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
                  <div style={{ fontSize: '3em', marginBottom: 16 }}>📝</div>
                  <div>No question details available</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        
      {/* Retake Prompt Modal */}
      {showRetakePrompt && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3000
            }}
            onClick={() => setShowRetakePrompt(false)}
          >
            <div 
              style={{
                background: 'var(--panel)',
                padding: 24,
                borderRadius: 12,
                maxWidth: 400,
                border: '2px solid var(--accent)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span>🚧</span>
                <span>Feature Under Development</span>
              </h3>
              
              <div style={{ 
                padding: 24,
                textAlign: 'center',
                background: 'rgba(124, 156, 255, 0.1)',
                borderRadius: 8,
                marginBottom: 20
              }}>
                <div style={{ fontSize: '3em', marginBottom: 16 }}>
                  🔄
                </div>
                <div style={{ fontSize: '1.1em', fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
                  Retake Quiz Feature Coming Soon!
                </div>
                <div style={{ fontSize: '0.9em', color: 'var(--muted)', lineHeight: 1.6 }}>
                  We're working hard to bring you the ability to retake quizzes with the same settings. 
                  This feature will be available in an upcoming update.
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowRetakePrompt(false);
                  }}
                  style={{
                    padding: '10px 24px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1em'
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
