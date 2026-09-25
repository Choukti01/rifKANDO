import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { browserSupportsPasskeys, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import api, { clearCsrfToken, getAuthMethods, getSession, setCsrfToken } from '../services/api';
import toast from 'react-hot-toast';
import AuthContext from './authStore';

const normalizeUser = (user) => ({
  ...user,
  sellerType: user.sellerType || user.seller_type || null,
});

const googleClientConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMethods, setAuthMethods] = useState({ google: googleClientConfigured, phone: false, passkey: true });

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
      const [sessionResult, methodsResult] = await Promise.allSettled([getSession(), getAuthMethods()]);
      try {
        if (methodsResult.status === 'fulfilled' && methodsResult.value.data?.methods) {
          setAuthMethods({
            google: googleClientConfigured && Boolean(methodsResult.value.data.methods.google),
            phone: Boolean(methodsResult.value.data.methods.phone),
            passkey: Boolean(methodsResult.value.data.methods.passkey),
          });
        }
        if (sessionResult.status !== 'fulfilled' || !sessionResult.value.data?.authenticated) {
          throw sessionResult.reason || new Error('No active session');
        }
        const response = sessionResult.value;
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

  const requestPhoneRegistrationCode = useCallback(async ({ name, phone }) => {
    try {
      const response = await api.post('/auth/phone/register/request-code', { name, phone });
      toast.success(response.data.message || 'An SMS code was sent to your phone.');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send the SMS code.');
      return { success: false };
    }
  }, []);

  const verifyPhoneRegistration = useCallback(async ({ name, phone, code }) => {
    try {
      const response = await api.post('/auth/phone/register/verify', { name, phone, code });
      return completeAuthentication(response, 'Welcome to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'The SMS code could not be verified.');
      return { success: false };
    }
  }, [completeAuthentication]);

  const requestPhoneLoginCode = useCallback(async (phone) => {
    try {
      const response = await api.post('/auth/phone/login/request-code', { phone });
      toast.success(response.data.message || 'If an account exists, an SMS code was sent.');
      return { success: true, verificationRequired: Boolean(response.data.verificationRequired) };
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send the SMS code.');
      return { success: false };
    }
  }, []);

  const verifyPhoneLogin = useCallback(async ({ phone, code }) => {
    try {
      const response = await api.post('/auth/phone/login/verify', { phone, code });
      return completeAuthentication(response, 'Welcome back to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'The SMS code could not be verified.');
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

  const passkeySupported = useCallback(async () => {
    const supported = await browserSupportsPasskeys();
    if (!supported) toast.error('Passkeys are not available in this browser or device.');
    return supported;
  }, []);

  const registerWithPasskey = useCallback(async ({ name }) => {
    try {
      if (!(await passkeySupported())) return { success: false };
      const optionsResponse = await api.post('/auth/passkeys/register/options', { name });
      const credential = await startRegistration({ optionsJSON: optionsResponse.data.options });
      const verified = await api.post('/auth/passkeys/register/verify', { credential });
      return completeAuthentication(verified, 'Your passkey is ready. Welcome to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Passkey registration failed.');
      return { success: false };
    }
  }, [completeAuthentication, passkeySupported]);

  const loginWithPasskey = useCallback(async () => {
    try {
      if (!(await passkeySupported())) return { success: false };
      const optionsResponse = await api.post('/auth/passkeys/login/options');
      const credential = await startAuthentication({ optionsJSON: optionsResponse.data.options });
      const verified = await api.post('/auth/passkeys/login/verify', { credential });
      return completeAuthentication(verified, 'Welcome back to rifKANDO!');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Passkey sign-in failed.');
      return { success: false };
    }
  }, [completeAuthentication, passkeySupported]);

  const addPasskey = useCallback(async () => {
    try {
      if (!(await passkeySupported())) return { success: false };
      const optionsResponse = await api.post('/auth/passkeys/options');
      const credential = await startRegistration({ optionsJSON: optionsResponse.data.options });
      await api.post('/auth/passkeys/verify', { credential });
      toast.success('A new passkey was added.');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Could not add this passkey.');
      return { success: false };
    }
  }, [passkeySupported]);

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
    authMethods,
    isAuthenticated: Boolean(user),
    login,
    register,
    verifyEmail,
    requestPhoneRegistrationCode,
    verifyPhoneRegistration,
    requestPhoneLoginCode,
    verifyPhoneLogin,
    googleLogin,
    registerWithPasskey,
    loginWithPasskey,
    addPasskey,
    verifyGoogleRegistration,
    resendGoogleVerification,
    logout,
    logoutAllDevices,
    updateUser,
    updateSellerType,
  }), [user, loading, authMethods, login, register, verifyEmail, requestPhoneRegistrationCode, verifyPhoneRegistration, requestPhoneLoginCode, verifyPhoneLogin, googleLogin, registerWithPasskey, loginWithPasskey, addPasskey, verifyGoogleRegistration, resendGoogleVerification, logout, logoutAllDevices, updateUser, updateSellerType]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
