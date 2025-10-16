import twilio from 'twilio';
import { config } from './config.js';

// Initialize Twilio client
const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

// Send OTP via SMS
export const sendOTP = async (mobile, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your QuizHive.ai verification code is: ${otp}. This code will expire in 10 minutes.`,
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
  // Remove all non-digit characters
  const cleaned = mobile.replace(/\D/g, '');
  
  // Check if it's a valid mobile number (10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: 'Invalid mobile number length' };
  }
  
  // Add country code if not present (assuming US +1)
  const formatted = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
  
  return { valid: true, formatted };
};

export default { sendOTP, sendWelcomeSMS, sendPasswordResetSMS, validateMobileNumber };

