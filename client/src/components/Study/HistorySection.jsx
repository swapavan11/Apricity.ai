import React, { useState } from "react";
import Loader from "../common/Loader";
import AttemptModal from "./AttemptModal";

export default function HistorySection({ selected, attemptHistory, loadingAttemptHistory }) {
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  
  if (loadingAttemptHistory) return <Loader text="Loading attempt history..." />;

  if (!attemptHistory)
    return (
      <div style={{ textAlign: "center", color: "var(--muted)", marginTop: "40px" }}>
        No attempt history available.
      </div>
    );

  return (
    <div style={{ 
      height: '100vh', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--panel)'
    }}>
      {/* Header Ribbon */}
      <div style={{ 
        padding: '18px 28px', 
        background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.12) 0%, rgba(124, 156, 255, 0.04) 100%)',
        borderBottom: '2px solid var(--accent)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        {!selected ? (
          /* Non-PDF General Mode */
          <div style={{
            fontSize: '1.2em',
            fontWeight: 700,
            color: 'var(--accent)',
            textAlign: 'center'
          }}>
            📝 Non-PDF General Quiz Performance
          </div>
        ) : (
          /* PDF Selected Mode */
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '1.15em',
              fontWeight: 700,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <span style={{ fontSize: '1.2em' }}>📚</span>
              <span>{attemptHistory?.title || 'Loading...'}</span>
              <span style={{
                fontSize: '0.75em',
                fontWeight: 600,
                color: 'var(--muted)',
                marginLeft: 8
              }}>
                • Quiz Performance
              </span>
            </div>
            {attemptHistory?.attempts?.length > 0 && (
              <div style={{ 
                padding: '8px 16px',
                background: 'rgba(124, 156, 255, 0.2)',
                borderRadius: 20,
                border: '2px solid var(--accent)',
                fontSize: '0.9em',
                fontWeight: 700,
                color: 'var(--accent)'
              }}>
                {attemptHistory.attempts.length} Attempt{attemptHistory.attempts.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
      className="hide-scrollbar">
        {!selected ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '120px 40px',
            color: 'var(--muted)'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>📄</div>
            <div style={{ fontSize: '1.3em', fontWeight: 600, marginBottom: 12 }}>Upload to Learn & Gain Insights</div>
            <div style={{ fontSize: '0.95em', lineHeight: 1.8, maxWidth: 500, margin: '0 auto' }}>
              Upload a PDF and take quizzes to track your performance on specific documents. 
              Your progress will be displayed here.
            </div>
          </div>
        ) : attemptHistory.attempts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '120px 40px',
            color: 'var(--muted)'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>📝</div>
            <div style={{ fontSize: '1.3em', fontWeight: 600, marginBottom: 12 }}>No Quiz Attempts for This PDF</div>
            <div style={{ fontSize: '0.95em', lineHeight: 1.8 }}>
              Take a quiz on this PDF to see your performance history here
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '16px'
          }}>
            {attemptHistory.attempts.map((a, i) => {
              const totalAttempts = attemptHistory.attempts.length;
              const displayNumber = totalAttempts - i; // Latest attempt gets highest number
              return (
              <div
                key={a.id || i}
                style={{
                  background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.08) 0%, rgba(124, 156, 255, 0.03) 100%)',
                  border: '2px solid rgba(124, 156, 255, 0.3)',
                  borderRadius: 12,
                  padding: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(124, 156, 255, 0.2)'
                }}
                onClick={() => setSelectedAttempt(a)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 156, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 156, 255, 0.2)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05em' }}>
                    Attempt #{displayNumber}
                </div>
                <div style={{
                  background: a.overallAccuracy >= 0.8 ? '#6ee7b7' : a.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c',
                  color: '#000',
                  padding: '4px 10px',
                  borderRadius: 14,
                  fontSize: '0.85em',
                  fontWeight: 700
                }}>
                  {Math.round(a.overallAccuracy * 100)}%
                </div>
              </div>

              <div style={{ fontSize: '0.8em', color: 'var(--muted)', marginBottom: 12 }}>
                {new Date(a.createdAt).toLocaleString()}
              </div>

              <div style={{ 
                display: 'flex', 
                gap: 12,
                marginBottom: 12,
                marginTop: 12
              }}>
                <div style={{ 
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px',
                  background: 'rgba(124, 156, 255, 0.15)',
                  borderRadius: 8,
                  border: '1px solid rgba(124, 156, 255, 0.3)'
                }}>
                  <div style={{ fontSize: '1.4em', fontWeight: 700, color: 'var(--accent)' }}>
                    {a.score}/{a.total}
                  </div>
                  <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: 4 }}>Score</div>
                </div>
                <div style={{ 
                  flex: 1,
                  textAlign: 'center',
                  padding: '12px',
                  background: 'rgba(124, 156, 255, 0.15)',
                  borderRadius: 8,
                  border: '1px solid rgba(124, 156, 255, 0.3)'
                }}>
                  <div style={{ fontSize: '1.1em', fontWeight: 700, color: 'var(--accent2)' }}>
                    {a.quizType}
                  </div>
                  <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: 4 }}>Type</div>
                </div>
              </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAttempt(a);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.85em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 8,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span>📝</span>
                  <span>View Full Quiz & Analysis</span>
                </button>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Attempt Detail Modal */}
      {selectedAttempt && (
        <AttemptModal
          attempt={selectedAttempt}
          documentId={selected}
          onClose={() => setSelectedAttempt(null)}
          onRetake={(options) => {
            if (options.continue) {
              setSelectedAttempt(null);
              return;
            }
            
            window.dispatchEvent(new CustomEvent('retakeQuiz', { 
              detail: {
                quizParams: selectedAttempt.quizParams,
                withTimer: options.withTimer,
                timeLimit: options.timeLimit
              }
            }));
            setSelectedAttempt(null);
          }}
        />
      )}
    </div>
  );
}
