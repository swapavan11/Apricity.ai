import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Study Companion nested schemas
const shortTermActionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const studySessionSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // seconds
    required: true
  },
  mode: {
    type: String,
    enum: ['timer', 'stopwatch'],
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD format for easy querying
    required: true
  }
});

const taskBlockSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  startTime: {
    type: String, // HH:mm
    required: true
  },
  endTime: {
    type: String, // HH:mm
    required: true
  },
  title: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#4facfe'
  },
  link: {
    type: String,
    default: null
  }
});

const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const studyCompanionSchema = new mongoose.Schema({
  ultimateGoal: {
    type: String,
    default: ''
  },
  shortTermActions: [shortTermActionSchema],
  estimatedTime: {
    hours: {
      type: Number,
      default: 0,
      min: 0
    },
    minutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 59
    }
  },
  dailyCommitment: {
    hours: {
      type: Number,
      default: 0,
      min: 0
    },
    minutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 59
    }
  },
  studySessions: [studySessionSchema],
  taskBlocks: [taskBlockSchema],
  todos: [todoSchema]
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: function() {
      // Email is required unless user is authenticated via Google OAuth
      return !this.googleId;
    },
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  mobile: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    trim: true
  },
  mobileHistory: [{
    number: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    removedAt: {
      type: Date,
      default: null
    },
    wasVerified: {
      type: Boolean,
      default: false
    }
  }],
  password: {
    type: String,
    required: function() {
      // Required only if not using Google OAuth
      return !this.googleId;
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      mobile: {
        type: Boolean,
        default: true
      }
    }
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  chats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  }],
  // General quiz attempts (non-PDF based)
  generalAttempts: [{
    quizType: String,
    score: Number,
    total: Number,
    questionResults: [{
      questionId: String,
      type: { type: String, enum: ['MCQ', 'SAQ', 'LAQ', 'ONEWORD'] },
      correct: Boolean,
      partial: { type: Boolean, default: false },
      topic: String,
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
      timeSpent: Number,
      question: String,
      options: [String],
      userAnswer: String,
      correctAnswer: String,
      explanation: String,
      marksObtained: Number,
      totalMarks: Number
    }],
    overallAccuracy: Number,
    mcqAccuracy: Number,
    saqAccuracy: Number,
    laqAccuracy: Number,
    onewordAccuracy: Number,
    topics: [{
      name: String,
      accuracy: Number,
      questionsCount: Number
    }],
    strengths: [String],
    weaknesses: [String],
    suggestedTopics: [String],
    timeTaken: Number,
    timeLimit: Number,
    wasTimedOut: { type: Boolean, default: false },
    quizParams: {
      mode: String,
      mcqCount: Number,
      onewordCount: Number,
      saqCount: Number,
      laqCount: Number,
      topics: [String],
      instructions: String
    },
    // Quiz mode information
    quizMode: String, // 'general', 'topic-specific', 'custom'
    selectedTopics: [String], // Topics selected for mode 2
    customInstruction: String, // Custom instruction for mode 3
    createdAt: { type: Date, default: Date.now }
  }],
  // Study Companion data
  studyCompanion: {
    type: studyCompanionSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

// Note: index creation is handled via field options (unique/sparse). Avoid duplicate schema.index calls.

// Add indexes for efficient querying on Study Companion date fields
userSchema.index({ 'studyCompanion.studySessions.date': 1 });
userSchema.index({ 'studyCompanion.taskBlocks.date': 1 });
userSchema.index({ 'studyCompanion.shortTermActions.deadline': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate mobile OTP
// Removed mobile OTP generation

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  delete userObject.mobileHistory; // Don't expose mobile history to client
  // Add derived flags for client UX
  userObject.hasPassword = !!this.password;
  return userObject;
};

export default mongoose.model('User', userSchema);
