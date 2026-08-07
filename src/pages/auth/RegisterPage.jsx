import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, verifyEmail } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const requestedPath = new URLSearchParams(location.search).get('next');
  const redirectAfterAuth = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/';

  const update = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleRegister = async (event) => {
    event.preventDefault();
    if (formData.password !== formData.confirmPassword) return;
    setSubmitting(true);
    const result = await register({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password });
    setSubmitting(false);
    if (result.success) setPending(true);
  };

  const handleVerification = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await verifyEmail(formData.email, code);
    setSubmitting(false);
    if (result.success) navigate(redirectAfterAuth, { replace: true });
  };

  return (
    <main className="auth-page"><section className="auth-card">
      <h1>{pending ? 'Verify your email' : 'Create your account'}</h1>
      {pending ? <form onSubmit={handleVerification}>
        <p>We sent a six-digit code to <strong>{formData.email}</strong>.</p>
        <label>Verification code<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required value={code} /></label>
        <button disabled={submitting || code.length !== 6} type="submit">{submitting ? 'Verifying…' : 'Verify account'}</button>
      </form> : <form onSubmit={handleRegister}>
        <label>Full name<input name="name" onChange={update} required value={formData.name} /></label>
        <label>Email<input autoComplete="email" name="email" onChange={update} required type="email" value={formData.email} /></label>
        <label>Phone <span>(optional)</span><input autoComplete="tel" name="phone" onChange={update} type="tel" value={formData.phone} /></label>
        <label>Password<input autoComplete="new-password" minLength={8} name="password" onChange={update} required type="password" value={formData.password} /></label>
        <label>Confirm password<input autoComplete="new-password" minLength={8} name="confirmPassword" onChange={update} required type="password" value={formData.confirmPassword} /></label>
        <button disabled={submitting} type="submit">{submitting ? 'Sending code…' : 'Create account'}</button>
      </form>}
      {!pending && <p className="switch">Already registered? <Link to={`/login${location.search}`}>Sign in</Link></p>}
    </section><style>{styles}</style></main>
  );
};

const styles = `.auth-page{min-height:70vh;display:grid;place-items:center;padding:3rem 1rem}.auth-card{width:min(100%,460px);padding:2.5rem;border-radius:16px;background:#fff;box-shadow:0 12px 32px rgba(0,0,0,.1)}.auth-card h1{margin:0 0 .5rem}.auth-card form{display:grid;gap:1rem;margin-top:1.5rem}.auth-card label{display:grid;gap:.4rem;font-weight:600}.auth-card label span{font-weight:400}.auth-card input{border:1px solid #d1d5db;border-radius:8px;padding:.75rem;font:inherit}.auth-card button{border:0;border-radius:8px;background:#111827;color:#fff;cursor:pointer;padding:.8rem;font:inherit}.auth-card button:disabled{opacity:.6}.switch{text-align:center;color:#6b7280}`;

export default RegisterPage;
