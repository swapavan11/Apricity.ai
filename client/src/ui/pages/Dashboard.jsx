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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Invalidate cache first to get fresh data
      await fetch('/api/progress/invalidate', { 
        method: 'POST',
        headers 
      });
      
      // Now fetch fresh data
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

  // Filter PDFs based on search query
  const filteredSummary = data?.summary?.filter(pdf => 
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', width: '100%' }}>
      {/* TOP RIBBON - 3 columns: 25% Progress, 55% PDF Performance, 20% Search */}
      <div style={{
        height: '54px',
        minHeight: '54px',
        maxHeight: '54px',
        width: '100%',
        background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.12) 0%, rgba(124, 156, 255, 0.05) 100%)',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        boxSizing: 'border-box',
        zIndex: 20
      }}>
        {/* 25% Progress Dashboard */}
        <div style={{
          width: '25%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '0 20px',
          boxSizing: 'border-box',
          borderRight: '2px solid var(--border)',
          height: '100%'
        }}>
          <h1 style={{
            margin: 0,
            padding: 0,
            fontSize: '1.3em',
            fontWeight: 900,
            color: 'var(--accent)',
            letterSpacing: '0.5px',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            📊 PROGRESS DASHBOARD
          </h1>
        </div>
        {/* 55% Individual PDF Performance + Refresh */}
        <div style={{
          width: '55%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          padding: '0 20px',
          boxSizing: 'border-box',
          height: '100%'
        }}>
          <span style={{
            fontSize: '1.3em',
            fontWeight: 700,
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            📚 Individual PDF Performance
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 6px' }}>
            {lastRefresh && (
              <div style={{
                fontSize: '0.85em',
                color: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <span style={{ fontWeight: 600 }}>Last refresh</span>
                <span>{lastRefresh.toLocaleTimeString()}</span>
              </div>
            )}
            {lastRefresh && (
              <button
                className="secondary"
                onClick={loadData}
                disabled={loading}
                title="Refresh all dashboard data"
                style={{
                  padding: '8px 18px',
                  fontSize: '1em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 8
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {loading ? 'Refreshing...' : 'Refresh All'}
              </button>
            )}
          </div>
        </div>
        {/* 20% Search PDFs */}
        <div style={{
          width: '20%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 13px',
          height: '100%',
          boxSizing: 'border-box',
          borderLeft: '2px solid var(--border)',
        }}>
          <div
            style={{
              width: '100%',
              maxWidth: 340,
              minWidth: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingLeft: 0,
              paddingRight: 0,
              background: searchFocused ? 'rgba(124, 156, 255, 0.2)' : 'var(--input-bg)',
              border: searchFocused ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: searchFocused ? '0 4px 16px rgba(124, 156, 255, 0.4)' : '0 1px 4px rgba(124,156,255,0.05)',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="text"
              placeholder="Search PDFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%',
                minWidth: 0,
                maxWidth: 312,
                padding: '6px 14px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: '0.95em',
              }}
            />
          </div>
        </div>
      </div>
      {/* MAIN CONTENT - Split 25-75 - Content below ribbon */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT PANEL - 25% */}
        <div style={{ 
          width: '25%',
          borderRight: '2px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Progress Dashboard Header */}
          {/* <div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.12) 0%, rgba(124, 156, 255, 0.05) 100%)',
            borderBottom: '2px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '1.3em', 
              fontWeight: 900, 
              color: 'var(--accent)',
              letterSpacing: '0.5px',
              textAlign: 'center'
            }}>
              📊 PROGRESS DASHBOARD
            </h1>
          </div> */}
          
          {/* General Quizzes Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(124, 156, 255, 0.15) 0%, rgba(124, 156, 255, 0.08) 100%)',
            padding: '12px 14px',
            borderBottom: '2px solid var(--accent)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{fontSize: '1em', fontWeight: 900, color: 'var(--accent)', textAlign: 'center', letterSpacing: '1px'}}>
              🎯 GENERAL QUIZZES - Non-PDF Mode
            </div>
            <div style={{fontSize: '0.7em', color: 'var(--muted)', textAlign: 'center', marginTop: 4}}>
              
            </div>
          </div>
          
          {/* Stats Section */}
          {!loading && data?.generalQuizStats && (
            <div style={{ 
              padding: '16px 16px 12px 16px',
              // borderBottom: '2px solid var(--border)',
              background: 'rgba(124, 156, 255, 0.03)'
            }}>
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
            paddingTop: '0px',
            paddingBottom:'0px',
            // background: 'rgba(124, 156, 255, 0.08)',
            
              background: 'rgba(124, 156, 255, 0.03)',
              // marginLeft:'15px',
            
            // borderBottom: '2px solid var(--accent)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1em',
              fontWeight: 900,
              color: 'var(--accent)',
              letterSpacing: '0.5px',
              // textAlign: 'center'
            }}>
              📋 Attempt History
            </h3>
            {/* Vertical Line */}
            <div style={{
              width: '100%',
              height: '2px',
              marginTop:'4px',
              
              background: 'var(--accent)',
              boxShadow: '0 0 8px rgba(124, 156, 255, 0.6)'
            }} />
          </div>
          
          {/* General Quiz Attempts List */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            paddingBottom:'96px',
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(124, 156, 255, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 156, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 156, 255, 0.2)';
                  }}
                  onClick={() => {
                    setSelectedAttempt(attempt);
                    setSelectedDocumentId(null);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85em' }}>
                      Attempt #{displayNumber}
                    </div>
                    <div style={{
                      background: attempt.overallAccuracy >= 0.8 ? '#6ee7b7' : attempt.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c',
                      color: '#000',
                      padding: '2px 6px',
                      borderRadius: 10,
                      fontSize: '0.7em',
                      fontWeight: 700
                    }}>
                      {Math.round(attempt.overallAccuracy * 100)}%
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.65em', color: 'var(--muted)', marginBottom: 6 }}>
                    {new Date(attempt.createdAt).toLocaleString()}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-around',
                    padding: '6px 0',
                    borderTop: '1px solid var(--border)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.95em', fontWeight: 600, color: 'var(--accent)' }}>
                        {attempt.score}/{attempt.total}
                      </div>
                      <div style={{ fontSize: '0.65em', color: 'var(--muted)' }}>Score</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.85em', fontWeight: 600, color: 'var(--accent2)' }}>
                        {attempt.quizType || 'Mixed'}
                      </div>
                      <div style={{ fontSize: '0.65em', color: 'var(--muted)' }}>Type</div>
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
                      padding: '6px 10px',
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.7em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 6,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span>📝</span>
                    <span>View Details</span>
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Individual PDF Performance Header */}
          
          
          {/* Scrollable Content */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--accent) rgba(124, 156, 255, 0.1)',
            paddingBottom: '140px'
          }}
          className="stylish-scrollbar">
          <style>{
            `.stylish-scrollbar::-webkit-scrollbar {
              width: 10px;
            }
            .stylish-scrollbar::-webkit-scrollbar-track {
              background: rgba(124, 156, 255, 0.05);
              border-radius: 10px;
            }
            .stylish-scrollbar::-webkit-scrollbar-thumb {
              background: var(--accent);
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(124, 156, 255, 0.8), 0 0 20px rgba(124, 156, 255, 0.4);
              transition: all 0.3s ease;
            }
            .stylish-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(124, 156, 255, 0.9);
              box-shadow: 0 0 15px rgba(124, 156, 255, 1), 0 0 30px rgba(124, 156, 255, 0.6);
            }`
          }</style>
          {!selectedDoc ? (
            <div style={{textAlign:'center', padding:'100px 40px', color:'var(--muted)'}}>              <div style={{fontSize:'100px', marginBottom:'24px'}}>📊</div>
              <div style={{fontSize:'1.4em', fontWeight:700, marginBottom:'12px'}}>Select a PDF</div>
              <div style={{fontSize:'1em', lineHeight:1.8}}>Click on a PDF tile on the right to view detailed performance analytics</div>
            </div>
          ) : (() => {
            const s = filteredSummary.find(doc => doc.documentId === selectedDoc);
            if (!s) return null;
            
            return (
              <div>
                {/* Title Section */}
                <div style={{marginBottom:20, paddingBottom:16, borderBottom:'2px solid var(--accent)'}}>
                  <div style={{
                    margin:0,
                    fontSize:'1.6em',
                    fontWeight:700,
                    color:'var(--accent)',
                    display:'flex',
                    alignItems:'center',
                    gap:12,
                    overflowX:'auto',
                    whiteSpace:'nowrap',
                    scrollbarWidth:'thin',
                    msOverflowStyle:'none',
                    maxWidth:'100%',
                  }}>
                    <span style={{flexShrink:0}}>📚</span>
                    <span style={{overflow:'hidden', textOverflow:'ellipsis', minWidth:0}}>{s.title}</span>
                  </div>
                </div>

                {/* Overview Stats with Gauge */}
                <div style={{display:'grid', gridTemplateColumns:'200px 1fr', gap:24, marginBottom:24, padding:20, background:'rgba(124, 156, 255, 0.08)', borderRadius:12, border:'2px solid var(--accent)'}}>
                  {/* Large Gauge Meter */}
                  <div style={{
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    background: 'linear-gradient(135deg, rgba(124,156,255,0.10) 0%, rgba(110,231,183,0.08) 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 6px 32px 0 rgba(124,156,255,0.18), 0 1.5px 8px 0 rgba(110,231,183,0.10)',
                    padding: 8,
                  }}>
                    <div style={{position:'relative', width:'160px', height:'160px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <svg viewBox="0 0 100 100" style={{transform:'rotate(-90deg)', filter:`drop-shadow(0 0 12px ${s.accuracy < 0.4 ? '#ff4d4f55' : s.accuracy < 0.7 ? '#ffc53d55' : '#52c41a55'})`}}>
                        <defs>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={s.accuracy < 0.4 ? '#fe1316ff' : s.accuracy < 0.7 ? '#ffc53d' : '#52c41a'} floodOpacity="0.5"/>
                          </filter>
                        </defs>
                        {/* Outer background ring */}
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124, 156, 255, 0.13)" strokeWidth="10"/>
                        {/* Progress arc with solid color and glow */}
                        <circle cx="50" cy="50" r="40" fill="none" stroke={s.accuracy < 0.4 ? '#fe1316ff' : s.accuracy < 0.7 ? '#ffc53d' : '#52c41a'} strokeWidth="10" strokeDasharray={`${s.accuracy * 251.2} 251.2`} strokeLinecap="round" style={{transition:'stroke-dasharray 0.7s cubic-bezier(.4,2,.6,1)'}} filter="url(#glow)"/>
                        {/* Large inner ring for depth, nearly matches outer with small gap */}
                        <circle cx="50" cy="50" r="37.5" fill="var(--surface, var(--input-bg))" stroke="rgba(124,156,255,0.10)" strokeWidth="2.5"/>
                      </svg>
                      <div style={{
                        position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', textAlign:'center',
                        background:'var(--surface, var(--input-bg))',
                        borderRadius:'50%',
                        boxShadow:'0 2px 12px 0 rgba(124,156,255,0.10)',
                        padding:'18px 0 10px 0',
                        width:'120px', height:'120px',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      }}>
                        <div style={{
                          fontSize:'2.3em', fontWeight:900,
                          color: s.accuracy < 0.4 ? '#fe1316ff' : s.accuracy < 0.7 ? '#ffc53d' : '#52c41a',
                          letterSpacing: '-2px',
                          lineHeight: 1.1,
                          textShadow:'0 2px 8px rgba(124,156,255,0.10)'
                        }}>
                          {(s.accuracy*100).toFixed(0)}%
                        </div>
                        <div style={{fontSize:'0.8em', color:'var(--muted)', marginTop:4, fontWeight:600, letterSpacing:'0.5px'}}>Overall</div>
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
                  <div style={{padding:16, background:'rgba(124, 156, 255, 0.08)', borderRadius:12, border:'2px solid rgba(124, 156, 255, 0.3)', maxHeight:'400px', overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'var(--accent) rgba(124, 156, 255, 0.1)'}}>
                    <div style={{fontWeight:700, color:'var(--accent)', marginBottom:12, fontSize:'1em', display:'flex', alignItems:'center', gap:8, position:'sticky', top:0, }}>
                      <span>📊</span> Topics ({s.performance?.topicPerformance?.length || 0})
                    </div>
                    {s.performance?.topicPerformance?.length > 0 ? (
                      <div style={{fontSize:'0.8em'}}>
                        {s.performance.topicPerformance.slice(0, 10).map((topic, i) => (
                          <div key={i} style={{marginBottom:6, padding:'6px 10px', background:'rgba(124, 156, 255, 0.1)', borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                            <div style={{fontSize:'0.85em', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={topic.name}>
                              {topic.name}
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:4, flexShrink:0}}>
                              <div style={{fontSize:'0.7em', color:'var(--muted)'}}>
                                ({topic.questionsCount}Q)
                              </div>
                              <div style={{fontWeight:700, color:getAccuracyColor(topic.accuracy), fontSize:'0.9em'}}>
                                {(topic.accuracy*100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        ))}
                        {s.performance.topicPerformance.length > 10 && (
                          <div style={{fontSize:'0.75em', color:'var(--muted)', textAlign:'center', marginTop:8, fontStyle:'italic'}}>
                            +{s.performance.topicPerformance.length - 10} more topics
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{color:'var(--muted)', fontSize:'0.8em', textAlign:'center', padding:'20px 0'}}>
                        <div style={{fontSize:'2em', marginBottom:8}}>📄</div>
                        <div>No topic data available</div>
                        <div style={{fontSize:'0.85em', marginTop:4}}>Take quizzes to see topic performance</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attempt History */}
                {s.attempts && s.attempts.length > 0 && (
                  <div>
                    <h3 style={{fontSize:'1.2em', fontWeight:700, color:'var(--accent)', marginBottom:16, display:'flex', alignItems:'center', gap:8}}>
                      📋 Attempt History
                    </h3>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                      {s.attempts.map((attempt, index) => (
                        <div key={attempt.id || index} style={{
                          background:'linear-gradient(135deg, rgba(124, 156, 255, 0.12) 0%, rgba(124, 156, 255, 0.05) 100%)', 
                          border:'2px solid rgba(124, 156, 255, 0.4)', 
                          borderRadius:12, 
                          padding:'12px', 
                          transition:'all 0.3s ease',
                          boxShadow:'0 2px 12px rgba(124, 156, 255, 0.2)',
                          cursor:'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.03)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 156, 255, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 12px rgba(124, 156, 255, 0.2)';
                        }}
                        onClick={() => { setSelectedAttempt(attempt); setSelectedDocumentId(selectedDoc); }}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                            <div>
                              <div style={{fontWeight:700, fontSize:'0.85em', color:'var(--text)'}}>Attempt #{s.attempts.length - index}</div>
                              <div style={{fontSize:'0.65em', color:'var(--muted)', marginTop:4}}>
                                {new Date(attempt.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div style={{
                              background: attempt.overallAccuracy >= 0.8 ? '#6ee7b7' : attempt.overallAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c', 
                              color: '#000', 
                              padding:'2px 6px', 
                              borderRadius:10, 
                              fontSize:'0.7em', 
                              fontWeight:700
                            }}>
                              {Math.round(attempt.overallAccuracy * 100)}%
                            </div>
                          </div>
                          <div style={{display:'flex', gap:8, marginBottom:6, paddingTop:'6px', borderTop:'1px solid var(--border)'}}>
                            <div style={{flex:1, textAlign:'center', padding:'6px', background:'rgba(124, 156, 255, 0.15)', borderRadius:6, border:'1px solid rgba(124, 156, 255, 0.3)'}}>
                              <div style={{fontSize:'0.95em', fontWeight:700, color:'var(--accent)'}}>{attempt.score}/{attempt.total}</div>
                              <div style={{fontSize:'0.65em', color:'var(--muted)', marginTop:2}}>Score</div>
                            </div>
                            <div style={{flex:1, textAlign:'center', padding:'6px', background:'rgba(124, 156, 255, 0.15)', borderRadius:6, border:'1px solid rgba(124, 156, 255, 0.3)'}}>
                              <div style={{fontSize:'0.85em', fontWeight:700, color:'var(--accent2)'}}>{attempt.quizType || 'Mixed'}</div>
                              <div style={{fontSize:'0.65em', color:'var(--muted)', marginTop:2}}>Type</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAttempt(attempt);
                              setSelectedDocumentId(selectedDoc);
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: 'var(--accent)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.7em',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              marginTop:6,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)' }
                          >
                            <span>📝</span>
                            <span>View Details</span>
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
          {/* Search Header - Fixed at top */}
          
          {/* Sticky Header */}
          {/* <div style={{
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
            {data?.summary && data.summary.length > 0 && (
              <div style={{fontSize: '0.7em', color: 'var(--muted)', textAlign: 'center', marginTop: 4}}>
                {searchQuery ? `${filteredSummary.length} of ${data.summary.length}` : `${data.summary.length} PDF${data.summary.length !== 1 ? 's' : ''}`}
              </div>
            )}
          </div> */}
          
          {/* Scrollable Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px 14px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className="hide-scrollbar">
            {!loading && !error && (!data?.summary || data.summary.length === 0) && (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--muted)'}}>                <div style={{fontSize:'3em', marginBottom:'16px'}}>📄</div>
                <div style={{fontSize:'0.85em', lineHeight:1.6}}>No PDFs yet</div>
              </div>
            )}
            
            {!loading && !error && data?.summary && data.summary.length > 0 && filteredSummary.length === 0 && searchQuery && (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--muted)'}}>                <div style={{fontSize:'3em', marginBottom:'16px'}}>🔍</div>
                <div style={{fontSize:'0.9em', lineHeight:1.6, fontWeight:600}}>No results found</div>
                <div style={{fontSize:'0.75em', marginTop:8}}>for "{searchQuery}"</div>
              </div>
            )}
            
            {filteredSummary.map((s)=> (
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 156, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = selectedDoc === s.documentId ? '0 4px 16px rgba(124, 156, 255, 0.4)' : '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{
                  fontSize:'0.85em', 
                  fontWeight:700, 
                  marginBottom:12, 
                  color:'var(--text)', 
                  textAlign:'center', 
                  lineHeight:1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '0 4px'
                }}>
                  {s.title}
                </div>
                
                <div style={{position:'relative', width:'70px', height:'70px', margin:'0 auto 12px auto', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <svg viewBox="0 0 100 100" style={{transform:'rotate(-90deg)', filter:`drop-shadow(0 0 8px ${s.accuracy < 0.5 ? '#ff4d4f55' : s.accuracy < 0.8 ? '#ffc53d55' : '#52c41a55'})`}}>
                    <defs>
                      <filter id={`glowTile${s.documentId}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={s.accuracy < 0.4 ? '#fe1316ff' : s.accuracy < 0.7 ? '#ffc53d' : '#52c41a'} floodOpacity="0.4"/>
                      </filter>
                    </defs>
                    {/* Outer ring */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124, 156, 255, 0.13)" strokeWidth="9"/>
                    {/* Progress arc */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke={s.accuracy < 0.4 ? '#fe1316ff' : s.accuracy < 0.7 ? '#ffc53d' : '#52c41a'} strokeWidth="9" strokeDasharray={`${s.accuracy * 251.2} 251.2`} strokeLinecap="round" style={{transition:'stroke-dasharray 0.7s cubic-bezier(.4,2,.6,1)'}} filter={`url(#glowTile${s.documentId})`}/>
                    {/* Large inner ring */}
                    <circle cx="50" cy="50" r="36.5" fill="var(--surface, var(--input-bg))" stroke="rgba(124,156,255,0.10)" strokeWidth="2"/>
                  </svg>
                  <div style={{
                    position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
                    background:'var(--surface, var(--input-bg))',
                    borderRadius:'50%',
                    boxShadow:'0 1px 6px 0 rgba(124,156,255,0.08)',
                    width:'58px', height:'58px',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <span style={{
                      fontSize:'1.2em', fontWeight:900,
                      color: s.accuracy < 0.4 ? '#fe1316ff' : s.accuracy < 0.7 ? '#ffc53d' : '#52c41a',
                      letterSpacing: '-1px',
                      lineHeight: 1.1,
                      textShadow:'0 1px 4px rgba(124,156,255,0.08)'
                    }}>{(s.accuracy*100).toFixed(0)}%</span>
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
      {/* Attempt Modal (outside main content flex) */}
      {selectedAttempt && (
        <AttemptModal 
          attempt={selectedAttempt}
          documentId={selectedDocumentId}
          onClose={() => {
            setSelectedAttempt(null);
            setSelectedDocumentId(null);
          }}
          onRetake={(options) => {
            setSelectedAttempt(null);
            setSelectedDocumentId(null);
            if (options.continue) {
              setTimeout(() => navigate('/study'), 50);
              return;
            }
            if (selectedAttempt?.quizParams) {
              sessionStorage.setItem('retakeQuizParams', JSON.stringify({
                ...selectedAttempt.quizParams,
                withTimer: options.withTimer,
                timeLimit: options.timeLimit,
                documentId: selectedDocumentId
              }));
            }
            setTimeout(() => {
              navigate('/study');
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

