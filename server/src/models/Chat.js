import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  text: { type: String, required: true },
  citations: [{
    documentId: mongoose.Schema.Types.ObjectId,
    title: String,
    page: Number,
    snippet: String,
  }],
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ChatSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { type: String },
  messages: [MessageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ChatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Chat', ChatSchema);


