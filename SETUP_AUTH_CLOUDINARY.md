# QuizHive.ai - Authentication & Cloudinary Setup Guide

This guide will help you set up user authentication with email/mobile OTP, Google OAuth, and Cloudinary PDF storage for the QuizHive.ai application.

## 🚀 Features Added

### ✅ User Authentication
- **Email/Password Registration & Login**
- **Mobile OTP Verification** (via Twilio SMS)
- **Google OAuth Integration**
- **JWT Token-based Authentication**
- **Email Verification System**

### ✅ Cloudinary Integration
- **PDF Storage on Cloudinary**
- **Automatic file cleanup**
- **Secure file access**
- **User-specific file organization**

### ✅ User Data Isolation
- **Per-user PDF uploads**
- **User-specific chat history**
- **Individual progress tracking**
- **Secure data access**

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** (local or cloud)
3. **Cloudinary Account** (free tier available)
4. **Twilio Account** (for SMS OTP)
5. **Gmail App Password** (for email verification)
6. **Google OAuth Credentials**

## 🔧 Setup Instructions

### 1. Install Dependencies

The required dependencies have already been installed. If you need to reinstall:

```bash
# Server dependencies
cd server
npm install cloudinary jsonwebtoken bcryptjs nodemailer twilio passport passport-google-oauth20 passport-jwt express-session cors

# Client dependencies
cd ../client
npm install axios react-router-dom
```

### 2. Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/quizhive

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@quizhive.ai

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# App URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# Session
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Optional: Existing config
EMBEDDINGS_ENABLED=true
EMBEDDINGS_MAX_CHARS=4000
```

### 3. Service Setup

#### A. Cloudinary Setup
1. Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Add them to your `.env` file

#### B. Twilio Setup (for SMS OTP)
1. Go to [twilio.com](https://twilio.com) and create an account
2. Get a phone number and your Account SID and Auth Token
3. Add them to your `.env` file

#### C. Gmail App Password (for Email)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password for "Mail"
3. Use this password in your `.env` file

#### D. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Add your Client ID and Secret to `.env`

### 4. Database Setup

The application will automatically create the necessary collections when you start the server. Make sure MongoDB is running:

```bash
# Start MongoDB (if using local installation)
mongod
```

### 5. Start the Application

```bash
# Start the server
cd server
npm start

# Start the client (in a new terminal)
cd client
npm run dev
```

## 🔐 Authentication Flow

### Registration
1. User fills out registration form with name, email, password, and optional mobile
2. System creates user account and sends verification email
3. If mobile provided, sends OTP via SMS
4. User verifies email and mobile (optional)
5. User can now access the application

### Login
1. User enters email and password
2. System validates credentials
3. Returns JWT token for authenticated requests
4. User is redirected to the main application

### Google OAuth
1. User clicks "Continue with Google"
2. Redirected to Google OAuth
3. After authorization, redirected back with user data
4. System creates or links user account
5. User is logged in automatically

## 📁 File Structure

```
server/
├── src/
│   ├── lib/
│   │   ├── cloudinary.js      # Cloudinary integration
│   │   ├── email.js           # Email service
│   │   ├── sms.js             # SMS service
│   │   ├── passport.js        # Passport strategies
│   │   └── config.js          # Configuration
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── models/
│   │   ├── User.js            # User model
│   │   ├── Document.js        # Updated document model
│   │   └── Chat.js            # Updated chat model
│   └── routes/
│       ├── auth.js            # Authentication routes
│       └── upload.js          # Updated upload routes

client/
├── src/
│   ├── components/
│   │   ├── AuthProvider.jsx   # Authentication context
│   │   ├── LoginForm.jsx      # Login component
│   │   └── RegisterForm.jsx   # Registration component
│   └── ui/
│       ├── pages/
│       │   └── Auth.jsx       # Authentication page
│       └── App.jsx            # Updated main app
```

## 🛡️ Security Features

- **JWT Token Authentication** with configurable expiration
- **Password Hashing** using bcryptjs
- **Email Verification** to prevent fake accounts
- **Mobile OTP Verification** for additional security
- **User Data Isolation** - users can only access their own data
- **Rate Limiting** to prevent abuse
- **Secure File Storage** on Cloudinary with access controls

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/verify-mobile` - Mobile OTP verification
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### File Management (Protected)
- `GET /api/upload` - Get user's documents
- `POST /api/upload` - Upload PDF (with Cloudinary)
- `GET /api/upload/:id` - Get specific document
- `GET /api/upload/:id/file` - Get PDF file
- `DELETE /api/upload/:id` - Delete document

## 🚨 Important Notes

1. **Environment Variables**: Never commit your `.env` file to version control
2. **JWT Secret**: Use a strong, random secret for production
3. **HTTPS**: Use HTTPS in production for secure token transmission
4. **Rate Limiting**: Configure appropriate rate limits for your use case
5. **File Cleanup**: The system automatically cleans up local files after Cloudinary upload
6. **User Data**: Each user's data is completely isolated from others

## 🐛 Troubleshooting

### Common Issues

1. **Cloudinary Upload Fails**
   - Check your Cloudinary credentials
   - Ensure your account has sufficient storage

2. **Email Not Sending**
   - Verify Gmail app password is correct
   - Check if 2FA is enabled on Gmail

3. **SMS OTP Not Working**
   - Verify Twilio credentials
   - Check if phone number is in correct format

4. **Google OAuth Issues**
   - Verify redirect URI matches exactly
   - Check if Google+ API is enabled

5. **Database Connection Issues**
   - Ensure MongoDB is running
   - Check connection string format

## 📞 Support

If you encounter any issues during setup, please check:
1. All environment variables are correctly set
2. All services (MongoDB, Cloudinary, Twilio) are accessible
3. Dependencies are properly installed
4. Ports 5000 and 5173 are available

The application now provides a complete user authentication system with secure file storage and user data isolation!

