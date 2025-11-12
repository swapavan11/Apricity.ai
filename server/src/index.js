import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import session from 'express-session';
import './lib/asyncErrors.js';

import { connectMongo } from './lib/mongo.js';
import { notFound, errorHandler } from './middleware/errors.js';
import passport from './lib/passport.js';
import { config } from './lib/config.js';

import uploadRouter from './routes/upload.js';
import imageUploadRouter from './routes/imageUpload.js';
import ragRouter from './routes/rag.js';
import quizRouter from './routes/quiz.js';
import progressRouter from './routes/progress.js';
import youtubeRouter from './routes/youtube.js';
import healthRouter from './routes/health.js';
import notesRouter from './routes/notes.js';
import authRouter from './routes/auth.js';

const app = express();

// CORS configuration - support multiple origins for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [config.FRONTEND_URL];

// CORS middleware - skip for OAuth callback routes (they're server-side redirects)
app.use((req, res, next) => {
  // Skip CORS for OAuth callback routes - these are server-side redirects from Google
  if (req.path.startsWith('/api/auth/google/callback') || 
      req.path.startsWith('/api/auth/google')) {
    return next();
  }
  
  // Apply CORS for all other routes
  cors({ 
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, OAuth redirects, or same-origin requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        // In development, be more permissive
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization']
  })(req, res, next);
});
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session configuration
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // In production, require HTTPS for secure cookies
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    // Use 'none' for cross-origin in production, 'lax' for same-site
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // Ensure domain is set correctly for production
    domain: process.env.COOKIE_DOMAIN || undefined
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/upload', imageUploadRouter); // Image upload for chat
app.use('/api/rag', ragRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/progress', progressRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/health', healthRouter);
app.use('/api/notes', notesRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectMongo()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });


