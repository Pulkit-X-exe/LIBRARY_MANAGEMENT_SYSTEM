import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session on app initialization
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            const userData = res.data.user;
            userData.profile_picture = userData.profile_picture || userData.avatar || '';
            userData.avatar = userData.profile_picture;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.response?.data?.message || err.message);
          logout();
        }
      } else {
        // Clear any residual user state
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Real backend credentials authentication
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const userData = res.data.user;
      userData.profile_picture = userData.profile_picture || userData.avatar || '';
      userData.avatar = userData.profile_picture;

      setToken(res.data.token);
      setUser(userData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  // Step 1: User registration submission (supports FormData with profile image)
  const register = async (userData) => {
    const isFormData = userData instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};

    const res = await api.post('/auth/register', userData, config);
    if (res.data.success) {
      return res.data;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  // Step 2: Verify Signup Email with 6-digit OTP
  const verifySignupEmail = async (email, code) => {
    const res = await api.post('/auth/verify-signup-email', { email, code });
    if (res.data.success) {
      return res.data;
    }
    throw new Error(res.data.message || 'Verification failed');
  };

  // Resend Signup Verification Code (60s cooldown enforced)
  const resendSignupVerification = async (email) => {
    const res = await api.post('/auth/resend-signup-verification', { email });
    if (res.data.success) {
      return res.data;
    }
    throw new Error(res.data.message || 'Failed to resend code');
  };

  // Update profile information
  const updateProfile = async (profileData) => {
    const res = await api.put('/auth/profile', profileData);
    if (res.data.success) {
      const updatedUser = res.data.user;
      updatedUser.profile_picture = updatedUser.profile_picture || updatedUser.avatar || '';
      updatedUser.avatar = updatedUser.profile_picture;

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    }
    throw new Error(res.data.message || 'Failed to update profile');
  };

  // Change Profile Picture
  const updateProfilePicture = async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);

    const res = await api.post('/auth/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.data.success) {
      const updatedUser = res.data.user;
      updatedUser.profile_picture = res.data.profile_picture || updatedUser.profile_picture;
      updatedUser.avatar = updatedUser.profile_picture;

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    }
    throw new Error(res.data.message || 'Failed to update profile picture');
  };

  // Sign out cleanly
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Refresh current user data
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const userData = res.data.user;
        userData.profile_picture = userData.profile_picture || userData.avatar || '';
        userData.avatar = userData.profile_picture;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  // Request 6-digit password reset verification code via email
  const requestPasswordReset = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  // Verify submitted 6-digit OTP code
  const verifyPasswordResetCode = async (email, code) => {
    const res = await api.post('/auth/verify-reset-code', { email, code });
    return res.data;
  };

  // Reset password using authorized reset token from OTP verification
  const completePasswordReset = async (email, resetAuthToken, new_password, confirm_password) => {
    const res = await api.post('/auth/reset-password', {
      email,
      resetAuthToken,
      new_password,
      confirm_password
    });
    return res.data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      verifySignupEmail,
      resendSignupVerification,
      updateProfile,
      updateProfilePicture,
      logout,
      refreshUser,
      requestPasswordReset,
      verifyPasswordResetCode,
      completePasswordReset,
      isAuthenticated: !!user && !!token,
      role: user ? user.role : null
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
