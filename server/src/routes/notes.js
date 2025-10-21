import express from 'express';
import multer from 'multer';
import stream from 'stream';
import { authenticateToken } from '../middleware/auth.js';
import { v2 as cloudinary } from 'cloudinary';
import Note from '../models/Note.js';

const router = express.Router();

// In-memory storage only; no disk writes
// Increased limits for noteJson field with base64-encoded images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 50 * 1024 * 1024, // 50MB for fields (noteJson with base64 images)
    fileSize: 10 * 1024 * 1024,  // 10MB for file uploads
    fields: 20,                   // Max number of non-file fields
    files: 5                      // Max number of file fields
  }
});

// Save a note (autosave). Accepts fields:
// - title (string)
// - docId (optional string association)
// - noteJson (string: serialized JSON of editor state)
// - snapshot (file: optional PNG image of canvas)
// List notes for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(200);
    res.json({ success: true, notes });
  } catch (error) {
    console.error('Notes list error:', error);
    res.status(500).json({ success: false, message: 'Failed to list notes', error: error.message });
  }
});

router.post('/new', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    const { title = 'Notebook', docId = '' } = req.body || {};
    const note = await Note.create({ user: userId, title, docId: docId || undefined, contentHtml: '' });
    return res.json({ success: true, note });
  } catch (error) {
    console.error('Notes new error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create note', error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    // Delete Cloudinary assets if present
    try { if (note.jsonPublicId) await cloudinary.uploader.destroy(note.jsonPublicId, { resource_type: 'raw' }); } catch {}
    try { if (note.snapshotPublicId) await cloudinary.uploader.destroy(note.snapshotPublicId, { resource_type: 'image' }); } catch {}
    await note.deleteOne();
    return res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Notes delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete note', error: error.message });
  }
});

router.post('/save', authenticateToken, upload.single('snapshot'), async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    const { title = 'Notebook', docId = '', noteJson = '', noteId = '' } = req.body || {};

    // Allow title/doc association updates even if there's no content/snapshot change
    // Only reject when creating a new note without any fields at all
    if (!noteId && (!noteJson || noteJson === 'undefined' || noteJson === 'null') && !req.file && !title && !docId) {
      return res.status(400).json({ success: false, message: 'Nothing to save' });
    }

    const folderBase = `quizhive/users/${userId}/notes`;

    // 1) Ensure we have a note to update (create first when needed)
    let note = null;
    if (noteId) {
      note = await Note.findOne({ _id: noteId, user: req.user._id });
      if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    } else {
      note = await Note.create({ user: userId, title, docId: docId || undefined, contentHtml: '' });
    }

    // 2) Update basic fields and contentHtml from noteJson (no JSON Cloudinary upload)
    note.title = title || note.title;
    note.docId = docId || note.docId;
    if (noteJson && noteJson !== 'undefined' && noteJson !== 'null') {
      try {
        const payloadStr = typeof noteJson === 'string' ? noteJson : String(noteJson);
        const obj = JSON.parse(payloadStr);
        const parsedHtml = obj?.html || '';
        if (typeof parsedHtml === 'string') note.contentHtml = parsedHtml;
      } catch {
        // ignore malformed noteJson
      }
    }

    // 3) Upload snapshot image if present (buffer -> stream) with STABLE public_id per note
    if (req.file) {
      const imageUpload = await new Promise((resolve, reject) => {
        const passthrough = new stream.PassThrough();
        const uploadStream = cloudinary.uploader.upload_stream({
          resource_type: 'image',
          folder: folderBase,
          public_id: `note_${note._id}_snapshot`,
          overwrite: true,
          invalidate: true,
          transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        }, (err, result) => {
          if (err) reject(err); else resolve(result);
        });
        passthrough.end(req.file.buffer);
        passthrough.pipe(uploadStream);
      });
      note.snapshotUrl = imageUpload.secure_url;
      note.snapshotPublicId = imageUpload.public_id;
    }

    await note.save();

    return res.json({
      success: true,
      message: 'Note saved',
      note
    });
  } catch (error) {
    console.error('Notes save error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save note', error: error.message });
  }
});

export default router;
