import mongoose from 'mongoose';

const ChunkSchema = new mongoose.Schema({
  page: Number,
  text: String,
  embedding: { type: [Number], index: false },
}, { _id: false });

const QuestionResultSchema = new mongoose.Schema({
  questionId: String,
  type: { type: String, enum: ['MCQ', 'SAQ', 'LAQ'] },
  correct: Boolean,
  partial: { type: Boolean, default: false },
  page: Number,
  topic: String, // Extracted from question content
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  timeSpent: Number, // in seconds (optional)
}, { _id: false });

const AttemptSchema = new mongoose.Schema({
  quizType: { type: String, enum: ['MCQ', 'SAQ', 'LAQ', 'mixed'] },
  score: Number,
  total: Number,
  questionResults: [QuestionResultSchema],
  overallAccuracy: Number,
  mcqAccuracy: Number,
  saqAccuracy: Number,
  laqAccuracy: Number,
  topics: [{
    name: String,
    accuracy: Number,
    questionsCount: Number
  }],
  strengths: [String],
  weaknesses: [String],
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
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Document', DocumentSchema);


