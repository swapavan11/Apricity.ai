import nodemailer from 'nodemailer';
import { config } from './config.js';

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS,
    },
  });
};

// Send email verification
export const sendEmailVerification = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"QuizHive.ai" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Verify Your Email - QuizHive.ai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to QuizHive.ai!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your AI-powered quiz & study companion</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for signing up with QuizHive.ai. To complete your registration and start using our AI-powered quiz & study features, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              This verification link will expire in 24 hours. If you didn't create an account with QuizHive.ai, you can safely ignore this email.
            </p>
          </div>
          
          <div style="background: #2c3e50; padding: 20px; text-align: center; color: white;">
              <p style="margin: 0; font-size: 14px; opacity: 0.8;">
              © 2024 QuizHive.ai. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email verification error:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordReset = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `"QuizHive.ai" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Reset Your Password - QuizHive.ai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">QuizHive.ai</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password for your QuizHive.ai account. Click the button below to reset your password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          
          <div style="background: #2c3e50; padding: 20px; text-align: center; color: white;">
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">
              © 2024 QuizHive.ai. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"QuizHive.ai" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to QuizHive.ai! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to QuizHive.ai! 🎉</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your AI-powered quiz & study journey starts now</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Congratulations! Your email has been verified and your QuizHive.ai account is now active. 
              You can now start uploading PDFs, taking quizzes, and chatting with your AI tutor.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">What you can do now:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>📄 Upload PDF documents for AI analysis</li>
                <li>🤖 Chat with your AI tutor about your documents</li>
                <li>📝 Generate and take customized quizzes</li>
                <li>📊 Track your learning progress and performance</li>
                <li>📺 Get YouTube recommendations based on your studies</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${config.FRONTEND_URL}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;">
                Start Learning Now
              </a>
            </div>
          </div>
          
          <div style="background: #2c3e50; padding: 20px; text-align: center; color: white;">
              <p style="margin: 0; font-size: 14px; opacity: 0.8;">
              © 2024 QuizHive.ai. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false, error: error.message };
  }
};

export default { sendEmailVerification, sendPasswordReset, sendWelcomeEmail };



// import nodemailer from 'nodemailer';
// import { config } from './config.js';

// // Create email transporter
// const createTransporter = () => {
//   return nodemailer.createTransporter({
//     host: config.EMAIL_HOST,
//     port: config.EMAIL_PORT,
//     secure: config.EMAIL_PORT === 465, // true for 465, false for other ports
//     auth: {
//       user: config.EMAIL_USER,
//       pass: config.EMAIL_PASS,
//     },
//   });
// };

// // Send email verification
// export const sendEmailVerification = async (email, name, token) => {
//   try {
//     const transporter = createTransporter();
//     const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;
    
//     const mailOptions = {
//       from: `"BeyondChats" <${config.EMAIL_FROM}>`,
//       to: email,
//       subject: 'Verify Your Email - BeyondChats',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
//             <h1 style="margin: 0; font-size: 28px;">Welcome to BeyondChats!</h1>
//             <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your AI-powered study companion</p>
//           </div>
          
//           <div style="padding: 30px; background: #f8f9fa;">
//             <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
//             <p style="color: #666; line-height: 1.6;">
//               Thank you for signing up with BeyondChats. To complete your registration and start using our AI-powered study features, please verify your email address.
//             </p>
            
//             <div style="text-align: center; margin: 30px 0;">
//               <a href="${verificationUrl}" 
//                  style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
//                         color: white; 
//                         padding: 15px 30px; 
//                         text-decoration: none; 
//                         border-radius: 8px; 
//                         font-weight: bold; 
//                         display: inline-block;">
//                 Verify Email Address
//               </a>
//             </div>
            
//             <p style="color: #666; font-size: 14px; line-height: 1.6;">
//               If the button doesn't work, you can copy and paste this link into your browser:<br>
//               <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
//             </p>
            
//             <p style="color: #666; font-size: 14px; line-height: 1.6;">
//               This verification link will expire in 24 hours. If you didn't create an account with BeyondChats, you can safely ignore this email.
//             </p>
//           </div>
          
//           <div style="background: #2c3e50; padding: 20px; text-align: center; color: white;">
//             <p style="margin: 0; font-size: 14px; opacity: 0.8;">
//               © 2024 BeyondChats. All rights reserved.
//             </p>
//           </div>
//         </div>
//       `
//     };

//     const result = await transporter.sendMail(mailOptions);
//     return { success: true, messageId: result.messageId };
//   } catch (error) {
//     console.error('Email verification error:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Send password reset email
// export const sendPasswordReset = async (email, name, token) => {
//   try {
//     const transporter = createTransporter();
//     const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
    
//     const mailOptions = {
//       from: `"BeyondChats" <${config.EMAIL_FROM}>`,
//       to: email,
//       subject: 'Reset Your Password - BeyondChats',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
//             <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
//             <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">BeyondChats</p>
//           </div>
          
//           <div style="padding: 30px; background: #f8f9fa;">
//             <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
//             <p style="color: #666; line-height: 1.6;">
//               We received a request to reset your password for your BeyondChats account. Click the button below to reset your password.
//             </p>
            
//             <div style="text-align: center; margin: 30px 0;">
//               <a href="${resetUrl}" 
//                  style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
//                         color: white; 
//                         padding: 15px 30px; 
//                         text-decoration: none; 
//                         border-radius: 8px; 
//                         font-weight: bold; 
//                         display: inline-block;">
//                 Reset Password
//               </a>
//             </div>
            
//             <p style="color: #666; font-size: 14px; line-height: 1.6;">
//               If the button doesn't work, you can copy and paste this link into your browser:<br>
//               <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
//             </p>
            
//             <p style="color: #666; font-size: 14px; line-height: 1.6;">
//               This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
//             </p>
//           </div>
          
//           <div style="background: #2c3e50; padding: 20px; text-align: center; color: white;">
//             <p style="margin: 0; font-size: 14px; opacity: 0.8;">
//               © 2024 BeyondChats. All rights reserved.
//             </p>
//           </div>
//         </div>
//       `
//     };

//     const result = await transporter.sendMail(mailOptions);
//     return { success: true, messageId: result.messageId };
//   } catch (error) {
//     console.error('Password reset email error:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Send welcome email
// export const sendWelcomeEmail = async (email, name) => {
//   try {
//     const transporter = createTransporter();
    
//     const mailOptions = {
//       from: `"BeyondChats" <${config.EMAIL_FROM}>`,
//       to: email,
//       subject: 'Welcome to BeyondChats! 🎉',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
//             <h1 style="margin: 0; font-size: 28px;">Welcome to BeyondChats! 🎉</h1>
//             <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your AI-powered study journey starts now</p>
//           </div>
          
//           <div style="padding: 30px; background: #f8f9fa;">
//             <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
//             <p style="color: #666; line-height: 1.6;">
//               Congratulations! Your email has been verified and your BeyondChats account is now active. 
//               You can now start uploading PDFs, taking quizzes, and chatting with your AI tutor.
//             </p>
            
//             <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
//               <h3 style="color: #333; margin-top: 0;">What you can do now:</h3>
//               <ul style="color: #666; line-height: 1.8;">
//                 <li>📄 Upload PDF documents for AI analysis</li>
//                 <li>🤖 Chat with your AI tutor about your documents</li>
//                 <li>📝 Generate and take customized quizzes</li>
//                 <li>📊 Track your learning progress and performance</li>
//                 <li>📺 Get YouTube recommendations based on your studies</li>
//               </ul>
//             </div>
            
//             <div style="text-align: center; margin: 30px 0;">
//               <a href="${config.FRONTEND_URL}" 
//                  style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
//                         color: white; 
//                         padding: 15px 30px; 
//                         text-decoration: none; 
//                         border-radius: 8px; 
//                         font-weight: bold; 
//                         display: inline-block;">
//                 Start Learning Now
//               </a>
//             </div>
//           </div>
          
//           <div style="background: #2c3e50; padding: 20px; text-align: center; color: white;">
//             <p style="margin: 0; font-size: 14px; opacity: 0.8;">
//               © 2024 BeyondChats. All rights reserved.
//             </p>
//           </div>
//         </div>
//       `
//     };

//     const result = await transporter.sendMail(mailOptions);
//     return { success: true, messageId: result.messageId };
//   } catch (error) {
//     console.error('Welcome email error:', error);
//     return { success: false, error: error.message };
//   }
// };

// export default { sendEmailVerification, sendPasswordReset, sendWelcomeEmail };

