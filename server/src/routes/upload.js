import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { extractPagesText } from '../lib/pdf.js';
import mime from 'mime';
import Document from '../models/Document.js';
import User from '../models/User.js';
import { embedTexts } from '../lib/gemini.js';
import { config } from '../lib/config.js';
import { uploadPDF } from '../lib/cloudinary.js';
import { authenticateToken, requireVerified } from '../middleware/auth.js';

const router = express.Router();

const uploadsDir = path.resolve('server/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || `.${mime.getExtension(file.mimetype) || 'pdf'}`;
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (config.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Get user's documents
router.get('/', async (req, res) => {
  try {
    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        console.warn('Invalid token, proceeding as guest:', error.message);
      }
    }

    // For guest users, return empty array (no persistent data)
    if (!user) {
      return res.json({
        success: true,
        documents: [],
        isGuest: true
      });
    }

    const docs = await Document.find({ uploadedBy: user._id })
      .select('title filename pages createdAt chunks cloudinaryUrl')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      documents: docs,
      isGuest: false
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
});

router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    if (!req.file.mimetype.includes('pdf')) {
      return res.status(400).json({ 
        success: false,
        message: 'Only PDF files are allowed' 
      });
    }

    // Extract text from PDF
    const parsed = await extractPagesText(req.file.path);
    const pages = parsed.numPages;
    const pageTexts = parsed.pages;

    console.log('PDF Processing:', { 
      filename: req.file.filename, 
      pages, 
      totalTextLength: pageTexts.reduce((s, t) => s + (t || '').length, 0),
      firstPageText: (pageTexts[0] || '').slice(0, 200)
    });

    // Check if user is authenticated
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let user = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        console.warn('Invalid token, proceeding as guest:', error.message);
      }
    }

    // For guest users, store locally only (no Cloudinary)
    let cloudinaryUrl = null;
    let cloudinaryPublicId = null;
    
    if (user) {
      // Upload to Cloudinary for authenticated users
      const cloudinaryResult = await uploadPDF(req.file.path, {
        public_id: `pdf_${user._id}_${Date.now()}`
      });

      if (!cloudinaryResult.success) {
        console.error('Cloudinary upload failed:', cloudinaryResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload PDF to cloud storage',
          error: cloudinaryResult.error
        });
      }
      
      cloudinaryUrl = cloudinaryResult.url;
      cloudinaryPublicId = cloudinaryResult.publicId;
    }

    // Process chunks
    const chunks = pageTexts.map((t, i) => ({ page: i + 1, text: t || '' }));
    if (config.EMBEDDINGS_ENABLED) {
      // Generate embeddings in small batches to avoid token limits
      const batchSize = 16;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        try {
          const vecs = await embedTexts(batch.map(b => b.text));
          (vecs || []).forEach((v, j) => { if (Array.isArray(v)) batch[j].embedding = v; });
        } catch (e) {
          // Continue without embeddings
        }
      }
    }

    // Create and persist document only for authenticated users.
    // Guest uploads are handled in-memory/local only and are not saved to DB
    // to avoid requiring uploadedBy and leaking guest data.
    let doc = null;
    if (user) {
      doc = await Document.create({
        title: req.body.title || req.file.originalname,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        pages,
        storagePath: req.file.path, // Keep local copy
        cloudinaryUrl: cloudinaryUrl,
        cloudinaryPublicId: cloudinaryPublicId,
        uploadedBy: user._id,
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
        description: req.body.description || '',
        chunks,
      });

      // Update user's documents array
      await user.updateOne({ $push: { documents: doc._id } });

      console.log('Document created:', {
        id: doc._id,
        title: doc.title,
        pages: doc.pages,
        chunksCount: doc.chunks.length,
        cloudinaryUrl: cloudinaryUrl,
        isGuest: false
      });
    } else {
      console.log('Guest upload processed (not persisted):', {
        filename: req.file.filename,
        pages,
        chunksCount: chunks.length
      });
    }

    // Clean up local file after successful upload (only for authenticated users with Cloudinary)
    if (user && cloudinaryUrl) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to delete local file:', cleanupError.message);
      }
    }

    const responseDocument = doc ? {
      id: doc._id,
      pages: doc.pages,
      title: doc.title,
      cloudinaryUrl: cloudinaryUrl,
      isGuest: false
    } : {
      id: null,
      pages,
      title: req.body.title || req.file.originalname,
      cloudinaryUrl: cloudinaryUrl,
      isGuest: true
    };

    res.json({
      success: true,
      message: user ? 'PDF uploaded successfully' : 'PDF uploaded successfully (Guest mode - data will be lost on page refresh)',
      document: responseDocument
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up local file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to delete local file after error:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Get specific document
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ 
      _id: req.params.id, 
      uploadedBy: req.user._id 
    });
    
    if (!doc) {
      return res.status(404).json({ 
        success: false,
        message: 'Document not found' 
      });
    }
    
    res.json({
      success: true,
      document: doc
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
});

// Get PDF file (from Cloudinary or local)
router.get('/:id/file', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ 
      _id: req.params.id, 
      uploadedBy: req.user._id 
    });
    
    if (!doc) {
      return res.status(404).json({ 
        success: false,
        message: 'Document not found' 
      });
    }

    // If Cloudinary URL exists, redirect to it
    if (doc.cloudinaryUrl) {
      return res.redirect(doc.cloudinaryUrl);
    }

    // Fallback to local file
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
      fs.createReadStream(doc.storagePath).pipe(res);
    } else {
      res.status(404).json({ 
        success: false,
        message: 'File not found' 
      });
    }
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file',
      error: error.message
    });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findOne({ 
      _id: req.params.id, 
      uploadedBy: req.user._id 
    });
    
    if (!doc) {
      return res.status(404).json({ 
        success: false,
        message: 'Document not found' 
      });
    }

    // Delete from Cloudinary if exists
    if (doc.cloudinaryPublicId) {
      const { deleteFile } = await import('../lib/cloudinary.js');
      await deleteFile(doc.cloudinaryPublicId, 'raw');
    }

    // Delete local file if exists
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (cleanupError) {
        console.warn('Failed to delete local file:', cleanupError.message);
      }
    }

    // Remove from user's documents array
    await req.user.updateOne({ $pull: { documents: doc._id } });

    // Delete document from database
    await Document.findByIdAndDelete(doc._id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

export default router;


