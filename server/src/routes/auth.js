import express from 'express';
import passport from 'passport';
import User from '../models/User.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendEmailVerification, sendPasswordReset, sendWelcomeEmail } from '../lib/email.js';
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
    res.json({
      success: true,
      user: req.user.getPublicProfile()
    });
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
    const { name, preferences } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

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

