import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User.js';
import { config } from './config.js';

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.userId).select('-password');
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
  callbackURL: config.GOOGLE_CALLBACK_URL || `${config.BACKEND_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Basic guards for required fields
    const email = profile?.emails?.[0]?.value;
    const name = profile?.displayName || profile?.name?.givenName || 'Google User';
    const avatar = profile?.photos?.[0]?.value || null;

    if (!email) {
      return done(new Error('Google account has no accessible email address'), null);
    }

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user, { status: 'returning' });
    }

    // Check if user exists with this email
    user = await User.findOne({ email });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.avatar = avatar;
      user.isEmailVerified = true; // Google emails are pre-verified
      await user.save();
      return done(null, user, { status: 'linked' });
    }

    // Create new user
    user = new User({
      googleId: profile.id,
      name,
      email,
      avatar,
      isEmailVerified: true, // Google emails are pre-verified
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          mobile: false
        }
      }
    });

    await user.save();
    return done(null, user, { status: 'new' });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

