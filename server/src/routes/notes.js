import express from 'express';
import multer from 'multer';
import stream from 'stream';
import { authenticateToken } from '../middleware/auth.js';
import { v2 as cloudinary } from 'cloudinary';
import Note from '../models/Note.js';

const router = express.Router();

// In-memory storage only; no disk writes
const upload = multer({ storage: multer.memoryStorage() });

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
    const timestamp = Date.now();

  let jsonUpload = null;
    let imageUpload = null;

    // Upload JSON as raw file (data URI)
    let parsedHtml = '';
    if (noteJson && noteJson !== 'undefined' && noteJson !== 'null') {
      // noteJson could be stringified JSON or plain HTML envelope. We try to parse safely.
      let payloadStr = noteJson;
      if (typeof payloadStr !== 'string') payloadStr = String(payloadStr);
      const dataUri = 'data:application/json;base64,' + Buffer.from(payloadStr, 'utf-8').toString('base64');
      jsonUpload = await cloudinary.uploader.upload(dataUri, {
        resource_type: 'raw',
        folder: folderBase,
        public_id: `note_${timestamp}`,
        overwrite: true,
        type: 'authenticated',
        use_filename: false,
        format: 'json'
      });

      try {
        const obj = JSON.parse(payloadStr);
        parsedHtml = obj?.html || '';
      } catch {
        parsedHtml = '';
      }
    }

    // Upload snapshot image if present (buffer -> stream)
    if (req.file) {
      imageUpload = await new Promise((resolve, reject) => {
        const passthrough = new stream.PassThrough();
        const uploadStream = cloudinary.uploader.upload_stream({
          resource_type: 'image',
          folder: folderBase,
          public_id: `note_${timestamp}_snapshot`,
          overwrite: true,
          transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        }, (err, result) => {
          if (err) reject(err); else resolve(result);
        });
        passthrough.end(req.file.buffer);
        passthrough.pipe(uploadStream);
      });
    }

    let note;
    if (noteId) {
      note = await Note.findOne({ _id: noteId, user: req.user._id });
      if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
      note.title = title || note.title;
      note.docId = docId || note.docId;
      if (parsedHtml) note.contentHtml = parsedHtml;
      if (jsonUpload) { note.jsonUrl = jsonUpload.secure_url; note.jsonPublicId = jsonUpload.public_id; }
      if (imageUpload) { note.snapshotUrl = imageUpload.secure_url; note.snapshotPublicId = imageUpload.public_id; }
      await note.save();
    } else {
      note = await Note.create({
        user: userId,
        title,
        docId: docId || undefined,
        contentHtml: parsedHtml,
        jsonUrl: jsonUpload?.secure_url || null,
        jsonPublicId: jsonUpload?.public_id || null,
        snapshotUrl: imageUpload?.secure_url || null,
        snapshotPublicId: imageUpload?.public_id || null
      });
    }

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
