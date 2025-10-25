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
    <div style={{
      width: '80%',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      height: '100vh',
      overflowY: 'auto'
    }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h1 style={{marginTop:0, fontSize:'2.5em', background:'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>
          Progress Dashboard
        </h1>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          {lastRefresh && (
            <div style={{fontSize:'0.9em', color:'var(--muted)'}}>
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          <button 
            className="secondary" 
            onClick={loadData}
            disabled={loading}
            style={{padding:'8px 16px', fontSize:'14px', display:'flex', alignItems:'center', gap:'6px'}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      {loading && (
        <div style={{textAlign:'center', padding:'40px', color:'var(--muted)'}}>
          <div style={{fontSize:'1.2em', marginBottom:8}}>Loading analytics...</div>
          <div style={{fontSize:'0.9em'}}>This may take a moment</div>
        </div>
      )}
      {error && (
        <div style={{textAlign:'center', padding:'40px', color:'#ff7c7c'}}>
          <div style={{fontSize:'1.1em', marginBottom:8}}>Error loading dashboard</div>
          <div style={{fontSize:'0.9em'}}>{error}</div>
          <button 
            className="secondary" 
            onClick={() => window.location.reload()}
            style={{marginTop:12}}
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && data && (
        <div>
          {/* General Quiz Stats Section */}
          {data.generalQuizStats && (
            <div className="section" style={{marginBottom:'24px', background:'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)', border:'2px solid var(--accent)', borderRadius:12}}>
              <div style={{padding:'20px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                  <div>
                    <div style={{fontWeight:700, fontSize:'1.3em', marginBottom:'4px', color:'var(--accent)', display:'flex', alignItems:'center', gap:'8px'}}>
                      <span>🌐</span>
                      <span>General Quizzes (Non-PDF)</span>
                    </div>
                    <div style={{fontSize:'0.9em', color:'var(--muted)'}}>
                      Quizzes taken without a specific PDF context
                    </div>
                  </div>
                </div>
                
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:16, marginBottom:16}}>
                  <div style={{textAlign:'center', padding:'12px', background:'rgba(0,0,0,0.2)', borderRadius:8}}>
                    <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:4}}>Total Attempts</div>
                    <div style={{fontSize:'1.5em', fontWeight:700, color:'var(--accent)'}}>{data.generalQuizStats.totalAttempts}</div>
                  </div>
                  <div style={{textAlign:'center', padding:'12px', background:'rgba(0,0,0,0.2)', borderRadius:8}}>
                    <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:4}}>Avg Accuracy</div>
                    <div style={{fontSize:'1.5em', fontWeight:700, color:getAccuracyColor(data.generalQuizStats.avgAccuracy)}}>
                      {(data.generalQuizStats.avgAccuracy*100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{textAlign:'center', padding:'12px', background:'rgba(0,0,0,0.2)', borderRadius:8}}>
                    <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:4}}>Total Questions</div>
                    <div style={{fontSize:'1.5em', fontWeight:700}}>{data.generalQuizStats.totalQuestions}</div>
                  </div>
                  <div style={{textAlign:'center', padding:'12px', background:'rgba(0,0,0,0.2)', borderRadius:8}}>
                    <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:4}}>Correct Answers</div>
                    <div style={{fontSize:'1.5em', fontWeight:700, color:'#6ee7b7'}}>{data.generalQuizStats.totalCorrect}</div>
                  </div>
                </div>
                
                {data.generalQuizStats.recentAttempts?.length > 0 && (
                  <div>
                    <div style={{fontWeight:600, fontSize:'1.05em', marginBottom:12, color:'var(--accent)'}}>Recent Attempts</div>
                    <div style={{display:'grid', gap:'10px'}}>
                      {data.generalQuizStats.recentAttempts.map((attempt, idx) => (
                        <div 
                          key={attempt.id || idx}
                          style={{
                            background:'#0d142c',
                            border:'1px solid #1a244d',
                            borderRadius:8,
                            padding:'12px 16px',
                            display:'flex',
                            justifyContent:'space-between',
                            alignItems:'center',
                            cursor:'pointer',
                            transition:'all 0.2s ease'
                          }}
                          onClick={() => {
                            setSelectedAttempt(attempt);
                            setSelectedDocumentId(null);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background='#151d3a'}
                          onMouseLeave={(e) => e.currentTarget.style.background='#0d142c'}
                        >
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600, marginBottom:4}}>
                              Attempt #{attempt.attemptNumber}
                            </div>
                            <div style={{fontSize:'0.85em', color:'var(--muted)'}}>
                              {new Date(attempt.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:12}}>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:'0.85em', color:'var(--muted)'}}>Score</div>
                              <div style={{fontWeight:600}}>{attempt.score}/{attempt.total}</div>
                            </div>
                            <div style={{
                              background: attempt.overallAccuracy >= 0.8 ? '#6ee7b7' : 
                                         attempt.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c',
                              color: '#000',
                              padding:'6px 12px',
                              borderRadius:'6px',
                              fontSize:'0.9em',
                              fontWeight:600
                            }}>
                              {Math.round(attempt.overallAccuracy * 100)}%
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAttempt(attempt);
                                setSelectedDocumentId(null);
                              }}
                              style={{
                                padding:'6px 12px',
                                background:'var(--accent)',
                                color:'white',
                                border:'none',
                                borderRadius:6,
                                cursor:'pointer',
                                fontSize:'0.85em',
                                fontWeight:600
                              }}
                            >
                              View Full Quiz
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {data.summary?.length===0 && !data.generalQuizStats && (
            <div className="section" style={{textAlign:'center', padding:'40px'}}>
              <div style={{fontSize:'48px', marginBottom:'16px'}}>📊</div>
              <div style={{fontSize:'1.2em', marginBottom:'8px'}}>No attempts yet</div>
              <div style={{color:'var(--muted)'}}>Take a quiz first to see your progress!</div>
            </div>
          )}
          {data.summary?.length > 0 && (
            <div style={{marginBottom:'20px', padding:'12px 16px', background:'#0d142c', borderRadius:8, border:'1px solid #1a244d'}}>
              <div style={{fontWeight:600, fontSize:'1.1em', marginBottom:'4px'}}>📚 Individual PDF Performance</div>
              <div style={{fontSize:'0.9em', color:'var(--muted)'}}>
                Each PDF below shows your performance separately. Click "Show Details" to view individual attempt history.
              </div>
            </div>
          )}
          {data.summary?.map((s)=> (
            <div key={s.documentId} className="section" style={{marginBottom:'20px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                <div>
                  <div style={{fontWeight:700, fontSize:'1.1em', marginBottom:'4px'}}>{s.title}</div>
                  <div style={{fontSize:'0.9em', color:'var(--muted)'}}>
                    {s.totalAttempts} attempt{s.totalAttempts !== 1 ? 's' : ''} • Last updated: {s.attempts?.[0]?.createdAt ? new Date(s.attempts[0].createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <button 
                  className="secondary" 
                  onClick={()=>setSelectedDoc(selectedDoc === s.documentId ? null : s.documentId)}
                  style={{fontSize:'0.9em', padding:'6px 12px'}}
                >
                  {selectedDoc === s.documentId ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              {/* Overview Stats */}
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:12, marginBottom:12}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.9em', color:'var(--muted)'}}>Total quizzes Attempted</div>
                  <div style={{fontSize:'1.2em', fontWeight:700}}>{s.totalAttempts}</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.9em', color:'var(--muted)'}}>Overall Accuracy</div>
                  <div style={{fontSize:'1.2em', fontWeight:700, color:getAccuracyColor(s.accuracy)}}>
                    {(s.accuracy*100).toFixed(1)}%
                  </div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.9em', color:'var(--muted)'}}>Recent Accuracy</div>
                  <div style={{fontSize:'1.2em', fontWeight:700, color:getAccuracyColor(s.recentAccuracy)}}>
                    {(s.recentAccuracy*100).toFixed(1)}%
                  </div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'0.9em', color:'var(--muted)'}}>Trend</div>
                  <div style={{fontSize:'1.2em', color:getTrendColor(s.trends?.trend)}}>
                    {getTrendIcon(s.trends?.trend)} {s.trends?.trend || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{marginBottom:12, height:12, background:'#0f1530', border:'1px solid #1f2b57', borderRadius:8, overflow:'hidden'}}>
                <div style={{
                  width:`${Math.min(100, s.accuracy*100)}%`, 
                  height:'100%', 
                  background:`linear-gradient(90deg, ${getAccuracyColor(s.accuracy)}, ${getAccuracyColor(s.accuracy)}aa)`, 
                  borderRadius:8,
                  transition:'width 0.3s ease'
                }} />
              </div>

              {/* Quick Stats */}
              <div style={{display:'flex', gap:16, marginBottom:12, flexWrap:'wrap'}}>
                <div style={{fontSize:'0.9em'}}>
                  <span style={{color:'var(--muted)'}}>MCQ:</span> 
                  <span style={{color:getAccuracyColor(s.performance?.mcqAccuracy), marginLeft:4}}>
                    {(s.performance?.mcqAccuracy*100 || 0).toFixed(0)}%
                  </span>
                </div>
                <div style={{fontSize:'0.9em'}}>
                  <span style={{color:'var(--muted)'}}>SAQ:</span> 
                  <span style={{color:getAccuracyColor(s.performance?.saqAccuracy), marginLeft:4}}>
                    {(s.performance?.saqAccuracy*100 || 0).toFixed(0)}%
                  </span>
                </div>
                <div style={{fontSize:'0.9em'}}>
                  <span style={{color:'var(--muted)'}}>LAQ:</span> 
                  <span style={{color:getAccuracyColor(s.performance?.laqAccuracy), marginLeft:4}}>
                    {(s.performance?.laqAccuracy*100 || 0).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Detailed View */}
              {selectedDoc === s.documentId && (
                <div style={{marginTop:16, padding:16, background:'#0b1024', borderRadius:8, border:'1px solid #1a244d'}}>
                  
                  {/* Strengths & Weaknesses */}
                  <div style={{marginBottom:16}}>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                      <div>
                        <div style={{fontWeight:700, color:'#6ee7b7', marginBottom:8}}>Strengths</div>
                        {s.performance?.strengths?.length > 0 ? (
                          <div style={{fontSize:'0.9em'}}>
                            {s.performance.strengths.map((strength, i) => (
                              <div key={i} style={{marginBottom:4, padding:'4px 8px', background:'#0d142c', borderRadius:4}}>
                                ✓ {strength}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{color:'var(--muted)', fontSize:'0.9em'}}>No strengths identified yet</div>
                        )}
                      </div>
                      <div>
                        <div style={{fontWeight:700, color:'#ff7c7c', marginBottom:8}}>Areas to Focus</div>
                        {s.performance?.weaknesses?.length > 0 ? (
                          <div style={{fontSize:'0.9em'}}>
                            {s.performance.weaknesses.map((weakness, i) => (
                              <div key={i} style={{marginBottom:4, padding:'4px 8px', background:'#0d142c', borderRadius:4}}>
                                ⚠ {weakness}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{color:'var(--muted)', fontSize:'0.9em'}}>No specific weaknesses identified</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Topic Performance */}
                  {s.performance?.topicPerformance?.length > 0 && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontWeight:700, marginBottom:8}}>Topic Performance</div>
                      <div style={{display:'grid', gap:8}}>
                        {s.performance.topicPerformance.slice(0, 5).map((topic, i) => (
                          <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#0d142c', borderRadius:6}}>
                            <div style={{fontSize:'0.9em'}}>{topic.name}</div>
                            <div style={{display:'flex', alignItems:'center', gap:8}}>
                              <div style={{fontSize:'0.9em', color:getAccuracyColor(topic.accuracy)}}>
                                {(topic.accuracy*100).toFixed(0)}%
                              </div>
                              <div style={{fontSize:'0.8em', color:'var(--muted)'}}>
                                ({topic.questionsCount} q)
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual Attempt History */}
                  {s.attempts && s.attempts.length > 0 && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontWeight:700, marginBottom:12, fontSize:'1.1em', color:'var(--accent)'}}>Attempt History</div>
                      <div style={{display:'grid', gap:'12px', maxHeight:'400px', overflowY:'auto'}}>
                        {s.attempts.map((attempt, index) => (
                          <div key={attempt.id || index} style={{
                            background:'#0d142c',
                            border:'1px solid #1a244d',
                            borderRadius:10,
                            padding:'16px',
                            transition:'all 0.2s ease'
                          }}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px'}}>
                              <div>
                                <div style={{fontWeight:600, marginBottom:'4px', fontSize:'1em'}}>
                                  Attempt #{attempt.attemptNumber || (s.attempts.length - index)}
                                </div>
                                <div style={{fontSize:'12px', color:'var(--muted)'}}>
                                  {new Date(attempt.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div style={{
                                background: attempt.overallAccuracy >= 0.8 ? '#6ee7b7' : 
                                           attempt.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c',
                                color: '#000',
                                padding:'4px 8px',
                                borderRadius:'6px',
                                fontSize:'12px',
                                fontWeight:600
                              }}>
                                {Math.round(attempt.overallAccuracy * 100)}%
                              </div>
                            </div>
                            
                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'12px', marginBottom:'12px'}}>
                              <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'20px', fontWeight:600, color:'var(--accent)'}}>
                                  {attempt.score}/{attempt.total}
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>Score</div>
                              </div>
                              <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'20px', fontWeight:600, color:'var(--accent2)'}}>
                                  {attempt.quizType || 'Mixed'}
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>Type</div>
                              </div>
                              {attempt.mcqAccuracy !== undefined && (
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'16px', fontWeight:600, color:getAccuracyColor(attempt.mcqAccuracy)}}>
                                    {Math.round(attempt.mcqAccuracy * 100)}%
                                  </div>
                                  <div style={{fontSize:'11px', color:'var(--muted)'}}>MCQ</div>
                                </div>
                              )}
                              {attempt.saqAccuracy !== undefined && (
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'16px', fontWeight:600, color:getAccuracyColor(attempt.saqAccuracy)}}>
                                    {Math.round(attempt.saqAccuracy * 100)}%
                                  </div>
                                  <div style={{fontSize:'11px', color:'var(--muted)'}}>SAQ</div>
                                </div>
                              )}
                              {attempt.laqAccuracy !== undefined && (
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'16px', fontWeight:600, color:getAccuracyColor(attempt.laqAccuracy)}}>
                                    {Math.round(attempt.laqAccuracy * 100)}%
                                  </div>
                                  <div style={{fontSize:'11px', color:'var(--muted)'}}>LAQ</div>
                                </div>
                              )}
                            </div>
                            
                            {attempt.strengths && attempt.strengths.length > 0 && (
                              <div style={{marginBottom:'8px'}}>
                                <div style={{fontSize:'12px', color:'var(--accent2)', marginBottom:'4px', fontWeight:600}}>
                                  Strengths:
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>
                                  {attempt.strengths.join(', ')}
                                </div>
                              </div>
                            )}
                            
                            {attempt.weaknesses && attempt.weaknesses.length > 0 && (
                              <div style={{marginBottom:'12px'}}>
                                <div style={{fontSize:'12px', color:'#ff7c7c', marginBottom:'4px', fontWeight:600}}>
                                  Areas to improve:
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>
                                  {attempt.weaknesses.join(', ')}
                                </div>
                              </div>
                            )}
                            
                            {/* View Quiz Button */}
                            <button
                              onClick={() => {
                                setSelectedAttempt(attempt);
                                setSelectedDocumentId(s.documentId);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 16px',
                                background: 'var(--accent)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.9em',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                              }}
                            >
                              <span>📝</span>
                              <span>View Full Quiz</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Attempt Detail Modal */}
      {selectedAttempt && (
        <AttemptModal 
          attempt={selectedAttempt}
          documentId={selectedDocumentId}
          onClose={() => {
            setSelectedAttempt(null);
            setSelectedDocumentId(null);
          }}
          onRetake={(options) => {
            // Handle retake from Dashboard
            if (options.continue) {
              // For continue, just navigate to study page
              navigate('/study');
            } else {
              // For retake, dispatch event and navigate
              window.dispatchEvent(new CustomEvent('retakeQuiz', { 
                detail: {
                  quizParams: selectedAttempt.quizParams,
                  withTimer: options.withTimer,
                  timeLimit: options.timeLimit
                }
              }));
              
              // Navigate to study page after short delay
              setTimeout(() => {
                navigate('/study');
              }, 100);
            }
            
            setSelectedAttempt(null);
            setSelectedDocumentId(null);
          }}
        />
      )}
    </div>
  )
}


