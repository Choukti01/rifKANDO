import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { clearCsrfToken, getMe, setCsrfToken } from '../services/api';
import toast from 'react-hot-toast';
import AuthContext from './authStore';

const normalizeUser = (user) => ({
  ...user,
  sellerType: user.sellerType || user.seller_type || null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSessionState = useCallback(() => {
    clearCsrfToken();
    setUser(null);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    // Invalidate credentials from the legacy localStorage implementation.
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const initializeSession = async () => {
      try {
        const response = await getMe();
        const userData = response.data.data?.user || response.data.user;
        if (!userData || !response.data.csrfToken) throw new Error('Invalid session response');
        if (!isCurrent) return;

        setCsrfToken(response.data.csrfToken);
        setUser(normalizeUser(userData));
      } catch {
        if (!isCurrent) return;

        clearCsrfToken();
        setUser(null);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void initializeSession();

    const handleSessionExpiry = () => {
      clearSessionState();
      setLoading(false);
    };
    window.addEventListener('rifkando:session-expired', handleSessionExpiry);
    return () => {
      isCurrent = false;
      window.removeEventListener('rifkando:session-expired', handleSessionExpiry);
    };
  }, [clearSessionState]);

  const completeAuthentication = useCallback((response, successMessage) => {
    const authenticatedUser = response.data.data?.user || response.data.user;
    if (!authenticatedUser || !response.data.csrfToken) throw new Error('Invalid authentication response');

    setCsrfToken(response.data.csrfToken);
    const normalizedUser = normalizeUser(authenticatedUser);
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
      if (response.data.verificationRequired) return { success: false, verificationRequired: true };
      return completeAuthentication(response, 'Welcome to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Google sign-in failed');
      return { success: false };
    }
  }, [completeAuthentication]);

  const verifyGoogleRegistration = useCallback(async (credential, code) => {
    try {
      const response = await api.post('/auth/google/verify', { credential, code });
      return completeAuthentication(response, 'Your account has been verified. Welcome to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Verification failed');
      return { success: false };
    }
  }, [completeAuthentication]);

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

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // The local state must be cleared even when an access cookie has expired.
    } finally {
      clearSessionState();
      toast.success('Logged out successfully');
    }
  }, [clearSessionState]);

  const logoutAllDevices = useCallback(async () => {
    try {
      await api.post('/auth/logout-all');
      clearSessionState();
      toast.success('Logged out from all devices');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not end all sessions');
      return { success: false };
    }
  }, [clearSessionState]);

  const updateUser = useCallback((updatedUser) => {
    setUser(normalizeUser(updatedUser));
  }, []);

  const updateSellerType = useCallback(async (sellerType) => {
    try {
      const response = await api.patch('/users/update-seller-type', { sellerType });
      const updatedUser = response.data.data?.user;
      if (!response.data.success || !updatedUser) throw new Error('Update failed');
      const normalizedUser = normalizeUser({ ...updatedUser, sellerType });
      setUser(normalizedUser);
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
    isAuthenticated: Boolean(user),
    login,
    register,
    verifyEmail,
    googleLogin,
    verifyGoogleRegistration,
    resendGoogleVerification,
    logout,
    logoutAllDevices,
    updateUser,
    updateSellerType,
  }), [user, loading, login, register, verifyEmail, googleLogin, verifyGoogleRegistration, resendGoogleVerification, logout, logoutAllDevices, updateUser, updateSellerType]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
