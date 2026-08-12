import React, { useCallback, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleLogin, requestPhoneRegistrationCode, verifyPhoneRegistration } = useAuth();
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const requestedPath = new URLSearchParams(location.search).get('next');
  const redirectAfterAuth = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/';

  const update = (event) => setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  const requestCode = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await requestPhoneRegistrationCode(formData);
    setSubmitting(false);
    if (result.success) setPending(true);
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await verifyPhoneRegistration({ ...formData, code });
    setSubmitting(false);
    if (result.success) navigate(redirectAfterAuth, { replace: true });
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) navigate(redirectAfterAuth, { replace: true });
  }, [googleLogin, navigate, redirectAfterAuth]);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <span className="auth-eyebrow">rifKANDO account</span>
        <h1 id="register-title">{pending ? 'Confirm your phone' : 'Join rifKANDO'}</h1>
        <p>{pending ? 'Enter the six-digit code we sent by SMS.' : 'Create your account with your phone number or Google account.'}</p>

        {pending ? (
          <form onSubmit={verifyCode}>
            <label>
              SMS code
              <input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required value={code} />
            </label>
            <button disabled={submitting || code.length !== 6} type="submit">{submitting ? 'Confirming...' : 'Confirm and create account'}</button>
            <button className="text-button" disabled={submitting} onClick={requestCode} type="button">Send a new code</button>
            <button className="text-button" disabled={submitting} onClick={() => { setCode(''); setPending(false); }} type="button">Change phone number</button>
          </form>
        ) : (
          <>
            <form onSubmit={requestCode}>
              <label>
                Full name
                <input autoComplete="name" name="name" onChange={update} required value={formData.name} />
              </label>
              <label>
                Mobile number
                <input autoComplete="tel" inputMode="tel" name="phone" onChange={update} placeholder="+212 6 12 34 56 78" required type="tel" value={formData.phone} />
              </label>
              <small>Use your country code. Moroccan mobile numbers can also start with 0.</small>
              <button disabled={submitting} type="submit">{submitting ? 'Sending SMS...' : 'Continue with phone'}</button>
            </form>
            <div className="divider"><span>or</span></div>
            <div className="google"><GoogleLogin onError={() => toast.error('Google sign-up was cancelled or failed.')} onSuccess={handleGoogleSuccess} theme="outline" width="320" /></div>
          </>
        )}

        {!pending && <p className="switch">Already have an account? <Link to={`/login${location.search}`}>Sign in</Link></p>}
      </section>
      <style>{styles}</style>
    </main>
  );
};

const styles = `.auth-page{min-height:70vh;display:grid;place-items:center;padding:3rem 1rem}.auth-card{width:min(100%,460px);padding:clamp(1.5rem,5vw,2.5rem);border:1px solid #d8eaf6;border-radius:20px;background:#fff;box-shadow:0 18px 48px rgba(10,27,53,.1)}.auth-eyebrow{display:block;color:var(--color-brand-blue,#63B8F3);font-size:.76rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.auth-card h1{color:var(--color-brand-ink,#0A1B35);margin:.45rem 0 .5rem}.auth-card p{color:#536273;line-height:1.55}.auth-card form{display:grid;gap:1rem;margin-top:1.5rem}.auth-card label{display:grid;gap:.45rem;color:var(--color-brand-ink,#0A1B35);font-weight:700}.auth-card input{border:1px solid #b9d9eb;border-radius:10px;padding:.8rem;font:inherit}.auth-card input:focus{border-color:var(--color-brand-blue,#63B8F3);box-shadow:0 0 0 3px rgba(99,184,243,.18);outline:0}.auth-card small{color:#64748b;line-height:1.45}.auth-card button{border:0;border-radius:10px;background:var(--color-brand-blue,#63B8F3);color:var(--color-brand-ink,#0A1B35);cursor:pointer;font:inherit;font-weight:800;padding:.85rem 1rem}.auth-card button:disabled{cursor:not-allowed;opacity:.6}.text-button{background:transparent!important;color:var(--color-brand-ink,#0A1B35)!important;padding:.2rem!important;text-decoration:underline}.divider{align-items:center;color:#788797;display:flex;gap:1rem;margin:1.5rem 0}.divider:before,.divider:after{background:#d8e4ea;content:'';height:1px;flex:1}.google{display:flex;justify-content:center}.switch{margin:1.5rem 0 0;text-align:center}.switch a{color:#216275;font-weight:800}`;

export default RegisterPage;
