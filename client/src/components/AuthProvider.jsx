import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/profile');
          setUser(response.data.user);
          setIsGuestMode(false);
        } catch (error) {
          console.error('Failed to load user:', error);
          logout();
        }
      } else {
        // Check if user wants to continue as guest
        const guestMode = localStorage.getItem('guestMode') === 'true';
        setIsGuestMode(guestMode);
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Complete OAuth login by accepting a token from a redirect/callback
  const completeOAuthLogin = async (incomingToken) => {
    try {
      if (!incomingToken) throw new Error('Missing token');
      // Persist token and set axios header immediately
      localStorage.setItem('token', incomingToken);
      setToken(incomingToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${incomingToken}`;

      // Fetch profile so UI updates without a full page reload
      const response = await axios.get('/api/auth/profile');
      setUser(response.data.user);
      setIsGuestMode(false);
      return { success: true };
    } catch (error) {
      // If anything fails, clear token state
      console.error('OAuth completion failed:', error);
      localStorage.removeItem('token');
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'OAuth login failed' 
      };
    }
  };

  const login = async (identifierOrEmail, password) => {
    try {
      // Accept either email or mobile as 'identifier'
      const payload = identifierOrEmail?.includes('@')
        ? { email: identifierOrEmail, password }
        : { identifier: identifierOrEmail, password };
      const response = await axios.post('/api/auth/login', payload);
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (name, email, password, mobile) => {
    try {
      const response = await axios.post('/api/auth/register', { 
        name, 
        email, 
        password, 
        mobile 
      });
      
      return { 
        success: true, 
        message: response.data.message 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await axios.post('/api/auth/verify-email', { token });
      const newToken = response.data?.token;
      const userData = response.data?.user;
      if (newToken && userData) {
        localStorage.setItem('token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
        setIsGuestMode(false);
      }
      return { 
        success: true, 
        message: response.data.message,
        token: newToken,
        user: userData
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Email verification failed' 
      };
    }
  };

  // Removed mobile verification

  const resendEmailVerification = async (email) => {
    try {
      const response = await axios.post('/api/auth/resend-email-verification', { email });
      return { 
        success: true, 
        message: response.data.message 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to resend verification email' 
      };
    }
  };

  // Removed mobile OTP resend

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsGuestMode(false);
    localStorage.removeItem('token');
    localStorage.removeItem('guestMode');
    delete axios.defaults.headers.common['Authorization'];
  };

  const enterGuestMode = () => {
    setUser(null);
    setToken(null);
    setIsGuestMode(true);
    localStorage.setItem('guestMode', 'true');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const exitGuestMode = () => {
    setIsGuestMode(false);
    localStorage.removeItem('guestMode');
  };

  const updateProfile = async (updates) => {
    try {
      const response = await axios.put('/api/auth/profile', updates);
      setUser(response.data.user);
      return { 
        success: true, 
        message: 'Profile updated successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update profile' 
      };
    }
  };

  const value = {
    user,
    loading,
    token,
    isGuestMode,
    login,
    register,
    verifyEmail,
    resendEmailVerification,
    logout,
    updateProfile,
    enterGuestMode,
    exitGuestMode,
    completeOAuthLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
