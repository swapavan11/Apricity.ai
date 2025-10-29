import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Animated number counter component
const AnimatedCounter = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count}+</span>;
};

const fadeInAnimation = {
  opacity: 0,
  animation: 'fadeIn 0.8s ease-out forwards',
};

const slideUpAnimation = {
  transform: 'translateY(20px)',
  opacity: 0,
  animation: 'slideUp 0.8s ease-out forwards',
};

// Stats data
const stats = [
  { number: 5000, label: 'Active Users' },
  { number: 25000, label: 'Quizzes Generated' },
  { number: 15000, label: 'PDFs Analyzed' },
  { number: 95, label: 'Satisfaction Rate' },
];

// Testimonials data
const testimonials = [
  {
    quote: "QuizHive.ai transformed my study routine. The AI tutor is like having a personal teacher available 24/7.",
    author: "Sarah K.",
    role: "Medical Student"
  },
  {
    quote: "The quiz generation feature helped me prepare for my exams more effectively than ever before.",
    author: "David M.",
    role: "Engineering Student"
  },
  {
    quote: "The analytics dashboard gives me clear insights into my progress. It's incredibly motivating!",
    author: "Lisa R.",
    role: "Graduate Student"
  }
];

export default function Home() {
  // Theme colors
  const theme = {
    bg: 'linear-gradient(140deg, #0f172a 0%, #1e1b4b 100%)',
    cardBg: 'rgba(30,34,48,0.95)',
    accent: '#7c3aed',
    accent2: '#10b981',
    muted: '#94a3b8',
    border: '1px solid rgba(148,163,184,0.1)',
    glow: '0 0 15px rgba(124,58,237,0.3)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.2)',
  };
  // Animation style for staggered fade-in
  const getDelayStyle = (delay) => ({
    opacity: 0,
    animation: `fadeIn 0.8s ease-out ${delay}s forwards`
  });

  return (
    <div className="home-landing" style={{ 
      minHeight: '100vh', 
      background: theme.bg, 
      padding: 0,
      position: 'relative',
      overflow: 'auto',
      width: '100%',
      height: '100%'
    }}>
      <style>
        {`
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow-y: auto;
          }
          .home-landing {
            -webkit-overflow-scrolling: touch;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .hero-btn:hover {
            transform: translateY(-2px);
            box-shadow: ${theme.glow};
          }
          .feature-card {
            transition: all 0.3s ease;
          }
          .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: ${theme.glow};
          }
        `}
      </style>

      {/* HERO SECTION */}
      <section style={{
        width: '100%',
        minHeight: '90vh',
        background: `radial-gradient(circle at 50% 50%, ${theme.accent}20 0%, transparent 50%)`,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'visible',
        padding: '80px 20px',
      }}>
        <div style={{ ...getDelayStyle(0.2), maxWidth: 1200, width: '100%', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: 'clamp(2.5em, 5vw, 4em)',
            fontWeight: 900,
            margin: 0,
            letterSpacing: '-1px',
            lineHeight: 1.1,
            background: `linear-gradient(135deg, #fff 0%, #e2e8f0 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Transform Your Learning Journey<br/>with AI-Powered Education
          </h1>
          <p style={{ 
            fontSize: 'clamp(1.1em, 2vw, 1.4em)',
            fontWeight: 400,
            margin: '24px auto 0 auto',
            maxWidth: 700,
            color: theme.muted,
            lineHeight: 1.6,
          }}>
            Experience a revolutionary approach to studying with QuizHive.ai. 
            Our platform combines AI tutoring, smart quiz generation, and 
            comprehensive analytics to optimize your learning process.
          </p>
          
          <div style={{ marginTop: 48, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/study" style={{ textDecoration: 'none', ...getDelayStyle(0.6) }}>
              <button className="hero-btn" style={{
                padding: '18px 40px',
                fontSize: '1.2em',
                fontWeight: 700,
                borderRadius: 12,
                background: theme.accent,
                color: '#fff',
                border: 'none',
                boxShadow: theme.cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}>
                <span role="img" aria-label="study">🚀</span> Get Started
              </button>
            </Link>
            <Link to="/dashboard" style={{ textDecoration: 'none', ...getDelayStyle(0.8) }}>
              <button className="hero-btn" style={{
                padding: '18px 40px',
                fontSize: '1.2em',
                fontWeight: 700,
                borderRadius: 12,
                background: 'transparent',
                color: '#fff',
                border: `2px solid ${theme.accent}`,
                boxShadow: theme.cardShadow,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}>
                <span role="img" aria-label="demo">🎮</span> Try Demo
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div style={{
          marginTop: 80,
          width: '100%',
          maxWidth: 1200,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 32,
          padding: '0 20px',
          ...getDelayStyle(1),
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{
              background: theme.cardBg,
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              border: theme.border,
            }}>
              <div style={{ fontSize: '2.5em', fontWeight: 800, color: theme.accent }}>
                <AnimatedCounter end={stat.number} />
              </div>
              <div style={{ color: theme.muted, marginTop: 8 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{
        padding: '100px 20px',
        background: `linear-gradient(180deg, ${theme.cardBg} 0%, transparent 100%)`,
        position: 'relative',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(2em, 3vw, 2.5em)',
            fontWeight: 800,
            color: '#fff',
            marginBottom: 64,
            ...getDelayStyle(1.2),
          }}>
            Why Choose QuizHive.ai?
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 40,
            ...getDelayStyle(1.4),
          }}>
            <BenefitCard
              icon="🎯"
              title="Personalized Learning"
              desc="AI-powered system adapts to your learning style and pace"
              theme={theme}
            />
            <BenefitCard
              icon="⚡"
              title="Instant Feedback"
              desc="Get immediate responses and detailed explanations"
              theme={theme}
            />
            <BenefitCard
              icon="📊"
              title="Progress Tracking"
              desc="Monitor your improvement with detailed analytics"
              theme={theme}
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        padding: '80px 20px',
        maxWidth: 1200,
        margin: '0 auto',
        position: 'relative',
      }}>
        <h2 style={{
          fontSize: 'clamp(2em, 3vw, 2.5em)',
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          marginBottom: 64,
          ...getDelayStyle(1.6),
        }}>
          Powerful Features for Enhanced Learning
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 40,
          ...getDelayStyle(1.8),
        }}>
          <FeatureCard
            icon="📚"
            title="Smart PDF Analysis"
            desc="Upload your study materials and get instant AI-powered analysis, summaries, and topic extraction."
            theme={theme}
          />
          <FeatureCard
            icon="🤖"
            title="AI Tutor Chat"
            desc="Chat with Gini, your personal AI tutor. Get contextual answers and follow-up explanations with citations."
            theme={theme}
          />
          <FeatureCard
            icon="📝"
            title="Custom Quiz Generation"
            desc="Create tailored MCQs, SAQs, and LAQs from your content. Practice effectively and track your progress."
            theme={theme}
          />
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{
        padding: '100px 20px',
        background: `linear-gradient(180deg, transparent 0%, ${theme.cardBg} 50%, transparent 100%)`,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2em, 3vw, 2.5em)',
            fontWeight: 800,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 64,
            ...getDelayStyle(2),
          }}>
            What Our Users Say
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 40,
            ...getDelayStyle(2.2),
          }}>
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} theme={theme} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '80px 20px',
        textAlign: 'center',
        ...getDelayStyle(2.4),
      }}>
        <h2 style={{
          fontSize: 'clamp(1.8em, 2.5vw, 2.2em)',
          fontWeight: 800,
          color: '#fff',
          marginBottom: 24,
        }}>
          Ready to Transform Your Learning Experience?
        </h2>
        <p style={{
          fontSize: '1.2em',
          color: theme.muted,
          marginBottom: 40,
          maxWidth: 600,
          margin: '0 auto 40px auto',
        }}>
          Join thousands of students who are already learning smarter with QuizHive.ai
        </p>
        
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/auth" style={{ textDecoration: 'none' }}>
            <button className="hero-btn" style={{
              padding: '18px 40px',
              fontSize: '1.2em',
              fontWeight: 700,
              borderRadius: 12,
              background: theme.accent,
              color: '#fff',
              border: 'none',
              boxShadow: theme.cardShadow,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}>
              <span role="img" aria-label="login">🔑</span> Get Started Free
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: theme.muted,
        borderTop: theme.border,
        ...getDelayStyle(2.6),
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <Link to="/about" style={{ color: theme.muted, textDecoration: 'none', marginRight: 20 }}>About</Link>
            <Link to="/privacy" style={{ color: theme.muted, textDecoration: 'none', marginRight: 20 }}>Privacy</Link>
            <Link to="/terms" style={{ color: theme.muted, textDecoration: 'none', marginRight: 20 }}>Terms</Link>
            <Link to="/contact" style={{ color: theme.muted, textDecoration: 'none' }}>Contact</Link>
          </div>
          <div>
            &copy; {new Date().getFullYear()} QuizHive.ai &mdash; Empowering Smarter Learning
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, theme }) {
  return (
    <div className="feature-card" style={{
      background: theme.cardBg,
      borderRadius: 20,
      padding: '40px 32px',
      textAlign: 'center',
      boxShadow: theme.cardShadow,
      border: theme.border,
      transition: 'all 0.3s ease',
    }}>
      <div style={{ fontSize: '3em', marginBottom: 16 }}>{icon}</div>
      <h3 style={{
        margin: '0 0 12px 0',
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.3em',
      }}>
        {title}
      </h3>
      <p style={{
        color: theme.muted,
        fontSize: '1.05em',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {desc}
      </p>
    </div>
  );
}

function BenefitCard({ icon, title, desc, theme }) {
  return (
    <div style={{
      background: theme.cardBg,
      borderRadius: 20,
      padding: 32,
      textAlign: 'left',
      border: theme.border,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 20,
    }}>
      <div style={{ fontSize: '2em' }}>{icon}</div>
      <div>
        <h3 style={{
          margin: '0 0 8px 0',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.2em',
        }}>
          {title}
        </h3>
        <p style={{
          color: theme.muted,
          fontSize: '1em',
          lineHeight: 1.6,
          margin: 0,
        }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, author, role, theme }) {
  return (
    <div style={{
      background: theme.cardBg,
      borderRadius: 20,
      padding: 32,
      border: theme.border,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        color: theme.muted,
        fontSize: '2em',
        marginBottom: 16,
      }}>
        "
      </div>
      <p style={{
        color: '#fff',
        fontSize: '1.1em',
        lineHeight: 1.6,
        flex: 1,
        marginBottom: 24,
      }}>
        {quote}
      </p>
      <div>
        <div style={{ color: '#fff', fontWeight: 600 }}>{author}</div>
        <div style={{ color: theme.muted, fontSize: '0.9em', marginTop: 4 }}>{role}</div>
      </div>
    </div>
  );
}

