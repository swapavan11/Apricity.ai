import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  title: { type: String, default: 'Notebook' },
  docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: false },
  contentHtml: { type: String, default: '' },
  jsonUrl: { type: String, default: null },
  jsonPublicId: { type: String, default: null },
  snapshotUrl: { type: String, default: null },
  snapshotPublicId: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Note', NoteSchema);
