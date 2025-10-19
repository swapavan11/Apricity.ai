import twilio from 'twilio';
import { config } from './config.js';

// Initialize Twilio client
const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

// Send OTP via SMS (optionally personalized with name)
export const sendOTP = async (mobile, otp, name) => {
  try {
    const greeting = name ? `Hi ${name}, ` : '';
    const message = await client.messages.create({
      body: `${greeting}your QuizHive.ai verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: config.TWILIO_PHONE_NUMBER,
      to: mobile
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status
    };
  } catch (error) {
    console.error('SMS OTP error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Send welcome SMS
export const sendWelcomeSMS = async (mobile, name) => {
  try {
    const message = await client.messages.create({
      body: `Welcome to QuizHive.ai, ${name}! Your mobile number has been verified. Start your AI-powered quiz & study journey now.`,
      from: config.TWILIO_PHONE_NUMBER,
      to: mobile
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status
    };
  } catch (error) {
    console.error('Welcome SMS error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Send password reset SMS
export const sendPasswordResetSMS = async (mobile, name, resetUrl) => {
  try {
    const message = await client.messages.create({
      body: `Hi ${name}, reset your QuizHive.ai password: ${resetUrl}. This link expires in 1 hour.`,
      from: config.TWILIO_PHONE_NUMBER,
      to: mobile
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status
    };
  } catch (error) {
    console.error('Password reset SMS error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Validate mobile number format
export const validateMobileNumber = (mobile) => {
  if (!mobile || typeof mobile !== 'string') {
    return { valid: false, error: 'Mobile number required' };
  }

  // If number already includes +, assume E.164-ish and validate length
  const trimmed = mobile.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return { valid: false, error: 'Invalid mobile number length' };
    }
    return { valid: true, formatted: `+${digits}` };
  }

  // Otherwise, remove non-digits and prepend default country code
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, error: 'Invalid mobile number length' };
  }

  const cc = (config.SMS_DEFAULT_COUNTRY_CODE || '1').replace(/\D/g, '') || '1';
  const formatted = `+${cc}${digits}`;
  return { valid: true, formatted };
};

export default { sendOTP, sendWelcomeSMS, sendPasswordResetSMS, validateMobileNumber };

