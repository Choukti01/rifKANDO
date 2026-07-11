import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const normalizeUser = (user) => ({
  ...user,
  sellerType: user.sellerType || user.seller_type || null
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const fetchUser = useCallback(async () => {
    try {
      const response = await getMe();
      const userData = response.data.data?.user || response.data.user;
      const normalizedUser = normalizeUser(userData);
      setUser(normalizedUser);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchUser();
    } else {
      delete api.defaults.headers.common.Authorization;
      setLoading(false);
    }
  }, [token, fetchUser]);

  const completeAuthentication = useCallback((response, successMessage) => {
    const authenticatedUser = response.data.data?.user || response.data.user;
    const authenticatedToken = response.data.token;
    if (!authenticatedToken || !authenticatedUser) throw new Error('Invalid authentication response');

    const normalizedUser = normalizeUser(authenticatedUser);
    localStorage.setItem('token', authenticatedToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(authenticatedToken);
    setUser(normalizedUser);
    toast.success(successMessage);
    return { success: true, user: normalizedUser };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return completeAuthentication(response, 'Welcome back to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
      return { success: false };
    }
  }, [completeAuthentication]);

  const register = useCallback(async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: Boolean(response.data.verificationRequired) };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
      return { success: false };
    }
  }, []);

  const verifyEmail = useCallback(async (email, code) => {
    try {
      const response = await api.post('/auth/verify-email', { email, code });
      return completeAuthentication(response, 'Your email is verified. Welcome to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Verification failed');
      return { success: false };
    }
  }, [completeAuthentication]);

  const googleLogin = useCallback(async (credential) => {
    try {
      const response = await api.post('/auth/google', { credential });
      if (response.data.verificationRequired) {
        return { success: false, verificationRequired: true };
      }
      const authenticatedUser = response.data.data?.user || response.data.user;
      const authenticatedToken = response.data.token;

      if (!authenticatedToken || !authenticatedUser) {
        throw new Error('Invalid Google authentication response');
      }

      const normalizedUser = normalizeUser(authenticatedUser);
      localStorage.setItem('token', authenticatedToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setToken(authenticatedToken);
      setUser(normalizedUser);
      toast.success('Welcome to rifKANDO!');
      return { success: true, user: normalizedUser };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Google sign-in failed');
      return { success: false };
    }
  }, []);

  const verifyGoogleRegistration = useCallback(async (credential, code) => {
    try {
      const response = await api.post('/auth/google/verify', { credential, code });
      const authenticatedUser = response.data.data?.user || response.data.user;
      const authenticatedToken = response.data.token;
      if (!authenticatedToken || !authenticatedUser) throw new Error('Invalid verification response');

      const normalizedUser = normalizeUser(authenticatedUser);
      localStorage.setItem('token', authenticatedToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setToken(authenticatedToken);
      setUser(normalizedUser);
      toast.success('Your account has been verified. Welcome to rifKANDO!');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Verification failed');
      return { success: false };
    }
  }, []);

  const resendGoogleVerification = useCallback(async (credential) => {
    try {
      await api.post('/auth/google/resend-verification', { credential });
      toast.success('A new verification code was sent.');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not resend the verification code');
      return { success: false };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    const normalizedUser = normalizeUser(updatedUser);
    setUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  }, []);

  const updateSellerType = useCallback(async (sellerType) => {
    try {
      const response = await api.patch('/users/update-seller-type', { sellerType });
      const updatedUser = response.data.data?.user;
      if (!response.data.success || !updatedUser) throw new Error('Update failed');

      const normalizedUser = normalizeUser({ ...updatedUser, sellerType });
      setUser(normalizedUser);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      toast.success(`You are now a ${sellerType} seller!`);
      return { success: true, user: normalizedUser };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update seller type');
      return { success: false };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    token,
    isAuthenticated: Boolean(user),
    login,
    register,
    verifyEmail,
    googleLogin,
    verifyGoogleRegistration,
    resendGoogleVerification,
    logout,
    updateUser,
    updateSellerType
  }), [user, loading, token, login, register, verifyEmail, googleLogin, verifyGoogleRegistration, resendGoogleVerification, logout, updateUser, updateSellerType]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
