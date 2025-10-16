import { v2 as cloudinary } from 'cloudinary';
import { config } from './config.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true
});

// Upload PDF to Cloudinary
export const uploadPDF = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'raw',
      folder: 'beyond-chats/pdfs',
      public_id: `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      format: 'pdf',
      ...options
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      assetId: result.asset_id,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload image to Cloudinary (for user avatars)
export const uploadImage = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image',
      folder: 'beyond-chats/avatars',
      public_id: `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      ...options
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      assetId: result.asset_id
    };
  } catch (error) {
    console.error('Cloudinary image upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file from Cloudinary
export const deleteFile = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get file info from Cloudinary
export const getFileInfo = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    
    return {
      success: true,
      info: result
    };
  } catch (error) {
    console.error('Cloudinary get info error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate signed URL for secure access
export const generateSignedUrl = (publicId, options = {}) => {
  try {
    const url = cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
      ...options
    });
    
    return {
      success: true,
      url
    };
  } catch (error) {
    console.error('Cloudinary signed URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default cloudinary;

