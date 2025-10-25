import mongoose from 'mongoose';

const ChunkSchema = new mongoose.Schema({
  page: Number,
  text: String,
  embedding: { type: [Number], index: false },
}, { _id: false });

const QuestionResultSchema = new mongoose.Schema({
  questionId: String,
  type: { type: String, enum: ['MCQ', 'SAQ', 'LAQ', 'ONEWORD'] },
  correct: Boolean,
  partial: { type: Boolean, default: false },
  page: Number,
  topic: String, // Extracted from question content
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  timeSpent: Number, // in seconds (optional)
  // Full question data for viewing later
  question: String,
  options: [String], // For MCQ
  userAnswer: mongoose.Schema.Types.Mixed, // Can be string or number
  correctAnswer: mongoose.Schema.Types.Mixed,
  explanation: String,
  marksObtained: Number,
  totalMarks: Number,
}, { _id: false });

const AttemptSchema = new mongoose.Schema({
  quizType: { type: String, enum: ['MCQ', 'SAQ', 'LAQ', 'ONEWORD', 'mixed'] },
  score: Number,
  total: Number,
  questionResults: [QuestionResultSchema],
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
  suggestedTopics: [String], // Topics user should focus on
  timeTaken: Number, // Total time taken in seconds
  timeLimit: Number, // Time limit if it was a timed quiz (in seconds)
  wasTimedOut: { type: Boolean, default: false }, // Whether quiz auto-submitted due to timeout
  // Quiz generation parameters for retake
  quizParams: {
    mcqCount: Number,
    onewordCount: Number,
    saqCount: Number,
    laqCount: Number,
    mode: String, // 'auto' | 'select' | 'custom'
    topics: [String], // For select mode
    instructions: String // For custom mode
  },
  // Quiz mode information
  quizMode: String, // 'general', 'topic-specific', 'custom'
  selectedTopics: [String], // Topics selected for mode 2
  customInstruction: String, // Custom instruction for mode 3
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  title: String,
  filename: String,
  mimeType: String,
  size: Number,
  pages: Number,
  storagePath: String, // Local file path (for backward compatibility)
  cloudinaryUrl: String, // Cloudinary URL for the PDF
  cloudinaryPublicId: String, // Cloudinary public ID for management
  chunks: [ChunkSchema],
  attempts: [AttemptSchema],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  description: String,
  topics: [String], // Extracted main topics from PDF content (cached)
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Document', DocumentSchema);


