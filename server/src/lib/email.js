import nodemailer from 'nodemailer';
import { config } from './config.js';

// Reusable, branded footer for all emails
const getFooterHtml = () => {
  const year = 2025;
  const github = 'https://github.com/swapavan11';
  const instagram = 'https://www.instagram.com/swapavan_11';
  const linkedin = 'https://www.linkedin.com/in/swapnil-sontakke/';

  return `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#ffffff;">
      <div style="max-width:600px; margin:0 auto;">
        <div style="padding:24px 18px; text-align:center;">
          <div style="font-size:14px; line-height:1.7; margin-bottom:14px;">
            © ${year} Apricity.ai · All rights reserved.<br/>
            Made with <span style="color:#ff9aa2">❤</span> by
            <a href="${github}" target="_blank" rel="noopener" style="color:#fff; text-decoration:underline; font-weight:700;">Swapnil Sontakke</a>
            at IIIT Gwalior
          </div>
          <div style="display:inline-flex; gap:10px; align-items:center; justify-content:center;">
            <a href="${instagram}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; background: rgba(255,255,255,0.18); color:#ffffff; padding:8px 12px; border-radius:999px; font-size:13px; font-weight:700; border:1px solid rgba(255,255,255,0.25);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#E4405F" viewBox="0 0 16 16" style="display:inline-block; vertical-align:middle;">
                <path d="M8 0C5.8 0 5.5 0 4.7.05a4.9 4.9 0 0 0-1.6.3A3.9 3.9 0 0 0 1.5 1.5a3.9 3.9 0 0 0-.85 1.6 4.9 4.9 0 0 0-.3 1.6C.3 5.5.3 5.8.3 8s0 2.5.05 3.3a4.9 4.9 0 0 0 .3 1.6 3.9 3.9 0 0 0 .85 1.6 3.9 3.9 0 0 0 1.6.85 4.9 4.9 0 0 0 1.6.3c.8.05 1.1.05 3.3.05s2.5 0 3.3-.05a4.9 4.9 0 0 0 1.6-.3 3.9 3.9 0 0 0 1.6-.85 3.9 3.9 0 0 0 .85-1.6 4.9 4.9 0 0 0 .3-1.6c.05-.8.05-1.1.05-3.3s0-2.5-.05-3.3a4.9 4.9 0 0 0-.3-1.6A3.9 3.9 0 0 0 14.5 1.5a3.9 3.9 0 0 0-1.6-.85 4.9 4.9 0 0 0-1.6-.3C10.5.3 10.2.3 8 .3ZM8 1.4c2.1 0 2.3 0 3.1.05.7 0 1.1.15 1.4.25.4.15.6.35.85.6s.45.45.6.85c.1.3.25.7.25 1.4.05.8.05 1 .05 3.1s0 2.3-.05 3.1c0 .7-.15 1.1-.25 1.4-.15.4-.35.6-.6.85s-.45.45-.85.6c-.3.1-.7.25-1.4.25-.8.05-1 .05-3.1.05s-2.3 0-3.1-.05c-.7 0-1.1-.15-1.4-.25a2.3 2.3 0 0 1-.85-.6 2.3 2.3 0 0 1-.6-.85c-.1-.3-.25-.7-.25-1.4-.05-.8-.05-1-.05-3.1s0-2.3.05-3.1c0-.7.15-1.1.25-1.4.15-.4.35-.6.6-.85s.45-.45.85-.6c.3-.1.7-.25 1.4-.25.8-.05 1-.05 3.1-.05Zm0 2.6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 6.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2ZM12.3 3.8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
              </svg>
              <span>Instagram</span>
            </a>
            <a href="${github}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; background: rgba(255,255,255,0.18); color:#ffffff; padding:8px 12px; border-radius:999px; font-size:13px; font-weight:700; border:1px solid rgba(255,255,255,0.25);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#171515" viewBox="0 0 16 16" style="display:inline-block; vertical-align:middle;">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.54 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49C3.73 14.09 3.27 12.81 3.27 12.81c-.36-.91-.89-1.15-.89-1.15-.73-.5.06-.49.06-.49.81.06 1.24.83 1.24.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-2.22-.25-4.56-1.11-4.56-4.93 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 8 3.5c.85 0 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.83-2.34 4.68-4.57 4.93.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span>GitHub</span>
            </a>
            <a href="${linkedin}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; background: rgba(255,255,255,0.18); color:#ffffff; padding:8px 12px; border-radius:999px; font-size:13px; font-weight:700; border:1px solid rgba(255,255,255,0.25);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#0A66C2" viewBox="0 0 16 16" style="display:inline-block; vertical-align:middle;">
                <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zM4.943 13.447V6.169H2.542v7.278h2.401zM3.743 5.173c.837 0 1.356-.554 1.356-1.248-.015-.709-.519-1.248-1.341-1.248S2.4 3.216 2.4 3.925c0 .694.519 1.248 1.326 1.248h.017zM13.458 13.447v-3.873c0-2.068-1.104-3.034-2.575-3.034-1.188 0-1.722.654-2.021 1.113v-.954H6.458c.03.633 0 7.278 0 7.278h2.404v-4.064c0-.217.016-.433.08-.588.173-.433.568-.883 1.232-.883.869 0 1.217.666 1.217 1.642v3.893h2.067z"/>
              </svg>
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
};

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
      from: `"Apricity.ai" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Verify Your Email - Apricity.ai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Apricity.ai!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your AI-powered quiz & study companion</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for signing up with Apricity.ai. To complete your registration and start using our AI-powered quiz & study features, please verify your email address.
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
              This verification link will expire in 24 hours. If you didn't create an account with Apricity.ai, you can safely ignore this email.
            </p>
          </div>
          ${getFooterHtml()}
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
      from: `"Apricity.ai" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Reset Your Password - Apricity.ai',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Apricity.ai</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password for your Apricity.ai account. Click the button below to reset your password.
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
          ${getFooterHtml()}
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
      from: `"Apricity.ai" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to Apricity.ai! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to Apricity.ai! 🎉</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your AI-powered quiz & study journey starts now</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Congratulations! Your email has been verified and your Apricity.ai account is now active. 
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
          ${getFooterHtml()}
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

