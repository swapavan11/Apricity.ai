import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div>
      <div className="section">
        <div style={{textAlign:'center', marginBottom:'40px'}}>
          <h1 style={{marginTop:0, fontSize:'2.5em', background:'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'16px'}}>
            Welcome to Apricity.ai
          </h1>
          <p style={{fontSize:'1.2em', color:'var(--muted)', maxWidth:'600px', margin:'0 auto'}}>
            Your intelligent study companion powered by AI. Transform your learning experience with smart PDF analysis, personalized tutoring, and comprehensive progress tracking.
          </p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'24px', marginBottom:'40px'}}>
          <div className="section" style={{textAlign:'center'}}>
            <div style={{fontSize:'3em', marginBottom:'16px'}}>📚</div>
            <h3 style={{marginTop:0, color:'var(--accent)'}}>Smart PDF Analysis</h3>
            <p>Upload your NCERT PDFs and get instant AI-powered analysis. Our system understands your content and provides contextual answers to your questions.</p>
          </div>
          
          <div className="section" style={{textAlign:'center'}}>
            <div style={{fontSize:'3em', marginBottom:'16px'}}>🤖</div>
            <h3 style={{marginTop:0, color:'var(--accent)'}}>AI Tutor Chat</h3>
            <p>Chat with an intelligent tutor Gini. Get personalized explanations, ask follow-up questions, and receive detailed answers with citations.</p>
          </div>
          
          <div className="section" style={{textAlign:'center'}}>
            <div style={{fontSize:'3em', marginBottom:'16px'}}>📝</div>
            <h3 style={{marginTop:0, color:'var(--accent)'}}>Smart Quiz Generation</h3>
            <p>Generate MCQs, SAQs, and LAQs based on your PDF content. Practice with questions tailored to your study material and track your performance.</p>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'20px', marginBottom:'40px'}}>
          <div className="section">
            <h4 style={{marginTop:0, color:'var(--accent2)'}}>🎯 Key Features</h4>
            <ul style={{paddingLeft:'20px', color:'var(--muted)'}}>
              <li>Upload and analyze PDF documents</li>
              <li>AI-powered question answering</li>
              <li>Interactive chat with citations</li>
              <li>Customizable quiz generation</li>
              <li>Performance analytics</li>
              <li>YouTube video recommendations</li>
            </ul>
          </div>
          
          <div className="section">
            <h4 style={{marginTop:0, color:'var(--accent2)'}}>🚀 How to Use</h4>
            <ol style={{paddingLeft:'20px', color:'var(--muted)'}}>
              <li>Upload your PDF documents</li>
              <li>Select a document or choose "All PDFs"</li>
              <li>Ask questions in the Chat Tutor</li>
              <li>Generate quizzes to test knowledge</li>
              <li>Track your progress in Dashboard</li>
            </ol>
          </div>
        </div>

        <div style={{textAlign:'center'}}>
          <div className="row" style={{gap:16, justifyContent:'center', flexWrap:'wrap'}}>
            <Link to="/study">
              <button style={{padding:'12px 24px', fontSize:'16px'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:'8px'}}>
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Start Learning
              </button>
            </Link>
            <Link to="/dashboard">
              <button className="secondary" style={{padding:'12px 24px', fontSize:'16px'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:'8px'}}>
                  <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                View Progress
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


