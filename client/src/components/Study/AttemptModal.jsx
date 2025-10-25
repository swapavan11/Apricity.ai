import React, { useState, useEffect } from 'react';

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
    if (!seconds) return 'N/A';
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
            maxWidth: 900,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid var(--accent)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div style={{ 
          padding: 24, 
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          background: 'var(--panel)',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📝</span>
                <span>Quiz Attempt Details</span>
              </h2>
              {attempt.createdAt && (
                <div style={{ fontSize: '0.9em', color: 'var(--muted)', marginTop: 8 }}>
                  {formatDate(attempt.createdAt)}
                </div>
              )}
            </div>
            <button 
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5em',
                cursor: 'pointer',
                color: 'var(--muted)',
                padding: 0,
                width: 32,
                height: 32
              }}
            >
              ×
            </button>
          </div>

          {/* Score Summary */}
          <div style={{ 
            marginTop: 16, 
            padding: 16, 
            background: 'rgba(124, 156, 255, 0.1)', 
            borderRadius: 8,
            border: '1px solid var(--accent)'
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
              
              {attempt.timeTaken !== undefined && (
                <div>
                  <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>Time Taken</div>
                  <div style={{ fontSize: '1.2em', fontWeight: 600 }}>
                    {formatTime(attempt.timeTaken)}
                  </div>
                  {attempt.timeLimit && (
                    <div style={{ fontSize: '0.85em', color: 'var(--muted)' }}>
                      Limit: {formatTime(attempt.timeLimit)}
                    </div>
                  )}
                </div>
              )}
              
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

          {/* Action Buttons */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            {onRetake && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Show "Coming Soon" message
                  setShowRetakePrompt(true);
                }}
                style={{
                  padding: '10px 20px',
                  background: hasActiveQuiz ? '#ffa500' : 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span>{hasActiveQuiz ? '▶️' : '🔄'}</span>
                <span>{hasActiveQuiz ? 'Continue Quiz' : 'Retake Quiz'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Questions List */}
        <div style={{ padding: 24 }}>
          {attempt.questionResults && attempt.questionResults.length > 0 ? (
            attempt.questionResults.map((q, idx) => {
              const isCorrect = q.correct;
              const isPartial = q.partial;
              const statusColor = isCorrect ? '#6ee7b7' : isPartial ? '#ffa500' : '#ff7c7c';
              const statusText = isCorrect ? 'Correct' : isPartial ? 'Partial' : 'Incorrect';
              
              return (
                <div 
                  key={q.questionId || idx}
                  style={{
                    marginBottom: 24,
                    padding: 16,
                    background: 'var(--input-bg)',
                    borderRadius: 8,
                    border: `2px solid ${statusColor}20`
                  }}
                >
                  {/* Question Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05em', marginBottom: 8 }}>
                        Q{idx + 1}. [{q.type}] {q.question}
                      </div>
                      {q.page && (
                        <div style={{ fontSize: '0.8em', color: 'var(--muted)' }}>
                          📄 Page {q.page}
                        </div>
                      )}
                    </div>
                    <div style={{ 
                      marginLeft: 16,
                      padding: '4px 12px',
                      background: statusColor + '20',
                      color: statusColor,
                      borderRadius: 16,
                      fontSize: '0.85em',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {statusText}
                    </div>
                  </div>

                  {/* MCQ Options */}
                  {q.type === 'MCQ' && q.options && (
                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                      {q.options.map((option, oidx) => {
                        const isUserAnswer = q.userAnswer === option;
                        const isCorrectAnswer = q.correctAnswer === option;
                        
                        return (
                          <div 
                            key={oidx}
                            style={{
                              padding: '8px 12px',
                              marginBottom: 6,
                              borderRadius: 6,
                              background: isCorrectAnswer ? '#6ee7b720' : isUserAnswer ? '#ff7c7c20' : 'transparent',
                              border: `1px solid ${isCorrectAnswer ? '#6ee7b7' : isUserAnswer ? '#ff7c7c' : 'var(--border)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8
                            }}
                          >
                            {isCorrectAnswer && <span style={{ color: '#6ee7b7' }}>✓</span>}
                            {isUserAnswer && !isCorrectAnswer && <span style={{ color: '#ff7c7c' }}>✗</span>}
                            <span style={{ color: isCorrectAnswer ? '#6ee7b7' : isUserAnswer ? '#ff7c7c' : 'var(--text)' }}>
                              {option}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Answers */}
                  {(q.type === 'SAQ' || q.type === 'LAQ' || q.type === 'ONEWORD') && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.85em', color: 'var(--muted)', marginBottom: 4 }}>
                          Your Answer:
                        </div>
                        <div style={{ 
                          padding: 10, 
                          background: isCorrect ? '#6ee7b710' : '#ff7c7c10',
                          border: `1px solid ${statusColor}`,
                          borderRadius: 6,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {q.userAnswer || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No answer provided</span>}
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '0.85em', color: 'var(--muted)', marginBottom: 4 }}>
                          Correct Answer:
                        </div>
                        <div style={{ 
                          padding: 10, 
                          background: '#6ee7b710',
                          border: '1px solid #6ee7b7',
                          borderRadius: 6,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {q.correctAnswer}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Marks */}
                  {q.marksObtained !== undefined && q.totalMarks !== undefined && (
                    <div style={{ 
                      marginTop: 12, 
                      fontSize: '0.9em', 
                      color: statusColor,
                      fontWeight: 600 
                    }}>
                      Marks: {q.marksObtained} / {q.totalMarks}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 10, 
                      background: 'rgba(124, 156, 255, 0.05)', 
                      borderLeft: '3px solid var(--accent)',
                      borderRadius: 4,
                      fontSize: '0.9em',
                      color: 'var(--muted)'
                    }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
              No question details available
            </div>
          )}

          {/* Analytics Summary */}
          {attempt.strengths || attempt.weaknesses || attempt.suggestedTopics ? (
            <div style={{ 
              marginTop: 24, 
              padding: 20, 
              background: 'var(--input-bg)', 
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>Performance Analysis</h3>
              
              {attempt.strengths && attempt.strengths.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.9em', color: '#6ee7b7', fontWeight: 600, marginBottom: 6 }}>
                    ✓ Strengths:
                  </div>
                  <div style={{ fontSize: '0.9em' }}>
                    {attempt.strengths.join(', ')}
                  </div>
                </div>
              )}
              
              {attempt.weaknesses && attempt.weaknesses.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.9em', color: '#ff7c7c', fontWeight: 600, marginBottom: 6 }}>
                    ⚠ Focus Areas:
                  </div>
                  <div style={{ fontSize: '0.9em' }}>
                    {attempt.weaknesses.join(', ')}
                  </div>
                </div>
              )}
              
              {attempt.suggestedTopics && attempt.suggestedTopics.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.9em', color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>
                    📚 Recommended Topics to Study:
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
                          fontSize: '0.85em'
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
        
        {/* Retake Prompt Modal - moved outside to avoid z-index issues */}
        {showRetakePrompt && (
          <div
            onMouseEnter={() => console.log('Retake modal is visible')} 
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
    </div>
    </>
  );
}
