import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AttemptModal from '../../components/Study/AttemptModal'

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState(null)
  
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('/api/progress', { headers });
      if (!response.ok) throw new Error('Failed to load progress data');
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'improving': return '📈'
      case 'declining': return '📉'
      case 'stable': return '➡️'
      default: return '❓'
    }
  }

  const getTrendColor = (trend) => {
    switch(trend) {
      case 'improving': return '#6ee7b7'
      case 'declining': return '#ff7c7c'
      case 'stable': return '#aab2d5'
      default: return '#aab2d5'
    }
  }

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 0.8) return '#6ee7b7'
    if (accuracy >= 0.6) return '#ffa500'
    return '#ff7c7c'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }}>
      {/* TOP RIBBON - PDF Performance with Search */}
      <div style={{ 
        padding: '16px 24px',
        background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.08) 0%, rgba(124, 156, 255, 0.02) 100%)',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.2em', 
          fontWeight: 700, 
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          letterSpacing: '0.5px'
        }}>
          📚 Individual PDF Performance
        </h2>
        
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <input 
            type="text"
            placeholder="Search PDFs..."
            style={{
              padding:'8px 16px',
              background:'var(--input-bg)',
              border:'1px solid var(--border)',
              borderRadius:8,
              color:'var(--text)',
              fontSize:'0.9em',
              width:'250px'
            }}
          />
        </div>
      </div>

      {/* MAIN CONTENT - Split 25-75 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT PANEL - 25% */}
        <div style={{ 
          width: '25%',
          borderRight: '2px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Progress Dashboard Header with Refresh */}
          <div style={{
            padding: '16px 16px 12px 16px',
            background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.12) 0%, rgba(124, 156, 255, 0.05) 100%)',
            borderBottom: '2px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.1em', 
              fontWeight: 900, 
              color: 'var(--accent)',
              letterSpacing: '0.5px'
            }}>
              📊 PROGRESS DASHBOARD
            </h1>
            {lastRefresh && (
              <button 
                className="secondary" 
                onClick={loadData}
                disabled={loading}
                title="Refresh all data"
                style={{ 
                  padding: '6px 10px', 
                  fontSize: '0.75em', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  minWidth: 'auto'
                }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                🔄
              </button>
            )}
          </div>
          {/* Stats Section */}
          {!loading && data?.generalQuizStats && (
            <div style={{ 
              padding: '16px 16px 12px 16px',
              borderBottom: '1px solid var(--border)'
            }}>
              <p style={{ 
                margin: '0 0 12px 0', 
                fontSize: '0.85em', 
                color: 'var(--muted)',
                fontWeight: 600,
                textAlign: 'center'
              }}>
                General Quizzes (Non-PDF Mode)
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '10px'
              }}>
                <div style={{ 
                  padding: '10px', 
                  background: 'rgba(124, 156, 255, 0.15)', 
                  borderRadius: 8,
                  border: '1px solid rgba(124, 156, 255, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginBottom: 4 }}>Total Attempts</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 700, color: 'var(--accent)' }}>{data.generalQuizStats.totalAttempts}</div>
                </div>
                <div style={{ 
                  padding: '10px', 
                  background: 'rgba(110, 231, 183, 0.15)', 
                  borderRadius: 8,
                  border: '1px solid rgba(110, 231, 183, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginBottom: 4 }}>Avg Accuracy</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 700, color: '#6ee7b7' }}>{(data.generalQuizStats.avgAccuracy*100).toFixed(1)}%</div>
                </div>
                <div style={{ 
                  padding: '10px', 
                  background: 'rgba(255, 200, 100, 0.15)', 
                  borderRadius: 8,
                  border: '1px solid rgba(255, 200, 100, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginBottom: 4 }}>Total Questions</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 700, color: '#ffc864' }}>{data.generalQuizStats.totalQuestions}</div>
                </div>
                <div style={{ 
                  padding: '10px', 
                  background: 'rgba(110, 231, 183, 0.2)', 
                  borderRadius: 8,
                  border: '1px solid rgba(110, 231, 183, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75em', color: 'var(--muted)', marginBottom: 4 }}>Correct Answers</div>
                  <div style={{ fontSize: '1.5em', fontWeight: 700, color: '#6ee7b7' }}>{data.generalQuizStats.totalCorrect}</div>
                </div>
              </div>
            </div>
          )}

          {/* Attempt History Section */}
          <div style={{
            padding: '12px 16px 8px 16px',
            background: 'rgba(124, 156, 255, 0.05)',
            borderBottom: '1px solid var(--border)'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '0.9em',
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.5px'
            }}>
              📋 ATTEMPT HISTORY
            </h3>
          </div>
          
          {/* General Quiz Attempts List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className="hide-scrollbar">
            {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '1em', marginBottom: 8 }}>Loading analytics...</div>
              <div style={{ fontSize: '0.85em' }}>Please wait...</div>
            </div>
          )}
          
          {error && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ff7c7c' }}>
              <div style={{ fontSize: '1.1em', marginBottom: 8 }}>⚠️ Error</div>
              <div style={{ fontSize: '0.9em', marginBottom: 16 }}>{error}</div>
              <button 
                className="secondary" 
                onClick={() => window.location.reload()}
                style={{ padding: '10px 20px', fontSize: '0.9em' }}
              >
                Retry
              </button>
            </div>
          )}
          
          {!loading && !error && data?.generalQuizStats?.recentAttempts && data.generalQuizStats.recentAttempts.length > 0 && (
            <div>
              {data.generalQuizStats.recentAttempts.map((attempt, idx) => {
                const totalAttempts = data.generalQuizStats.recentAttempts.length;
                const displayNumber = totalAttempts - idx; // Latest attempt gets highest number
                return (
                <div 
                  key={attempt.id || idx}
                  style={{
                    background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.08) 0%, rgba(124, 156, 255, 0.03) 100%)',
                    border: '2px solid rgba(124, 156, 255, 0.3)',
                    borderRadius: 10,
                    padding: '14px',
                    marginBottom: 12,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(124, 156, 255, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 156, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 156, 255, 0.2)';
                  }}
                  onClick={() => {
                    setSelectedAttempt(attempt);
                    setSelectedDocumentId(null);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95em' }}>
                      Attempt #{displayNumber}
                    </div>
                    <div style={{
                      background: attempt.overallAccuracy >= 0.8 ? '#6ee7b7' : attempt.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c',
                      color: '#000',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: '0.75em',
                      fontWeight: 700
                    }}>
                      {Math.round(attempt.overallAccuracy * 100)}%
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.7em', color: 'var(--muted)', marginBottom: 8 }}>
                    {new Date(attempt.createdAt).toLocaleString()}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-around',
                    padding: '8px 0',
                    borderTop: '1px solid var(--border)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1em', fontWeight: 600, color: 'var(--accent)' }}>
                        {attempt.score}/{attempt.total}
                      </div>
                      <div style={{ fontSize: '0.7em', color: 'var(--muted)' }}>Score</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1em', fontWeight: 600, color: 'var(--accent2)' }}>
                        {attempt.quizType || 'Mixed'}
                      </div>
                      <div style={{ fontSize: '0.7em', color: 'var(--muted)' }}>Type</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAttempt(attempt);
                      setSelectedDocumentId(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.75em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 8
                    }}
                  >
                    <span>📝</span>
                    <span>Show Details</span>
                  </button>
                </div>
              );
              })}
            </div>
          )}
          
          {!loading && !error && (!data?.generalQuizStats || !data.generalQuizStats.recentAttempts || data.generalQuizStats.recentAttempts.length === 0) && (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📝</div>
              <div style={{ fontSize: '1.1em', fontWeight: 600, marginBottom: 8 }}>No General Quiz Attempts Yet</div>
              <div style={{ fontSize: '0.85em', lineHeight: 1.5 }}>
                Take a quiz in general mode to see your history here
              </div>
            </div>
          )}
        </div>
        </div>
        
        {/* RIGHT PANEL - 75% - Split into Middle Content (55%) and PDF Tiles (20%) */}
        <div style={{ 
          width: '75%',
          display: 'flex',
          overflow: 'hidden'
        }}>

        {/* MIDDLE CONTENT AREA - 73.33% of right panel (55% of total) */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        className="hide-scrollbar">
          {!selectedDoc ? (
            <div style={{textAlign:'center', padding:'100px 40px', color:'var(--muted)'}}>              <div style={{fontSize:'100px', marginBottom:'24px'}}>📊</div>
              <div style={{fontSize:'1.4em', fontWeight:700, marginBottom:'12px'}}>Select a PDF</div>
              <div style={{fontSize:'1em', lineHeight:1.8}}>Click on a PDF tile on the right to view detailed performance analytics</div>
            </div>
          ) : (() => {
            const s = data.summary.find(doc => doc.documentId === selectedDoc);
            if (!s) return null;
            
            return (
              <div>
                {/* Title Section */}
                <div style={{marginBottom:20, paddingBottom:16, borderBottom:'2px solid var(--accent)'}}>
                  <h2 style={{margin:0, fontSize:'1.6em', fontWeight:700, color:'var(--accent)', display:'flex', alignItems:'center', gap:12}}>
                    📚 {s.title}
                  </h2>
                </div>

                {/* Overview Stats with Gauge */}
                <div style={{display:'grid', gridTemplateColumns:'200px 1fr', gap:24, marginBottom:24, padding:20, background:'rgba(124, 156, 255, 0.08)', borderRadius:12, border:'2px solid var(--accent)'}}>
                  {/* Large Gauge Meter */}
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                    <div style={{position:'relative', width:'160px', height:'160px'}}>
                      <svg viewBox="0 0 100 100" style={{transform:'rotate(-90deg)'}}>
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124, 156, 255, 0.2)" strokeWidth="8"/>
                        <circle cx="50" cy="50" r="40" fill="none" stroke={getAccuracyColor(s.accuracy)} strokeWidth="8" strokeDasharray={`${s.accuracy * 251.2} 251.2`} strokeLinecap="round" style={{transition:'stroke-dasharray 0.5s ease'}}/>
                      </svg>
                      <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center'}}>
                        <div style={{fontSize:'2em', fontWeight:900, color:getAccuracyColor(s.accuracy)}}>
                          {(s.accuracy*100).toFixed(0)}%
                        </div>
                        <div style={{fontSize:'0.7em', color:'var(--muted)', marginTop:4}}>Overall</div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16}}>
                    <div style={{textAlign:'center', padding:16, background:'rgba(124, 156, 255, 0.1)', borderRadius:10, border:'1px solid rgba(124, 156, 255, 0.3)'}}>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:6}}>Total Quizzes</div>
                      <div style={{fontSize:'2em', fontWeight:700, color:'var(--accent)'}}>{s.totalAttempts}</div>
                    </div>
                    <div style={{textAlign:'center', padding:16, background:'rgba(110, 231, 183, 0.1)', borderRadius:10, border:'1px solid rgba(110, 231, 183, 0.3)'}}>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:6}}>Recent Accuracy</div>
                      <div style={{fontSize:'2em', fontWeight:700, color:getAccuracyColor(s.recentAccuracy)}}>
                        {(s.recentAccuracy*100).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{textAlign:'center', padding:16, background:'rgba(255, 200, 100, 0.1)', borderRadius:10, border:'1px solid rgba(255, 200, 100, 0.3)'}}>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:6}}>Trend</div>
                      <div style={{fontSize:'1.6em', fontWeight:700, color:getTrendColor(s.trends?.trend)}}>
                        {getTrendIcon(s.trends?.trend)} {s.trends?.trend || 'N/A'}
                      </div>
                    </div>
                    <div style={{textAlign:'center', padding:16, background:'rgba(124, 156, 255, 0.1)', borderRadius:10, border:'1px solid rgba(124, 156, 255, 0.3)'}}>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:6}}>Last Quiz</div>
                      <div style={{fontSize:'0.9em', fontWeight:600, color:'var(--text)'}}>
                        {s.attempts?.[0]?.createdAt ? new Date(s.attempts[0].createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Type Performance */}
                <div style={{marginBottom:24}}>
                  <h3 style={{fontSize:'1.1em', fontWeight:700, color:'var(--accent)', marginBottom:12}}>Question Type Performance</h3>
                  <div style={{display:'flex', gap:12, padding:'16px', background:'rgba(110, 231, 183, 0.08)', borderRadius:10, border:'1px solid rgba(110, 231, 183, 0.2)', justifyContent:'space-around'}}>
                    <div style={{textAlign:'center', flex:1}}>
                      <div style={{fontSize:'0.75em', color:'var(--muted)', marginBottom:6}}>MCQ</div>
                      <div style={{fontSize:'1.4em', fontWeight:700, color:getAccuracyColor(s.performance?.mcqAccuracy)}}>
                        {(s.performance?.mcqAccuracy*100 || 0).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{width:'2px', background:'var(--border)'}} />
                    <div style={{textAlign:'center', flex:1}}>
                      <div style={{fontSize:'0.75em', color:'var(--muted)', marginBottom:6}}>ONEWORD</div>
                      <div style={{fontSize:'1.4em', fontWeight:700, color:getAccuracyColor(s.performance?.onewordAccuracy)}}>
                        {(s.performance?.onewordAccuracy*100 || 0).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{width:'2px', background:'var(--border)'}} />
                    <div style={{textAlign:'center', flex:1}}>
                      <div style={{fontSize:'0.75em', color:'var(--muted)', marginBottom:6}}>SAQ</div>
                      <div style={{fontSize:'1.4em', fontWeight:700, color:getAccuracyColor(s.performance?.saqAccuracy)}}>
                        {(s.performance?.saqAccuracy*100 || 0).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{width:'2px', background:'var(--border)'}} />
                    <div style={{textAlign:'center', flex:1}}>
                      <div style={{fontSize:'0.75em', color:'var(--muted)', marginBottom:6}}>LAQ</div>
                      <div style={{fontSize:'1.4em', fontWeight:700, color:getAccuracyColor(s.performance?.laqAccuracy)}}>
                        {(s.performance?.laqAccuracy*100 || 0).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Analysis - 3 Column Tiles */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:24}}>
                  {/* Strengths */}
                  <div style={{padding:16, background:'rgba(110, 231, 183, 0.08)', borderRadius:12, border:'2px solid rgba(110, 231, 183, 0.3)'}}>
                    <div style={{fontWeight:700, color:'#6ee7b7', marginBottom:12, fontSize:'1em', display:'flex', alignItems:'center', gap:8}}>
                      <span>✓</span> Strengths
                    </div>
                    {s.performance?.strengths?.length > 0 ? (
                      <div style={{fontSize:'0.85em'}}>
                        {s.performance.strengths.map((strength, i) => (
                          <div key={i} style={{marginBottom:6, padding:'6px 10px', background:'rgba(110, 231, 183, 0.1)', borderRadius:6, borderLeft:'3px solid #6ee7b7'}}>
                            {strength}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{color:'var(--muted)', fontSize:'0.8em', textAlign:'center', padding:'20px 0'}}>No strengths yet</div>
                    )}
                  </div>

                  {/* Areas to Focus */}
                  <div style={{padding:16, background:'rgba(255, 124, 124, 0.08)', borderRadius:12, border:'2px solid rgba(255, 124, 124, 0.3)'}}>
                    <div style={{fontWeight:700, color:'#ff7c7c', marginBottom:12, fontSize:'1em', display:'flex', alignItems:'center', gap:8}}>
                      <span>⚠</span> Areas to Focus
                    </div>
                    {s.performance?.weaknesses?.length > 0 ? (
                      <div style={{fontSize:'0.85em'}}>
                        {s.performance.weaknesses.map((weakness, i) => (
                          <div key={i} style={{marginBottom:6, padding:'6px 10px', background:'rgba(255, 124, 124, 0.1)', borderRadius:6, borderLeft:'3px solid #ff7c7c'}}>
                            {weakness}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{color:'var(--muted)', fontSize:'0.8em', textAlign:'center', padding:'20px 0'}}>No weaknesses</div>
                    )}
                  </div>

                  {/* Topic Performance */}
                  <div style={{padding:16, background:'rgba(124, 156, 255, 0.08)', borderRadius:12, border:'2px solid rgba(124, 156, 255, 0.3)'}}>
                    <div style={{fontWeight:700, color:'var(--accent)', marginBottom:12, fontSize:'1em', display:'flex', alignItems:'center', gap:8}}>
                      <span>📊</span> Topics
                    </div>
                    {s.performance?.topicPerformance?.length > 0 ? (
                      <div style={{fontSize:'0.8em'}}>
                        {s.performance.topicPerformance.slice(0, 5).map((topic, i) => (
                          <div key={i} style={{marginBottom:6, padding:'6px 10px', background:'rgba(124, 156, 255, 0.1)', borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={{fontSize:'0.85em'}}>{topic.name}</div>
                            <div style={{fontWeight:700, color:getAccuracyColor(topic.accuracy), fontSize:'0.9em'}}>
                              {(topic.accuracy*100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{color:'var(--muted)', fontSize:'0.8em', textAlign:'center', padding:'20px 0'}}>No topics</div>
                    )}
                  </div>
                </div>

                {/* Attempt History */}
                {s.attempts && s.attempts.length > 0 && (
                  <div>
                    <h3 style={{fontSize:'1.2em', fontWeight:700, color:'var(--accent)', marginBottom:16, display:'flex', alignItems:'center', gap:8}}>
                      📋 Attempt History
                    </h3>
                    <div style={{display:'grid', gap:'14px'}}>
                      {s.attempts.map((attempt, index) => (
                        <div key={attempt.id || index} style={{
                          background:'linear-gradient(135deg, rgba(124, 156, 255, 0.12) 0%, rgba(124, 156, 255, 0.05) 100%)', 
                          border:'2px solid rgba(124, 156, 255, 0.4)', 
                          borderRadius:12, 
                          padding:'18px', 
                          transition:'all 0.3s ease',
                          boxShadow:'0 2px 12px rgba(124, 156, 255, 0.2)'
                        }}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
                            <div>
                              <div style={{fontWeight:700, fontSize:'1.1em', color:'var(--text)'}}>Attempt #{s.attempts.length - index}</div>
                              <div style={{fontSize:'0.8em', color:'var(--muted)', marginTop:6}}>
                                {new Date(attempt.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div style={{
                              background: attempt.overallAccuracy >= 0.8 ? '#6ee7b7' : attempt.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c', 
                              color: '#000', 
                              padding:'8px 16px', 
                              borderRadius:10, 
                              fontSize:'1.1em', 
                              fontWeight:900,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}>
                              {Math.round(attempt.overallAccuracy * 100)}%
                            </div>
                          </div>
                          <div style={{display:'flex', gap:12, marginBottom:12}}>
                            <div style={{flex:1, textAlign:'center', padding:'12px', background:'rgba(124, 156, 255, 0.15)', borderRadius:8, border:'1px solid rgba(124, 156, 255, 0.3)'}}>
                              <div style={{fontSize:'1.4em', fontWeight:700, color:'var(--accent)'}}>{attempt.score}/{attempt.total}</div>
                              <div style={{fontSize:'0.75em', color:'var(--muted)', marginTop:4}}>Score</div>
                            </div>
                            <div style={{flex:1, textAlign:'center', padding:'12px', background:'rgba(124, 156, 255, 0.15)', borderRadius:8, border:'1px solid rgba(124, 156, 255, 0.3)'}}>
                              <div style={{fontSize:'1.1em', fontWeight:700, color:'var(--accent2)'}}>{attempt.quizType || 'Mixed'}</div>
                              <div style={{fontSize:'0.75em', color:'var(--muted)', marginTop:4}}>Type</div>
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedAttempt(attempt); setSelectedDocumentId(selectedDoc); }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              background: 'var(--accent)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.9em',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)' }
                          >
                            <span>📝</span>
                            <span>Show Details</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* RIGHT SIDEBAR - PDF TILES - 26.67% of right panel (20% of total) */}
        <div style={{
          width: '26.67%',
          borderLeft: '2px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(124, 156, 255, 0.05) 0%, var(--panel) 100%)',
          overflow: 'hidden'
        }}>
          {/* Sticky Header */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.15) 0%, rgba(124, 156, 255, 0.08) 100%)',
            padding: '16px 14px',
            borderBottom: '2px solid var(--accent)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{fontSize: '1em', fontWeight: 900, color: 'var(--accent)', textAlign: 'center', letterSpacing: '1px'}}>
              📚 PDF LIBRARY
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px 14px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--accent) rgba(124, 156, 255, 0.1)'
          }}>
            {!loading && !error && (!data?.summary || data.summary.length === 0) && (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--muted)'}}>                <div style={{fontSize:'3em', marginBottom:'16px'}}>📄</div>
                <div style={{fontSize:'0.85em', lineHeight:1.6}}>No PDFs yet</div>
              </div>
            )}
            
            {data?.summary?.map((s)=> (
              <div 
                key={s.documentId}
                onClick={()=>setSelectedDoc(selectedDoc === s.documentId ? null : s.documentId)}
                style={{
                  marginBottom:'16px',
                  padding:'16px 12px',
                  background: selectedDoc === s.documentId ? 'rgba(124, 156, 255, 0.2)' : 'rgba(124, 156, 255, 0.05)',
                  border: selectedDoc === s.documentId ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius:12,
                  cursor:'pointer',
                  transition:'all 0.2s ease',
                  boxShadow: selectedDoc === s.documentId ? '0 4px 16px rgba(124, 156, 255, 0.4)' : '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{fontSize:'0.85em', fontWeight:700, marginBottom:12, color:'var(--text)', textAlign:'center', lineHeight:1.3}}>
                  {s.title}
                </div>
                
                <div style={{position:'relative', width:'100px', height:'100px', margin:'0 auto 12px auto'}}>
                  <svg viewBox="0 0 100 100" style={{transform:'rotate(-90deg)'}}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124, 156, 255, 0.2)" strokeWidth="10"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke={getAccuracyColor(s.accuracy)} strokeWidth="10" strokeDasharray={`${s.accuracy * 251.2} 251.2`} strokeLinecap="round" style={{transition:'stroke-dasharray 0.5s ease'}}/>
                  </svg>
                  <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', fontSize:'1.4em', fontWeight:900, color:getAccuracyColor(s.accuracy)}}>
                    {(s.accuracy*100).toFixed(0)}%
                  </div>
                </div>
                
                <div style={{fontSize:'0.75em', color:'var(--muted)', textAlign:'center'}}>
                  {s.totalAttempts} quiz{s.totalAttempts !== 1 ? 'zes' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      
      {selectedAttempt && (
        <AttemptModal 
          attempt={selectedAttempt}
          documentId={selectedDocumentId}
          onClose={() => {
            setSelectedAttempt(null);
            setSelectedDocumentId(null);
          }}
          onRetake={(options) => {
            // Close modal first
            setSelectedAttempt(null);
            setSelectedDocumentId(null);
            
            // Handle retake from Dashboard
            if (options.continue) {
              // For continue, just navigate to study page
              setTimeout(() => navigate('/study'), 50);
              return;
            }
            
            // For retake, store quiz config and navigate
            if (selectedAttempt?.quizParams) {
              sessionStorage.setItem('retakeQuizParams', JSON.stringify({
                ...selectedAttempt.quizParams,
                withTimer: options.withTimer,
                timeLimit: options.timeLimit,
                documentId: selectedDocumentId
              }));
            }
            
            // Navigate to study page
            setTimeout(() => {
              navigate('/study');
              // Dispatch event after navigation starts
              window.dispatchEvent(new CustomEvent('retakeQuiz', { 
                detail: {
                  quizParams: selectedAttempt?.quizParams,
                  withTimer: options.withTimer,
                  timeLimit: options.timeLimit
                }
              }));
            }, 50);
          }}
        />
      )}
    </div>
  )
}


