import React, { useCallback, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, googleLogin, verifyGoogleRegistration, resendGoogleVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) navigate('/');
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) navigate('/');
    if (result.verificationRequired) setPendingCredential(credentialResponse.credential);
  }, [googleLogin, navigate]);

  const handleGoogleVerification = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await verifyGoogleRegistration(pendingCredential, verificationCode);
    setSubmitting(false);
    if (result.success) navigate('/');
  };

  return (
    <main className="auth-page"><section className="auth-card">
      <h1>Welcome back</h1><p>Sign in to your rifKANDO account.</p>
      {pendingCredential ? (
        <form onSubmit={handleGoogleVerification}>
          <label>Code sent to your Google email<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))} required value={verificationCode} /></label>
          <button disabled={submitting || verificationCode.length !== 6} type="submit">Verify and continue</button>
          <button className="link-button" onClick={() => resendGoogleVerification(pendingCredential)} type="button">Resend code</button>
        </form>
      ) : <>
        <form onSubmit={handleLogin}>
          <label>Email<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label>Password<input autoComplete="current-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          <button disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="divider">or</div>
        <div className="google"><GoogleLogin onError={() => toast.error('Google sign-in was cancelled or failed')} onSuccess={handleGoogleSuccess} theme="outline" width="320" /></div>
        <p className="switch">New here? <Link to="/register">Create an account</Link></p>
      </>}
    </section><style>{styles}</style></main>
  );
};

const styles = `.auth-page{min-height:70vh;display:grid;place-items:center;padding:3rem 1rem}.auth-card{width:min(100%,420px);padding:2.5rem;border-radius:16px;background:#fff;box-shadow:0 12px 32px rgba(0,0,0,.1)}.auth-card h1{margin:0 0 .5rem}.auth-card p{color:#6b7280}.auth-card form{display:grid;gap:1rem;margin-top:1.5rem}.auth-card label{display:grid;gap:.4rem;font-weight:600}.auth-card input{border:1px solid #d1d5db;border-radius:8px;padding:.75rem;font:inherit}.auth-card button{border:0;border-radius:8px;background:#111827;color:#fff;cursor:pointer;padding:.8rem;font:inherit}.auth-card button:disabled{opacity:.6}.divider{color:#6b7280;margin:1.5rem 0;text-align:center}.google{display:flex;justify-content:center}.switch{text-align:center}.link-button{background:none!important;color:#2563eb!important;padding:0!important}`;

export default LoginPage;
