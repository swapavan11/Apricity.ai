import express from 'express';
import passport from 'passport';
import User from '../models/User.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendEmailVerification, sendPasswordReset, sendWelcomeEmail } from '../lib/email.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadImage } from '../lib/cloudinary.js';
import { config } from '../lib/config.js';

const router = express.Router();

// Register with email and password
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if email is already registered
    const existingByEmail = await User.findOne({ email });
    if (existingByEmail) {
      // If email exists but not verified, resend verification instead of blocking
      if (!existingByEmail.isEmailVerified) {
        const emailToken = existingByEmail.generateEmailVerificationToken();
        await existingByEmail.save();
        try {
          await sendEmailVerification(existingByEmail.email, existingByEmail.name, emailToken);
        } catch (e) {
          console.error('Resend verification on re-register failed:', e);
        }
        return res.status(200).json({
          success: true,
          message: 'This email is already registered but not verified. We have resent the verification email. Please check your inbox (and spam) to complete verification.',
          user: existingByEmail.getPublicProfile()
        });
      }
      // Email is verified; instruct user to sign in
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please sign in.'
      });
    }

    // If email is clear, ensure mobile (if provided) is not already in use
    if (mobile) {
      const existingByMobile = await User.findOne({ mobile: String(mobile).trim() });
      if (existingByMobile) {
        return res.status(409).json({
          success: false,
          message: 'Mobile number already registered'
        });
      }
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      ...(mobile && { mobile: String(mobile).trim() })
    });

  // Generate email verification token
  const emailToken = user.generateEmailVerificationToken();

    // Send verification email
    const emailResult = await sendEmailVerification(email, name, emailToken);
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }

    // Save user
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Removed: mobile-only registration (OTP-based)

// Login with email and password
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, mobile, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Determine identifier: prefer explicit identifier, else email, else mobile
    const loginId = identifier || email || mobile;
    if (!loginId) {
      return res.status(400).json({
        success: false,
        message: 'Email or mobile and password are required'
      });
    }

    // Find user
    let user;
    if (loginId.includes('@')) {
      user = await User.findOne({ email: loginId });
    } else {
      const raw = String(loginId).trim();
      // Expect exact E.164 match so country code must be correct
      user = await User.findOne({ mobile: raw });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Removed: mobile OTP login

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email (non-blocking)
    try { await sendWelcomeEmail(user.email, user.name); } catch {}

    // Auto-login by issuing JWT so client can redirect user to study space
    const jwt = generateToken(user._id);
    res.json({
      success: true,
      message: 'Email verified successfully',
      token: jwt,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
});

// Verify mobile OTP
// Removed: mobile OTP verification

// Resend email verification
router.post('/resend-email-verification', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const emailToken = user.generateEmailVerificationToken();
    await user.save();

    const emailResult = await sendEmailVerification(email, user.name, emailToken);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
        error: emailResult.error
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email',
      error: error.message
    });
  }
});

// Resend mobile OTP
// Removed: resend mobile OTP

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // req.user comes from passport; ensure we have a fresh doc with password so hasPassword is computed
    const u = await User.findById(req.user._id);
    res.json({ success: true, user: u.getPublicProfile() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, preferences, mobile, avatar } = req.body;
    const updateDoc = { $set: {}, $unset: {} };

    if (name) updateDoc.$set.name = name;
    if (preferences) updateDoc.$set.preferences = { ...req.user.preferences, ...preferences };

    // Handle mobile update with uniqueness check
    if (typeof mobile !== 'undefined' && mobile !== req.user.mobile) {
      const trimmed = typeof mobile === 'string' ? mobile.trim() : mobile;
      if (trimmed) {
        const exists = await User.findOne({ _id: { $ne: req.user._id }, mobile: String(trimmed) });
        if (exists) {
          return res.status(409).json({ success: false, message: 'Mobile number already registered' });
        }
        updateDoc.$set.mobile = String(trimmed);
      } else {
        updateDoc.$unset.mobile = 1; // properly remove mobile field
      }
    }

    if (typeof avatar !== 'undefined') {
      // direct URL override (already hosted);
      if (avatar === null || avatar === '') updateDoc.$unset.avatar = 1;
      else if (typeof avatar === 'string') updateDoc.$set.avatar = avatar.trim();
    }

    // Clean empty operators
    if (Object.keys(updateDoc.$set).length === 0) delete updateDoc.$set;
    if (Object.keys(updateDoc.$unset).length === 0) delete updateDoc.$unset;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      Object.keys(updateDoc).length ? updateDoc : {},
      { new: true, runValidators: true }
    ); // do not exclude password so hasPassword is computed correctly

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});
// Avatar upload (multipart form-data, field name: avatar)
// Note: process.cwd() when running `node src/index.js` resolves to the server folder.
// The repo stores uploads under server/server/uploads
const upload = multer({ dest: path.join(process.cwd(), 'server', 'uploads') });
router.post('/profile/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });
    const filePath = req.file.path;
    const result = await uploadImage(filePath);
    try { fs.unlinkSync(filePath); } catch {}
    if (!result.success) return res.status(500).json({ success:false, message:'Failed to upload avatar', error: result.error });
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: result.url }, { new:true });
    return res.json({ success:true, message:'Avatar updated', avatar: result.url, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ success:false, message:'Failed to upload avatar', error: error.message });
  }
});

// Change or set password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const hasPassword = !!user.password;
    if (hasPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required' });
      }
      const ok = await user.comparePassword(currentPassword);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    // Set new password and save so pre-save hook hashes it
    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: hasPassword ? 'Password changed successfully' : 'Password set successfully', user: user.getPublicProfile() });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password', error: error.message });
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.FRONTEND_URL}/auth?mode=auth&error=google_auth_failed` }),
  async (req, res) => {
    try {
      const token = generateToken(req.user._id);
      // Try to extract status info from passport auth (if available on req.authInfo)
      const status = req.authInfo?.status || 'returning';
      res.redirect(`${config.FRONTEND_URL}/auth/callback?token=${token}&status=${encodeURIComponent(status)}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${config.FRONTEND_URL}/auth?mode=auth&error=oauth_callback_failed`);
    }
  }
);

export default router;

