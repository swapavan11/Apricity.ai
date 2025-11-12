import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthProvider';


// Floating Animation Component
const FloatingElement = ({ children, delay = 0, duration = 3 }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    const animate = () => {
      const time = Date.now() / 1000;
      const y = Math.sin(time * (2 * Math.PI / duration) + delay) * 10;
      setStyle({ transform: `translateY(${y}px)` });
    };
    const interval = setInterval(animate, 16);
    animate();
    return () => clearInterval(interval);
  }, [delay, duration]);

  return <div style={{ transition: 'transform 0.1s ease-out', ...style }}>{children}</div>;
};

// Feature Card Component
const FeatureCard = ({ icon, title, description, gradient, delay = 0, features = [] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
        borderRadius: 24,
        padding: 40,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: 1,
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transitionDelay: `${delay}ms`,
        boxShadow: isHovered
          ? `0 20px 60px rgba(124, 58, 237, 0.4), 0 0 40px rgba(124, 58, 237, 0.2)`
          : '0 10px 40px rgba(0, 0, 0, 0.3)',
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          transition: 'all 0.3s ease',
          transform: isHovered ? 'scale(1.5)' : 'scale(1)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 56, marginBottom: 20, display: 'inline-block' }}>
          <FloatingElement delay={delay * 0.1}>{icon}</FloatingElement>
        </div>
        <h3
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 16,
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
          }}
        >
          {description}
        </p>
        {features.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {features.map((feature, idx) => (
              <li
                key={idx}
                style={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: 14,
                  marginBottom: 8,
                  paddingLeft: 24,
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Testimonial Card Component
const TestimonialCard = ({ quote, author, role, avatar, delay = 0 }) => {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      style={{
        background: 'rgba(30, 34, 48, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        padding: 32,
        border: '1px solid rgba(124, 156, 255, 0.2)',
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.6s ease',
        transitionDelay: `${delay}ms`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.7 }}>"</div>
      <p
        style={{
          color: '#fff',
          fontSize: 16,
          lineHeight: 1.7,
          flex: 1,
          margin: '0 0 24px 0',
        }}
      >
        {quote}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `linear-gradient(135deg, #7c3aed 0%, #10b981 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {avatar || author.charAt(0)}
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{author}</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, marginTop: 2 }}>
            {role}
          </div>
        </div>
      </div>
    </div>
  );
};


export default function Home() {
  const navigate = useNavigate();
  const { user, isGuestMode } = useAuth();

  const features = [
    {
      icon: '📚',
      title: 'Smart PDF Analysis',
      description: 'Upload your study materials and get instant AI-powered analysis, summaries, and intelligent topic extraction.',
      gradient: ['rgba(124, 58, 237, 0.8)', 'rgba(139, 92, 246, 0.6)'],
      features: ['Automatic topic extraction', 'Page-by-page analysis', 'Smart summarization'],
    },
    {
      icon: '🤖',
      title: 'AI Tutor Chat',
      description: 'Chat with Gini, your personal AI tutor. Get contextual answers with citations and follow-up explanations.',
      gradient: ['rgba(16, 185, 129, 0.8)', 'rgba(5, 150, 105, 0.6)'],
      features: ['Context-aware responses', 'Source citations', 'Multi-turn conversations'],
    },
    {
      icon: '📝',
      title: 'Custom Quiz Generation',
      description: 'Create tailored quizzes from your content. Generate MCQs, SAQs, LAQs, and one-word questions with detailed scoring.',
      gradient: ['rgba(59, 130, 246, 0.8)', 'rgba(37, 99, 235, 0.6)'],
      features: ['Multiple question types', 'Difficulty levels', 'Topic-based quizzes'],
    },
    {
      icon: '📊',
      title: 'Progress Analytics',
      description: 'Track your learning journey with comprehensive analytics. Monitor performance, identify strengths and weaknesses.',
      gradient: ['rgba(236, 72, 153, 0.8)', 'rgba(219, 39, 119, 0.6)'],
      features: ['Performance metrics', 'Progress tracking', 'Personalized insights'],
    },
    {
      icon: '📺',
      title: 'YouTube Recommendations',
      description: 'Get curated video recommendations based on your study content. Learn from the best educational resources.',
      gradient: ['rgba(245, 158, 11, 0.8)', 'rgba(217, 119, 6, 0.6)'],
      features: ['Content-based matching', 'Quality filtering', 'Relevant suggestions'],
    },
    {
      icon: '📓',
      title: 'Digital Notebook',
      description: 'Take notes, create study guides, and organize your learning materials all in one place.',
      gradient: ['rgba(168, 85, 247, 0.8)', 'rgba(147, 51, 234, 0.6)'],
      features: ['Rich text editing', 'Auto-save', 'Organized notes'],
    },
  ];

  const testimonials = [
    {
      quote: 'QuizHive.ai transformed my study routine. The AI tutor is like having a personal teacher available 24/7. The quiz generation feature helped me ace my exams!',
      author: 'Sarah K.',
      role: 'Medical Student',
      avatar: 'SK',
    },
    {
      quote: 'The progress analytics are incredible. I can see exactly where I need to improve, and the personalized recommendations make studying so much more efficient.',
      author: 'David M.',
      role: 'Engineering Student',
      avatar: 'DM',
    },
    {
      quote: 'As a graduate student, I love how I can upload research papers and get instant summaries and quiz questions. It saves me hours of work!',
      author: 'Lisa R.',
      role: 'Graduate Student',
      avatar: 'LR',
    },
  ];


  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b1020 0%, #1e1b4b 50%, #0f172a 100%)',
        position: 'relative',
        overflow: 'visible',
        width: '100%',
      }}
    >
      <style>
        {`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {/* Animated Background Elements */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '-300px',
            left: '-300px',
            animation: 'float 20s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            bottom: '-250px',
            right: '-250px',
            animation: 'float 15s ease-in-out infinite reverse',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'pulse 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* Hero Section */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 20px 80px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 1200, width: '100%', textAlign: 'center' }}>
          {/* Main Heading */}
          <h1
            style={{
              fontSize: 'clamp(3rem, 8vw, 5.5rem)',
              fontWeight: 900,
              margin: '0 0 24px 0',
              letterSpacing: '-2px',
              lineHeight: 1.1,
              background: 'linear-gradient(135deg, #ffffff 0%, #aab2d5 50%, #7c3aed 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient 5s ease infinite',
            }}
          >
            Transform Your Learning
            <br />
            <span style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              with AI Power
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
              fontWeight: 400,
              margin: '0 auto 48px',
              maxWidth: 800,
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: 1.7,
            }}
          >
            Experience the future of education with QuizHive.ai. Upload PDFs, chat with your AI tutor,
            generate custom quizzes, and track your progress—all powered by cutting-edge AI technology.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: 40,
            }}
          >
            {user || isGuestMode ? (
              <Link to="/study" style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    padding: '20px 48px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #10b981 100%)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 10px 40px rgba(124, 58, 237, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 15px 50px rgba(124, 58, 237, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 40px rgba(124, 58, 237, 0.4)';
                  }}
                >
                  <span>🚀</span> Go to Study Space
                </button>
              </Link>
            ) : (
              <>
                <Link to="/auth" style={{ textDecoration: 'none' }}>
                  <button
                    style={{
                      padding: '20px 48px',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, #7c3aed 0%, #10b981 100%)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 10px 40px rgba(124, 58, 237, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 15px 50px rgba(124, 58, 237, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 40px rgba(124, 58, 237, 0.4)';
                    }}
                  >
                    <span>✨</span> Get Started Free
                  </button>
                </Link>
                <button
                  onClick={() => navigate('/auth')}
                  style={{
                    padding: '20px 48px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    borderRadius: 16,
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    border: '2px solid rgba(124, 156, 255, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(124, 156, 255, 0.8)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(124, 156, 255, 0.5)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>👤</span> Try as Guest
                </button>
              </>
            )}
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section
        style={{
          padding: '120px 20px',
          maxWidth: 1400,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <h2
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: '#fff',
              margin: '0 0 20px 0',
              letterSpacing: '-1px',
            }}
          >
            Everything You Need to{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #10b981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Excel
            </span>
          </h2>
          <p
            style={{
              fontSize: '1.2rem',
              color: 'rgba(255, 255, 255, 0.7)',
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            Powerful features designed to make your learning journey efficient, engaging, and effective
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: 32,
          }}
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} delay={index * 100} />
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        style={{
          padding: '120px 20px',
          background: 'linear-gradient(180deg, transparent 0%, rgba(30, 34, 48, 0.5) 50%, transparent 100%)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#fff',
                margin: '0 0 20px 0',
                letterSpacing: '-1px',
              }}
            >
              Loved by{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Thousands
              </span>
            </h2>
            <p
              style={{
                fontSize: '1.2rem',
                color: 'rgba(255, 255, 255, 0.7)',
                maxWidth: 600,
                margin: '0 auto',
              }}
            >
              See what students are saying about their learning experience
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 32,
            }}
          >
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} delay={index * 150} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        style={{
          padding: '120px 20px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: '#fff',
              margin: '0 0 24px 0',
              letterSpacing: '-1px',
            }}
          >
            Ready to Transform Your Learning?
          </h2>
          <p
            style={{
              fontSize: '1.2rem',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: '0 0 48px 0',
              lineHeight: 1.7,
            }}
          >
            Join thousands of students who are already learning smarter with QuizHive.ai. Start your
            journey today—it's free to get started!
          </p>
          <Link to={user || isGuestMode ? '/study' : '/auth'} style={{ textDecoration: 'none' }}>
            <button
              style={{
                padding: '20px 48px',
                fontSize: '1.2rem',
                fontWeight: 700,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #7c3aed 0%, #10b981 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 40px rgba(124, 58, 237, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 15px 50px rgba(124, 58, 237, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(124, 58, 237, 0.4)';
              }}
            >
              <span>🚀</span> Start Learning Now
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '60px 20px 40px',
          borderTop: '1px solid rgba(124, 156, 255, 0.2)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 32,
              marginBottom: 32,
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/dashboard"
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none',
                fontSize: 14,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
            >
              Dashboard
            </Link>
            <Link
              to="/study"
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                textDecoration: 'none',
                fontSize: 14,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
            >
              Study Space
            </Link>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 14 }}>
            © {new Date().getFullYear()} QuizHive.ai — Empowering Smarter Learning
          </div>
        </div>
      </footer>
    </div>
  );
}
