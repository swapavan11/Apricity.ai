import express from 'express';
import passport from 'passport';
import User from '../models/User.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendEmailVerification, sendPasswordReset, sendWelcomeEmail } from '../lib/email.js';
import { sendOTP, sendWelcomeSMS, validateMobileNumber } from '../lib/sms.js';
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

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, ...(mobile ? [{ mobile }] : [])]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Mobile number already registered'
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      ...(mobile && { mobile })
    });

    // Generate email verification token
    const emailToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    const emailResult = await sendEmailVerification(email, name, emailToken);
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }

    // Send mobile OTP if mobile provided
    if (mobile) {
      const mobileValidation = validateMobileNumber(mobile);
      if (mobileValidation.valid) {
        const otp = user.generateMobileOTP();
        await user.save();
        
        const smsResult = await sendOTP(mobileValidation.formatted, otp);
        if (!smsResult.success) {
          console.error('Failed to send SMS OTP:', smsResult.error);
        }
      }
    }

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

// Login with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email });
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

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    res.json({
      success: true,
      message: 'Email verified successfully'
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
router.post('/verify-mobile', async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    const user = await User.findOne({
      mobile,
      mobileVerificationOTP: otp,
      mobileVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.isMobileVerified = true;
    user.mobileVerificationOTP = undefined;
    user.mobileVerificationExpires = undefined;
    await user.save();

    // Send welcome SMS
    const mobileValidation = validateMobileNumber(mobile);
    if (mobileValidation.valid) {
      await sendWelcomeSMS(mobileValidation.formatted, user.name);
    }

    res.json({
      success: true,
      message: 'Mobile number verified successfully'
    });
  } catch (error) {
    console.error('Mobile verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Mobile verification failed',
      error: error.message
    });
  }
});

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
router.post('/resend-mobile-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isMobileVerified) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already verified'
      });
    }

    const mobileValidation = validateMobileNumber(mobile);
    if (!mobileValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number format'
      });
    }

    const otp = user.generateMobileOTP();
    await user.save();

    const smsResult = await sendOTP(mobileValidation.formatted, otp);
    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
        error: smsResult.error
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Resend mobile OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
});

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
  passport.authenticate('google', { failureRedirect: `${config.FRONTEND_URL}/login?error=google_auth_failed` }),
  async (req, res) => {
    try {
      const token = generateToken(req.user._id);
      res.redirect(`${config.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${config.FRONTEND_URL}/login?error=oauth_callback_failed`);
    }
  }
);

export default router;

