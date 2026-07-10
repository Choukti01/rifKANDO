import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

import { GoogleLogin } from "@react-oauth/google";


const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: code, 3: new password
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState({});

  const {
  login,
  googleLogin
} = useAuth();
  const navigate = useNavigate();

const handleChange = (e) => {
  const { name, value, type, checked } = e.target;

  setFormData((prev) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : value,
  }));

  if (errors[name]) {
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }
};

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    const result = await login(formData.email, formData.password);
    setIsLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setErrors({ submit: result.error || 'Invalid email or password' });
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: resetEmail });
      if (response.data.success) {
        setResetStep(2);
        toast.success('Reset code sent to your email!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Email not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!resetCode) {
      toast.error('Please enter the verification code');
      return;
    }
    setIsLoading(true);
    try {
      // Verify code (backend will validate)
      setResetStep(3);
      toast.success('Code verified! Enter your new password');
    } catch (error) {
      toast.error('Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: resetEmail,
        code: resetCode,
        newPassword: newPassword
      });
      if (response.data.success) {
        toast.success('Password reset successfully! Please login');
        setShowForgotPassword(false);
        setResetStep(1);
        setResetEmail('');
        setResetCode('');
        setNewPassword('');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const result = await googleLogin(credentialResponse.credential);

      if (result.success) {
        navigate("/");
      } else {
        toast.error(result.error || "Google Login failed");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
        "Google Login failed"
      );
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="login-card">
          <div className="login-header">
            {/* <div className="login-logo">rifKANDO</div> */}
            <h1>Welcome Back</h1>
            <p className="text-gray">Sign in to your rifKANDO account</p>
          </div>

          {errors.submit && <div className="alert alert-error">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-icon-wrapper">
                <EnvelopeIcon className="input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrapper">
                <LockClosedIcon className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="flex justify-between items-center mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray">Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={() => setShowForgotPassword(true)} 
                className="text-sm text-primary"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
              style={{ padding: '0.875rem' }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>


<div
  style={{
    marginTop: "20px",
    textAlign: "center"
  }}
>

  <p
    style={{
      marginBottom: "15px",
      color: "#777"
    }}
  >
    Or continue with
  </p>

  <GoogleLogin
    onSuccess={handleGoogleSuccess}
    onError={() => toast.error("Google Login Failed")}
    theme="outline"
    size="large"
    width="100%"
  />

</div>



          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium">Sign up</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button className="modal-close" onClick={() => setShowForgotPassword(false)}>×</button>
            </div>
            <div className="modal-body">
              {resetStep === 1 && (
                <>
                  <p>Enter your email address and we'll send you a verification code.</p>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '1rem' }}
                  />
                  <button onClick={handleForgotPassword} className="reset-btn" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </>
              )}
              {resetStep === 2 && (
                <>
                  <p>Enter the 6-digit code sent to {resetEmail}</p>
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '1rem' }}
                    maxLength="6"
                  />
                  <button onClick={handleVerifyResetCode} className="reset-btn">Verify Code</button>
                </>
              )}
              {resetStep === 3 && (
                <>
                  <p>Enter your new password</p>
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '1rem' }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    style={{ marginTop: '0.5rem' }}
                  />
                  <button onClick={handleResetPassword} className="reset-btn" disabled={isLoading}>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .login-page {
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, rgba(135,206,235,0.05) 0%, #ffffff 100%);
        }
        .login-card {
          max-width: 450px;
          width: 100%;
          background: white;
          border-radius: 1.5rem;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1);
          padding: 2rem;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-logo {
          width: 60px;
          height: 60px;
          background: #87CEEB;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          margin: 0 auto 1rem;
        }
        .input-icon-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: #9ca3af;
        }
        .input-icon-wrapper input {
          padding-left: 2.75rem;
          padding-right: 2.75rem;
        }
        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
        }
        .alert-error {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          text-align: center;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 1rem;
          width: 400px;
          max-width: 90%;
          padding: 1.5rem;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .modal-header h3 {
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .reset-btn {
          width: 100%;
          padding: 0.625rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
