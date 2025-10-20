import React, { useEffect, useMemo, useRef, useState } from 'react'
import useApi from '../../api/useApi'

export default function Study({ selected, docs }) {
  const api = useApi()
  const [activeDoc, setActiveDoc] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [citations, setCitations] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [score, setScore] = useState(null)
  const [yt, setYt] = useState(null)
  const [loadingYt, setLoadingYt] = useState(false)
  const [loadingAsk, setLoadingAsk] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [loadingScore, setLoadingScore] = useState(false)
  const [quizCount, setQuizCount] = useState(5)
  const [onewordCount, setOnewordCount] = useState(0)
  const [saqCount, setSaqCount] = useState(0)
  const [laqCount, setLaqCount] = useState(0)
  const [quizPrompt, setQuizPrompt] = useState('')
  const [quizMode, setQuizMode] = useState('select') // 'auto' | 'select' | 'custom'
  const [topicDocId, setTopicDocId] = useState(selected || 'all')
  const [topicList, setTopicList] = useState([])
  const [selectedTopic, setSelectedTopic] = useState('')
  const [validationError, setValidationError] = useState('')
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [chatHistoryVisible, setChatHistoryVisible] = useState(false)
  const [attemptHistory, setAttemptHistory] = useState(null)
  const [loadingAttemptHistory, setLoadingAttemptHistory] = useState(false)
 

  // Function to refresh YouTube recommendations
  const refreshYouTubeRecommendations = async () => {
    if (!question.trim()) return;
    setLoadingYt(true);
    try {
      const ytRes = await api.youtube(question, selected==='all'?null:selected);
      setYt(ytRes);
    } catch (err) {
      console.error('YouTube recommendation error:', err);
      setYt({ query: question, suggestions: [], error: 'Failed to load recommendations' });
    } finally {
      setLoadingYt(false);
    }
  };

  // Function to load attempt history
  const loadAttemptHistory = async () => {
    if (selected === 'all') {
      setAttemptHistory(null);
      return;
    }
    
    setLoadingAttemptHistory(true);
    try {
      const history = await api.getAttemptHistory(selected);
      setAttemptHistory(history);
    } catch (err) {
      console.error('Failed to load attempt history:', err);
      setAttemptHistory(null);
    } finally {
      setLoadingAttemptHistory(false);
    }
  };

  useEffect(() => {
    if (selected && selected !== 'all') {
      api.listChats(selected).then((res)=> setChats(res.chats||[]))
      setActiveChatId(null)
      loadAttemptHistory()
    } else {
      api.listChats(null).then((res)=> setChats(res.chats||[]))
      setActiveChatId(null)
      setAttemptHistory(null)
    }
  }, [selected])

  // fetch topic list for a selected PDF when using Select mode
  useEffect(() => {
    const docId = topicDocId === 'all' ? null : topicDocId
    setTopicList([])
    setSelectedTopic('')
    if (!docId) return
    let mounted = true
    fetch(`/api/quiz/topics?documentId=${docId}`).then(r=>r.json()).then(j=>{
      if (!mounted) return
      if (j && Array.isArray(j.topics)) setTopicList(j.topics)
    }).catch(()=>{})
    return () => { mounted = false }
  }, [topicDocId])

  const onAsk = async () => {
    setAnswer('')
    setCitations([])
    setLoadingAsk(true)
    setLoadingYt(true)
    try {
      // create chat if none selected
      let chatId = activeChatId
      if (!chatId) {
        const ts = new Date()
        const docTitle = docs.find(d => d._id === selected)?.title || 'General'
        const questionPreview = question.trim().slice(0, 30)
        const chatTitle = `${questionPreview || docTitle} • ${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`
        const created = await api.createChat(selected==='all'?null:selected, chatTitle)
        chatId = created.id
        setActiveChatId(chatId)
        // refresh chat list
        const lst = await api.listChats(selected==='all'?null:selected)
        setChats(lst.chats||[])
      }
      const res = await api.ask(question, selected==='all'?null:selected, false, chatId, false)
      setAnswer(res.answer||'')
      setCitations(res.citations||[])
      // refresh active chat contents
      if (chatId) {
        const c = await api.getChat(chatId)
        setActiveChat(c)
      }
      
      // Get YouTube recommendations
      try {
        const ytRes = await api.youtube(question, selected==='all'?null:selected)
        setYt(ytRes)
      } catch (ytErr) {
        console.error('YouTube recommendation error:', ytErr)
        setYt({ query: question, suggestions: [], error: 'Failed to load recommendations' })
      }
    } catch (err) {
      console.error('Ask error:', err)
      setAnswer('Error: ' + (err.message || 'Failed to get answer'))
    } finally {
      setLoadingAsk(false)
      setLoadingYt(false)
    }
  }

  const onGenQuiz = async () => {
    setLoadingQuiz(true)
    setValidationError('')
    try {
      const mcqCount = Math.max(0, Math.min(20, Number(quizCount)||5))
      const saqCountVal = Math.max(0, Math.min(10, Number(saqCount)||0))
      const laqCountVal = Math.max(0, Math.min(5, Number(laqCount)||0))
      // determine documentId and instructions based on quizMode
      let documentIdToUse = null
      let instructionsToUse = ''
      if (quizMode === 'auto') {
        documentIdToUse = selected === 'all' ? null : selected
      } else if (quizMode === 'select') {
        documentIdToUse = topicDocId === 'all' ? null : topicDocId
      } else if (quizMode === 'custom') {
        documentIdToUse = selected === 'all' ? null : selected
        instructionsToUse = quizPrompt
      }

      const onewordCountVal = Math.max(0, Math.min(20, Number(onewordCount)||0))

      // combine selected topic into instructions when using Select mode
      let combinedInstructions = instructionsToUse || ''
      if (quizMode === 'select' && selectedTopic) {
        combinedInstructions = (combinedInstructions ? combinedInstructions + '\n' : '') + `Focus topic: ${selectedTopic}`
      }

      // warn/abort if totals are very large
      const totalRequested = mcqCount + onewordCountVal + saqCountVal + laqCountVal
      if (totalRequested > 80) {
        setValidationError('Requested too many questions. Please reduce the total to 80 or fewer.')
        setLoadingQuiz(false)
        return
      }

      const res = await api.genQuiz(documentIdToUse, mcqCount, onewordCountVal, saqCountVal, laqCountVal, combinedInstructions, selectedTopic)
      setQuiz(res)
      setAnswers({})
      setScore(null)
    } catch (err) {
      console.error('Quiz generation error:', err)
      // If an error occurred from the server or network, show a neutral empty quiz
      setQuiz({ questions: [] })
    } finally {
      setLoadingQuiz(false)
    }
  }

  // Clear validation messages when relevant inputs change
  useEffect(() => {
    if (validationError) setValidationError('')
  }, [quizCount, onewordCount, saqCount, laqCount, quizMode, selectedTopic, topicDocId, quizPrompt])

  const onScore = async () => {
    if (!quiz?.questions?.length) return
    setLoadingScore(true)
    try {
      const ordered = quiz.questions.map(q => answers[q.id])
      const payload = { documentId: selected==='all'?null:selected, answers: ordered, questions: quiz.questions }
      const res = await api.scoreQuiz(payload)
      setScore(res)
      
      // Show analytics if available
      if (res.analytics) {
        console.log('Quiz Analytics:', res.analytics)
      }
      
      // Refresh attempt history after successful quiz submission
      if (selected && selected !== 'all') {
        await loadAttemptHistory()
      }
    } finally {
      setLoadingScore(false)
    }
  }

  return (
    <div style={{display:'flex', height:'100%', position:'relative', flex:1}}>
      {/* Left Panel - PDF Viewer */}
      <div 
        className="left-panel" 
        style={{
          width:`${leftPanelWidth}%`,
          height:'100%',
          background:'var(--panel)',
          borderRight:'1px solid var(--border)',
          display:'flex',
          flexDirection:'column',
          position:'relative',
          overflow:'hidden'
        }}
      >
        {/* PDF Viewer - Full Size */}
        <div style={{flex:1, height:'100%', display:'flex', flexDirection:'column'}}>
          {selected !== 'all' && docs && docs.length ? (
            <div style={{ flex: 1, height: '100%' }}>
              <iframe
                title="pdf"
                src={api.resolveDocUrl(docs.find(d => d._id === selected))}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : (
            <div style={{
              flex:1,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              color:'var(--muted)',
              textAlign:'center',
              padding:'40px'
            }}>
              <div>
                <div style={{fontSize:'48px', marginBottom:'16px'}}>📄</div>
                <div style={{fontSize:'18px', fontWeight:600, marginBottom:'8px'}}>PDF Viewer</div>
                <div>Select a specific PDF from the navigation bar to view it here.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className="resize-handle"
        style={{
          width:'8px',
          height:'100vh',
          background:'var(--border)',
          cursor:'col-resize',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          position:'relative'
        }}
        onMouseDown={(e) => {
          const startX = e.clientX
          const startWidth = leftPanelWidth
          
          const handleMouseMove = (e) => {
            const deltaX = e.clientX - startX
            const containerWidth = window.innerWidth
            const newWidth = Math.max(20, Math.min(80, startWidth + (deltaX / containerWidth) * 100))
            setLeftPanelWidth(newWidth)
          }
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
      >
        <div style={{color:'var(--muted)', fontSize:'12px'}}>⟷</div>
      </div>

      {/* Right Panel - Chat, Quiz, YouTube */}
      <div 
        className="right-panel" 
        style={{
          width:`${100 - leftPanelWidth}%`,
          height:'100%',
          background:'var(--panel)',
          display:'flex',
          flexDirection:'column',
          overflow:'hidden'
        }}
      >
        <div style={{padding:'16px', flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
          <div className="row" style={{gap:8, marginBottom:16, flexShrink:0, justifyContent:'space-between'}}>
            <div className="row" style={{gap:8}}>
              <button className={activeTab==='chat' ? '' : 'secondary'} onClick={()=>setActiveTab('chat')}>Chat Tutor</button>
              <button className={activeTab==='quiz' ? '' : 'secondary'} onClick={()=>setActiveTab('quiz')}>Quiz</button>
              <button className={activeTab==='youtube' ? '' : 'secondary'} onClick={()=>setActiveTab('youtube')}>YouTube</button>
              <button className={activeTab==='history' ? '' : 'secondary'} onClick={()=>setActiveTab('history')}>Attempt History</button>
            </div>
            <div className="row" style={{gap:8}}>
              <button 
                className="secondary" 
                onClick={async ()=>{
                  const ts = new Date()
                  const docTitle = (docs.find(d=>d._id===selected)?.title) || 'General'
                  const base = question?.trim() ? question.trim().slice(0,40) : docTitle
                  const title = `${base} • ${ts.toLocaleDateString()} ${ts.toLocaleTimeString()}`
                  const created = await api.createChat(selected==='all'?null:selected, title)
                  setActiveChatId(created.id)
                  const lst = await api.listChats(selected==='all'?null:selected)
                  setChats(lst.chats||[])
                  const c = await api.getChat(created.id)
                  setActiveChat(c)
                }}
                style={{display:'flex', alignItems:'center', gap:6, padding:'8px 12px'}}
                title="Start New Chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>New Chat</span>
              </button>
              <button 
                className="secondary" 
                onClick={()=>setChatHistoryVisible(true)}
                style={{display:'flex', alignItems:'center', gap:6, padding:'8px 12px'}}
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

        {activeTab === 'chat' && (
          <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>

            {/* Chat Messages - Scrollable Area */}
            <div style={{
              flex:1, 
              overflow:'auto', 
              background:'#0f1530', 
              border:'1px solid #1f2b57', 
              borderRadius:10, 
              padding:'16px',
              marginBottom:'12px',
              display:'flex',
              flexDirection:'column',
              gap:'12px',
              minHeight:0
            }}>
              {!activeChat?.messages?.length && (
                <div style={{color:'var(--muted)', textAlign:'center', marginTop:'50px'}}>
                  No messages yet. Start a conversation with your tutor.
                </div>
              )}
              {activeChat?.messages?.map((m, idx) => (
                <div key={idx} style={{
                  display:'flex',
                  justifyContent: m.role==='user' ? 'flex-end' : 'flex-start',
                  marginBottom:'12px'
                }}>
                  <div style={{
                    maxWidth:'70%',
                    padding:'12px 16px',
                    borderRadius:'18px',
                    background: m.role==='user' ? 'var(--accent)' : '#1a244d',
                    color: m.role==='user' ? '#0a0f25' : 'var(--text)',
                    position:'relative'
                  }}>
                    <div style={{
                      fontSize:'12px',
                      fontWeight:600,
                      marginBottom:'4px',
                      opacity:0.8
                    }}>
                      {m.role==='user' ? 'You' : 'Tutor'}
                    </div>
                    <div style={{whiteSpace:'pre-wrap', lineHeight:'1.4'}}>{m.text}</div>
                    <div style={{
                      fontSize:'10px',
                      opacity:0.6,
                      marginTop:'4px'
                    }}>
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {loadingAsk && (
                <div style={{
                  display:'flex',
                  justifyContent:'flex-start',
                  marginBottom:'12px'
                }}>
                  <div style={{
                    padding:'12px 16px',
                    borderRadius:'18px',
                    background:'#1a244d',
                    color:'var(--text)',
                    position:'relative'
                  }}>
                    <div style={{
                      fontSize:'12px',
                      fontWeight:600,
                      marginBottom:'4px',
                      opacity:0.8
                    }}>
                      Tutor
                    </div>
                    <div style={{color:'var(--muted)'}}>Thinking...</div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area - Sticky to Bottom */}
            <div style={{
              background:'#0d142c',
              border:'1px solid #1a244d',
              borderRadius:10,
              padding:'12px',
              flexShrink:0
            }}>
              <div style={{display:'flex', gap:'8px', alignItems:'flex-end'}}>
                <textarea 
                  rows={1} 
                  style={{
                    flex:1,
                    background:'#0f1530', 
                    color:'var(--text)', 
                    border:'1px solid #1f2b57', 
                    borderRadius:8, 
                    padding:'12px',
                    resize:'none',
                    minHeight:'20px',
                    maxHeight:'120px',
                    fontFamily:'inherit',
                    fontSize:'14px',
                    lineHeight:'1.4'
                  }} 
                  value={question} 
                  onChange={(e) => {
                    setQuestion(e.target.value)
                    // Auto-resize textarea
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                  placeholder="Ask your tutor anything..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      onAsk()
                    }
                  }}
                />
                <button 
                  onClick={onAsk} 
                  disabled={loadingAsk || !question.trim()}
                  style={{
                    padding:'12px 20px',
                    height:'fit-content',
                    display:'flex',
                    alignItems:'center',
                    gap:'6px'
                  }}
                >
                  {loadingAsk ? (
                    <>
                      <div style={{width:'16px', height:'16px', border:'2px solid transparent', borderTop:'2px solid currentColor', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
                      <span>Thinking…</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
              <div style={{fontSize:'11px', color:'var(--muted)', marginTop:'6px', textAlign:'center'}}>
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>

            {/* Answer Display - Only show if there's a direct answer */}
            {(answer && !activeChat?.messages?.length) && (
              <div className="section" style={{marginTop:12}}>
                <div style={{fontWeight:700, marginBottom:6}}>Answer</div>
                <div style={{whiteSpace:'pre-wrap'}}>{answer}</div>
                {citations?.length>0 && (
                  <div style={{marginTop:10, color:'var(--muted)'}}>
                    <div style={{fontWeight:700, color:'var(--text)'}}>Citations</div>
                    {citations.map((c,i)=> (
                      <div key={i}>p.{c.page} — {c.title}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
            {/* Quiz Input Form - Only show when no quiz is generated */}
            {!quiz && (
              <>
                <div style={{marginBottom:'20px'}}>
                  <h3 style={{marginTop:0, marginBottom:'8px', color:'var(--accent)'}}>Quiz Generator</h3>
                  <p style={{color:'var(--muted)', marginBottom:'16px'}}>
                    Generate customized quizzes based on your PDF content. Choose the number of questions for each type.
                  </p>
                </div>

                <div style={{marginBottom:'12px'}}>
                  <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'center', marginBottom:8}}>
                    <label style={{display:'flex', alignItems:'center', gap:8}}>
                      <input type="radio" name="quizMode" value="auto" checked={quizMode==='auto'} onChange={()=>setQuizMode('auto')} />
                      <span>Auto (use current source selector)</span>
                    </label>
                    <label style={{display:'flex', alignItems:'center', gap:8}}>
              <input type="radio" name="quizMode" value="select" checked={quizMode==='select'} onChange={()=>{ if(docs.length>0) setQuizMode('select')}} disabled={docs.length === 0} />
                      <span>Select Topic in PDF</span>
                    </label>
                    <label style={{display:'flex', alignItems:'center', gap:8}}>
                      <input type="radio" name="quizMode" value="custom" checked={quizMode==='custom'} onChange={()=>setQuizMode('custom')} />
                      <span>Custom instructions</span>
                    </label>
                  </div>

                  {/* topic dropdown for select mode */}
                  {quizMode === 'select' && (
                    <div style={{display:'flex', justifyContent:'center', marginBottom:12}}>
                      {docs.length === 0 ? (
                        <div style={{color:'var(--muted)'}}>No uploaded PDFs yet. Upload a PDF to enable the Select option.</div>
                      ) : (
                        <div style={{display:'flex', gap:8, alignItems:'center'}}>
                          <select value={topicDocId} onChange={(e)=>setTopicDocId(e.target.value)} style={{padding:'8px 12px', borderRadius:8, background:'var(--input-bg)', color:'var(--text)', border:'1px solid var(--border)'}}>
                            <option value="all">All uploaded PDFs</option>
                            {docs.map(d => <option key={d._id} value={d._id}>{d.title} ({d.pages}p)</option>)}
                          </select>
                          {topicList.length > 0 && (
                            <select value={selectedTopic} onChange={(e)=>setSelectedTopic(e.target.value)} style={{padding:'8px 12px', borderRadius:8, background:'var(--input-bg)', color:'var(--text)', border:'1px solid var(--border)'}}>
                              <option value="">All topics</option>
                              {topicList.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* custom instructions input */}
                  {quizMode === 'custom' && (
                    <div style={{display:'flex', justifyContent:'center', marginBottom:12}}>
                      <textarea
                        rows={3}
                        value={quizPrompt}
                        onChange={(e)=>setQuizPrompt(e.target.value)}
                        placeholder={"E.g. Focus on Chapter 3: Kinematics. Make MCQs application-level; include numerical problems where relevant. (Do NOT include question counts — set counts using the fields below.)"}
                        style={{width:'80%', padding:'10px 12px', borderRadius:8, background:'#0f1530', color:'var(--text)', border:'1px solid #1f2b57', resize:'vertical'}}
                      />
                    </div>
                  )}
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', marginBottom:'20px'}}>
                  <div className="section" style={{textAlign:'center'}}>
                    <div style={{fontSize:'2em', marginBottom:'8px'}}>🔘</div>
                    <h4 style={{marginTop:0, marginBottom:'8px', color:'var(--accent2)'}}>Multiple Choice Questions (MCQ)</h4>
                    <p style={{fontSize:'0.9em', color:'var(--muted)', marginBottom:'12px'}}>
                      Questions with multiple options where only one answer is correct. Great for testing factual knowledge and quick recall.
                    </p>
                    <div>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:'4px'}}>Number of MCQs</div>
                      <input 
                        type="number" 
                        min={0} 
                        max={20} 
                        value={quizCount} 
                        onChange={(e)=>setQuizCount(e.target.value)} 
                        placeholder="0-20" 
                        style={{width:'100px', textAlign:'center'}} 
                      />
                    </div>
                  </div>
                  <div className="section" style={{textAlign:'center'}}>
                    <div style={{fontSize:'2em', marginBottom:'8px'}}>🔤</div>
                    <h4 style={{marginTop:0, marginBottom:'8px', color:'var(--accent2)'}}>One-Word Answers</h4>
                    <p style={{fontSize:'0.9em', color:'var(--muted)', marginBottom:'12px'}}>
                      Single-token answers (word or number). Good for definitions, formulas, or short numerical values.
                    </p>
                    <div>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:'4px'}}>Number of One-Word Questions</div>
                      <input 
                        type="number" 
                        min={0} 
                        max={20} 
                        value={onewordCount} 
                        onChange={(e)=>setOnewordCount(e.target.value)} 
                        placeholder="0-20" 
                        style={{width:'100px', textAlign:'center'}} 
                      />
                    </div>
                  </div>

                  <div className="section" style={{textAlign:'center'}}>
                    <div style={{fontSize:'2em', marginBottom:'8px'}}>📝</div>
                    <h4 style={{marginTop:0, marginBottom:'8px', color:'var(--accent2)'}}>Short Answer Questions (SAQ)</h4>
                    <p style={{fontSize:'0.9em', color:'var(--muted)', marginBottom:'12px'}}>
                      Brief written responses that test understanding of concepts, definitions, and explanations in 2-3 sentences.
                    </p>
                    <div>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:'4px'}}>Number of SAQs</div>
                      <input 
                        type="number" 
                        min={0} 
                        max={10} 
                        value={saqCount} 
                        onChange={(e)=>setSaqCount(e.target.value)} 
                        placeholder="0-10" 
                        style={{width:'100px', textAlign:'center'}} 
                      />
                    </div>
                  </div>
                  
                  <div className="section" style={{textAlign:'center'}}>
                    <div style={{fontSize:'2em', marginBottom:'8px'}}>📄</div>
                    <h4 style={{marginTop:0, marginBottom:'8px', color:'var(--accent2)'}}>Long Answer Questions (LAQ)</h4>
                    <p style={{fontSize:'0.9em', color:'var(--muted)', marginBottom:'12px'}}>
                      Detailed written responses that require comprehensive understanding, analysis, and explanation of complex topics.
                    </p>
                    <div>
                      <div style={{fontSize:'0.85em', color:'var(--muted)', marginBottom:'4px'}}>Number of LAQs</div>
                      <input 
                        type="number" 
                        min={0} 
                        max={5} 
                        value={laqCount} 
                        onChange={(e)=>setLaqCount(e.target.value)} 
                        placeholder="0-5" 
                        style={{width:'100px', textAlign:'center'}} 
                      />
                    </div>
                  </div>
                </div>

                <div style={{textAlign:'center', marginBottom:'20px'}}>
                  <button 
                    onClick={onGenQuiz} 
                    disabled={loadingQuiz || validationError || (quizCount == 0 && onewordCount == 0 && saqCount == 0 && laqCount == 0)}
                    style={{padding:'12px 24px', fontSize:'16px', display:'flex', alignItems:'center', gap:'8px', margin:'0 auto'}}
                  >
                    {loadingQuiz ? (
                      <>
                        <div style={{width:'20px', height:'20px', border:'2px solid transparent', borderTop:'2px solid currentColor', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
                        <span>Generating Quiz...</span>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Generate Quiz</span>
                      </>
                    )}
                  </button>
                  {(quizCount == 0 && onewordCount == 0 && saqCount == 0 && laqCount == 0) && (
                    <div style={{fontSize:'12px', color:'var(--muted)', marginTop:'8px'}}>
                      Please select at least one question type
                    </div>
                  )}

                  {validationError && (
                    <div style={{marginTop:8, color:'#ffb4b4', background:'#3b1a1a', display:'inline-block', padding:'8px 12px', borderRadius:8, fontSize:'13px'}}>
                      {validationError}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Quiz Display - Show when quiz is generated */}
            {quiz && (
              <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
                {/* Quiz Header with Reset Button */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexShrink:0}}>
                  <div>
                    <h3 style={{marginTop:0, marginBottom:'8px', color:'var(--accent)'}}>Quiz Questions</h3>
                    <p style={{color:'var(--muted)', marginBottom:0}}>
                      {quiz.questions?.length || 0} questions generated • Answer all questions and submit when ready
                    </p>
                  </div>
                  <button 
                    className="secondary"
                    onClick={() => {
                      setQuiz(null)
                      setAnswers({})
                      setScore(null)
                    }}
                    style={{padding:'8px 16px', fontSize:'14px', display:'flex', alignItems:'center', gap:'6px'}}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>New Quiz</span>
                  </button>
                </div>

                {/* Quiz Questions - Scrollable Area */}
                <div style={{flex:1, overflow:'auto', minHeight:0}}>
                  {loadingQuiz && <div className="section" style={{marginTop:10, color:'var(--muted)'}}>Generating quiz…</div>}
                  {!loadingQuiz && Array.isArray(quiz?.questions) ? quiz.questions.map((q, idx) => (
                  (() => {
                    const resultMap = score ? Object.fromEntries(score.results.map(r=>[r.id, r])) : {}
                    const result = resultMap[q.id]
                    const isCorrect = result ? result.correct : null
                    const isPartial = result ? result.partial : false
                    return (
                      <div className="section" key={q.id} style={{marginTop:10}}>
                        <div style={{fontWeight:700}}>
                          {`Q${idx+1}. [${q.type}] `}{q.question}
                          {score && (
                            <span style={{marginLeft:8, color: isCorrect ? '#6ee7b7' : (isPartial ? '#ffa500' : '#ff7c7c')}}>
                              {isCorrect ? 'Correct' : (isPartial ? 'Partial' : 'Wrong')}
                            </span>
                          )}
                        </div>
                        {q.type === 'MCQ' && Array.isArray(q.options) && q.options.length>0 && (
                          <div style={{marginTop:8}}>
                            {q.options.map((op, oidx) => {
                              let style = {}
                              if (score && result) {
                                if (oidx === result.expectedIndex) style = { color: '#6ee7b7' }
                                else if (!result.correct && oidx === result.userIndex) style = { color: '#ff7c7c' }
                              }
                              return (
                                <label key={oidx} style={{display:'block', marginBottom:6}}>
                                  <input type="radio" name={`q_${q.id}`} onChange={()=>setAnswers(a=>({...a, [q.id]: oidx}))} /> <span style={style}>{op}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                        {(q.type === 'SAQ' || q.type === 'LAQ' || q.type === 'ONEWORD') && (
                          <div style={{marginTop:8}}>
                            {q.type === 'ONEWORD' ? (
                              <input
                                type="text"
                                value={answers[q.id] || ''}
                                onChange={(e)=>setAnswers(a=>({...a, [q.id]: e.target.value}))}
                                placeholder="One-word or numeric answer"
                                style={{width:'50%', padding:8, borderRadius:8, background:'#0f1530', color:'var(--text)', border:'1px solid #1f2b57'}}
                              />
                            ) : (
                              <textarea 
                                rows={q.type === 'LAQ' ? 4 : 2}
                                style={{width:'100%', background:'#0f1530', color:'var(--text)', border:'1px solid #1f2b57', borderRadius:10, padding:10}}
                                placeholder={`Your ${q.type} answer...`}
                                value={answers[q.id] || ''}
                                onChange={(e)=>setAnswers(a=>({...a, [q.id]: e.target.value}))}
                              />
                            )}
                          </div>
                        )}
                        {score && (
                          <div style={{marginTop:8, color:'var(--muted)'}}>
                            <div>p.{q.page} • {q.explanation}</div>
                            {(q.type === 'SAQ' || q.type === 'LAQ' || q.type === 'ONEWORD') && (
                              <div style={{marginTop:6, padding:8, background:'#0b1024', borderRadius:6}}>
                                <div style={{fontWeight:700, color:'var(--text)'}}>Expected Answer:</div>
                                <div style={{whiteSpace:'pre-wrap'}}>{q.answer}</div>
                                {result && (
                                  <div style={{marginTop:4, color:'var(--muted)'}}>Your Answer: {result.userAnswer}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()
                  )) : null}
                  
                  {/* Submit Button - Fixed at bottom of quiz */}
                  <div style={{marginTop:'20px', padding:'16px', background:'#0d142c', border:'1px solid #1a244d', borderRadius:10, flexShrink:0}}>
                    <div style={{textAlign:'center'}}>
                      <button 
                        onClick={onScore} 
                        disabled={loadingScore}
                        style={{padding:'12px 24px', fontSize:'16px', display:'flex', alignItems:'center', gap:'8px', margin:'0 auto'}}
                      >
                        {loadingScore ? (
                          <>
                            <div style={{width:'16px', height:'16px', border:'2px solid transparent', borderTop:'2px solid currentColor', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>
                            <span>Scoring…</span>
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Submit Quiz</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Results Display */}
                  {(loadingScore || score) && (
                    <div className="section" style={{marginTop:20}}>
                      {loadingScore ? (
                        <div style={{color:'var(--muted)', textAlign:'center', padding:'20px'}}>Scoring your quiz…</div>
                      ) : (
                        <div>
                          <div style={{fontWeight:700, marginBottom:8, fontSize:'18px', color:'var(--accent)'}}>Quiz Results</div>
                          <div style={{marginBottom:16, fontSize:'16px'}}>
                            Score: <span style={{fontWeight:700, color:'var(--accent2)'}}>{score.score}</span> / <span style={{fontWeight:700}}>{score.total}</span> 
                            <span style={{marginLeft:'8px', color:'var(--muted)'}}>({(score.score/score.total*100).toFixed(1)}%)</span>
                          </div>
                          
                          {score.analytics && (
                            <div style={{marginTop:12, padding:12, background:'#0b1024', borderRadius:8, border:'1px solid #1a244d'}}>
                              <div style={{fontWeight:700, marginBottom:8, color:'var(--accent)'}}>Performance Breakdown</div>
                              <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginBottom:8}}>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'0.8em', color:'var(--muted)'}}>MCQ</div>
                                  <div style={{fontWeight:700, color: score.analytics.mcqAccuracy >= 0.8 ? '#6ee7b7' : score.analytics.mcqAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c'}}>
                                    {(score.analytics.mcqAccuracy*100).toFixed(0)}%
                                  </div>
                                </div>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'0.8em', color:'var(--muted)'}}>SAQ</div>
                                  <div style={{fontWeight:700, color: score.analytics.saqAccuracy >= 0.8 ? '#6ee7b7' : score.analytics.saqAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c'}}>
                                    {(score.analytics.saqAccuracy*100).toFixed(0)}%
                                  </div>
                                </div>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'0.8em', color:'var(--muted)'}}>LAQ</div>
                                  <div style={{fontWeight:700, color: score.analytics.laqAccuracy >= 0.8 ? '#6ee7b7' : score.analytics.laqAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c'}}>
                                    {(score.analytics.laqAccuracy*100).toFixed(0)}%
                                  </div>
                                </div>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'0.8em', color:'var(--muted)'}}>ONEWORD</div>
                                  <div style={{fontWeight:700, color: score.analytics.onewordAccuracy >= 0.8 ? '#6ee7b7' : score.analytics.onewordAccuracy >= 0.6 ? '#ffa500' : '#ff7c7c'}}>
                                    {(score.analytics.onewordAccuracy*100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                              
                              {score.analytics.strengths?.length > 0 && (
                                <div style={{marginBottom:8}}>
                                  <div style={{fontSize:'0.9em', color:'#6ee7b7', marginBottom:4}}>Strengths:</div>
                                  <div style={{fontSize:'0.8em'}}>{score.analytics.strengths.join(', ')}</div>
                                </div>
                              )}
                              
                              {score.analytics.weaknesses?.length > 0 && (
                                <div>
                                  <div style={{fontSize:'0.9em', color:'#ff7c7c', marginBottom:4}}>Focus Areas:</div>
                                  <div style={{fontSize:'0.8em'}}>{score.analytics.weaknesses.join(', ')}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State - Show when no quiz is generated */}
            {!quiz && (
              <div style={{
                flex:1,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                color:'var(--muted)',
                textAlign:'center'
              }}>
                <div>
                  <div style={{fontSize:'48px', marginBottom:'16px'}}>📝</div>
                  <div style={{fontSize:'18px', fontWeight:600, marginBottom:'8px'}}>Ready to Test Your Knowledge?</div>
                  <div>Configure your quiz settings above and click "Generate Quiz" to begin</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'youtube' && (
          <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
            <div style={{marginBottom:12, flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700, marginBottom:8}}>YouTube Recommendations</div>
                <div style={{fontSize:'14px', color:'var(--muted)'}}>
                  Get video suggestions based on your study topics
                </div>
              </div>
              {question.trim() && (
                <button 
                  className="secondary" 
                  onClick={refreshYouTubeRecommendations}
                  disabled={loadingYt}
                  style={{padding:'8px 12px', fontSize:'12px'}}
                >
                  {loadingYt ? 'Generating...' : 'Refresh'}
                </button>
              )}
            </div>
            
            {!yt && !loadingYt && (
              <div style={{
                flex:1,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                color:'var(--muted)',
                textAlign:'center'
              }}>
                <div>
                  <div style={{fontSize:'48px', marginBottom:'16px'}}>📺</div>
                  <div>Ask a question in the Chat Tutor to get YouTube recommendations</div>
                </div>
              </div>
            )}

            {loadingYt && (
              <div style={{
                flex:1,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                color:'var(--muted)',
                textAlign:'center'
              }}>
                <div>
                  <div style={{fontSize:'48px', marginBottom:'16px', animation:'pulse 1.5s ease-in-out infinite'}}>📺</div>
                  <div>Generating YouTube recommendations based on your question and PDF...</div>
                </div>
              </div>
            )}

            {yt && !loadingYt && (
              <div style={{flex:1, overflow:'auto', minHeight:0}}>
                <div style={{marginBottom:12, padding:'12px', background:'#0d142c', borderRadius:8, border:'1px solid #1a244d'}}>
                  <div style={{fontSize:'12px', color:'var(--muted)', marginBottom:'4px'}}>
                    Search Query: {yt.query}
                    {yt.generated && <span style={{color:'var(--accent2)', marginLeft:'8px'}}>• AI Generated</span>}
                  </div>
                  <div style={{fontWeight:600}}>
                    {yt.suggestions?.length > 0 ? `${yt.suggestions.length} recommendations found` : 'No recommendations available'}
                  </div>
                </div>
                
                <div style={{display:'grid', gap:'12px'}}>
                  {yt.suggestions?.map((suggestion, i) => (
                    <div key={i} style={{
                      background:'#0d142c',
                      border:'1px solid #1a244d',
                      borderRadius:10,
                      padding:'16px',
                      transition:'all 0.2s ease',
                      cursor:'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#1a244d'
                      e.target.style.borderColor = '#2a3d6b'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#0d142c'
                      e.target.style.borderColor = '#1a244d'
                    }}
                    onClick={() => window.open(suggestion.url, '_blank')}
                    >
                      <div style={{
                        display:'flex',
                        alignItems:'center',
                        gap:'12px'
                      }}>
                        <div style={{
                          width:'40px',
                          height:'40px',
                          background:'var(--accent)',
                          borderRadius:'8px',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          color:'#0a0f25',
                          fontWeight:'bold',
                          fontSize:'18px'
                        }}>
                          ▶
                        </div>
                        <div style={{flex:1}}>
                          <div style={{
                            fontWeight:600,
                            marginBottom:'4px',
                            lineHeight:'1.3'
                          }}>
                            {suggestion.title}
                          </div>
                          <div style={{
                            fontSize:'12px',
                            color:'var(--muted)',
                            display:'flex',
                            alignItems:'center',
                            gap:'8px'
                          }}>
                            <span>YouTube</span>
                            <span>•</span>
                            <span>Click to open</span>
                          </div>
                        </div>
                        <div style={{
                          color:'var(--muted)',
                          fontSize:'12px'
                        }}>
                          ↗
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {yt.suggestions?.length === 0 && (
                  <div style={{
                    textAlign:'center',
                    color:'var(--muted)',
                    padding:'40px 20px'
                  }}>
                    No YouTube recommendations available for this query.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
            <div style={{marginBottom:12, flexShrink:0}}>
              <div style={{fontWeight:700, marginBottom:8}}>Attempt History</div>
              <div style={{fontSize:'14px', color:'var(--muted)'}}>
                View detailed performance history for this PDF
              </div>
            </div>
            
            {selected === 'all' && (
              <div style={{
                flex:1,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                color:'var(--muted)',
                textAlign:'center'
              }}>
                <div>
                  <div style={{fontSize:'48px', marginBottom:'16px'}}>📊</div>
                  <div>Select a specific PDF to view attempt history</div>
                </div>
              </div>
            )}

            {selected !== 'all' && loadingAttemptHistory && (
              <div style={{
                flex:1,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                color:'var(--muted)',
                textAlign:'center'
              }}>
                <div>
                  <div style={{fontSize:'48px', marginBottom:'16px', animation:'pulse 1.5s ease-in-out infinite'}}>📊</div>
                  <div>Loading attempt history...</div>
                </div>
              </div>
            )}

            {selected !== 'all' && !loadingAttemptHistory && attemptHistory && (
              <div style={{flex:1, overflow:'auto', minHeight:0}}>
                {attemptHistory.attempts.length === 0 ? (
                  <div style={{
                    flex:1,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    color:'var(--muted)',
                    textAlign:'center'
                  }}>
                    <div>
                      <div style={{fontSize:'48px', marginBottom:'16px'}}>📝</div>
                      <div>No quiz attempts found for this PDF</div>
                      <div style={{fontSize:'14px', marginTop:'8px'}}>Take a quiz to see your performance history</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{marginBottom:'16px', padding:'12px', background:'#0d142c', borderRadius:8, border:'1px solid #1a244d'}}>
                      <div style={{fontWeight:600, marginBottom:'4px'}}>{attemptHistory.title}</div>
                      <div style={{fontSize:'14px', color:'var(--muted)'}}>
                        {attemptHistory.totalAttempts} attempt{attemptHistory.totalAttempts !== 1 ? 's' : ''} completed
                      </div>
                    </div>
                    
                    <div style={{display:'grid', gap:'12px'}}>
                      {attemptHistory.attempts.map((attempt, index) => (
                        <div key={attempt.id || index} style={{
                          background:'#0d142c',
                          border:'1px solid #1a244d',
                          borderRadius:10,
                          padding:'16px',
                          transition:'all 0.2s ease'
                        }}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px'}}>
                            <div>
                              <div style={{fontWeight:600, marginBottom:'4px'}}>
                                Attempt #{attempt.attemptNumber}
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
                                {attempt.quizType}
                              </div>
                              <div style={{fontSize:'11px', color:'var(--muted)'}}>Type</div>
                            </div>
                            {attempt.mcqAccuracy !== undefined && (
                              <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'16px', fontWeight:600}}>
                                  {Math.round(attempt.mcqAccuracy * 100)}%
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>MCQ</div>
                              </div>
                            )}
                            {attempt.saqAccuracy !== undefined && (
                              <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'16px', fontWeight:600}}>
                                  {Math.round(attempt.saqAccuracy * 100)}%
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>SAQ</div>
                              </div>
                            )}
                            {attempt.laqAccuracy !== undefined && (
                              <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'16px', fontWeight:600}}>
                                  {Math.round(attempt.laqAccuracy * 100)}%
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>LAQ</div>
                              </div>
                            )}
                            {attempt.onewordAccuracy !== undefined && (
                              <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'16px', fontWeight:600}}>
                                  {Math.round(attempt.onewordAccuracy * 100)}%
                                </div>
                                <div style={{fontSize:'11px', color:'var(--muted)'}}>ONEWORD</div>
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
                            <div>
                              <div style={{fontSize:'12px', color:'#ff7c7c', marginBottom:'4px', fontWeight:600}}>
                                Areas to improve:
                              </div>
                              <div style={{fontSize:'11px', color:'var(--muted)'}}>
                                {attempt.weaknesses.join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Chat History Slider */}
      <div 
        className="chat-history-slider"
        style={{
          position:'fixed',
          right: chatHistoryVisible ? '0' : '-400px',
          top:'70px',
          width:'400px',
          height:'calc(100vh - 70px)',
          background:'var(--panel)',
          borderLeft:'1px solid #1f2b57',
          padding:'20px',
          zIndex:1000,
          transition:'right 0.3s ease',
          overflow:'auto',
          boxShadow:'-4px 0 12px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h3 style={{margin:0, fontSize:'18px'}}>Chat History</h3>
          <button 
            className="secondary" 
            onClick={()=>setChatHistoryVisible(false)}
            style={{padding:'6px 10px', fontSize:'12px'}}
          >
            ✕
          </button>
        </div>
        
        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
          {chats.length === 0 ? (
            <div style={{
              textAlign:'center',
              color:'var(--muted)',
              padding:'40px 20px'
            }}>
              <div style={{fontSize:'48px', marginBottom:'16px'}}>💬</div>
              <div>No previous chats found</div>
              <div style={{fontSize:'14px', marginTop:'8px'}}>Start a conversation to see it here</div>
            </div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat._id}
                style={{
                  background: activeChatId === chat._id ? 'rgba(124, 156, 255, 0.15)' : '#0d142c',
                  border: activeChatId === chat._id ? '1px solid rgba(124, 156, 255, 0.3)' : '1px solid #1a244d',
                  borderRadius:'12px',
                  padding:'16px',
                  cursor:'pointer',
                  transition:'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeChatId !== chat._id) {
                    e.target.style.background = '#1a244d'
                    e.target.style.borderColor = '#2a3d6b'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeChatId !== chat._id) {
                    e.target.style.background = '#0d142c'
                    e.target.style.borderColor = '#1a244d'
                  }
                }}
                onClick={async () => {
                  setActiveChatId(chat._id)
                  setActiveChat(null)
                  const c = await api.getChat(chat._id)
                  setActiveChat(c)
                  setChatHistoryVisible(false)
                  setActiveTab('chat')
                }}
              >
                <div style={{
                  fontWeight:600,
                  marginBottom:'8px',
                  fontSize:'14px',
                  color: activeChatId === chat._id ? 'var(--accent)' : 'var(--text)'
                }}>
                  {chat.title || 'Untitled Chat'}
                </div>
                <div style={{
                  fontSize:'12px',
                  color:'var(--muted)',
                  marginBottom:'8px'
                }}>
                  {new Date(chat.updatedAt || chat.createdAt).toLocaleString()}
                </div>
                <div style={{
                  fontSize:'12px',
                  color:'var(--muted)',
                  display:'flex',
                  alignItems:'center',
                  gap:'8px'
                }}>
                  <span>💬 {chat.messages?.length || 0} messages</span>
                  {chat.documentId && (
                    <span>📄 {docs.find(d => d._id === chat.documentId)?.title || 'PDF'}</span>
                  )}
                </div>
                {chat.messages?.length > 0 && (
                  <div style={{
                    fontSize:'11px',
                    color:'var(--muted)',
                    marginTop:'8px',
                    padding:'8px',
                    background:'rgba(0, 0, 0, 0.2)',
                    borderRadius:'6px',
                    maxHeight:'60px',
                    overflow:'hidden'
                  }}>
                    {chat.messages[chat.messages.length - 1]?.text?.slice(0, 100)}...
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


