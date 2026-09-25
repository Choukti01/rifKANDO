import React, { useCallback, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authMethods, googleLogin, loginWithPasskey } = useAuth();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const requestedPath = new URLSearchParams(location.search).get('next');
  const redirectAfterAuth = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/';

  const signIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await loginWithPasskey();
    setSubmitting(false);
    if (result.success) navigate(redirectAfterAuth, { replace: true });
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) navigate(redirectAfterAuth, { replace: true });
  }, [googleLogin, navigate, redirectAfterAuth]);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <span className="auth-eyebrow">{t('auth.account')}</span>
        <h1 id="login-title">{t('auth.welcomeBack')}</h1>
        <p>{t('auth.googlePasskeyLoginLead')}</p>

        {authMethods.google && <div className="google"><GoogleLogin onError={() => toast.error(t('auth.googleSignInFailed'))} onSuccess={handleGoogleSuccess} theme="outline" width="320" /></div>}

        {authMethods.google && authMethods.passkey && <div className="divider"><span>{t('auth.or')}</span></div>}

        {authMethods.passkey ? (
          <form onSubmit={signIn}>
            <h2>{t('auth.passkeyWelcome')}</h2>
            <small>{t('auth.passkeyHint')}</small>
            <button disabled={submitting} type="submit">{submitting ? t('auth.passkeyChecking') : t('auth.continuePasskey')}</button>
          </form>
        ) : !authMethods.google && <p className="auth-note">{t('auth.passkeyUnavailable')}</p>}

        <p className="switch">{t('auth.newTo')} <Link to="/register">{t('auth.create')}</Link></p>
      </section>
      <style>{styles}</style>
    </main>
  );
};

const styles = `.auth-page{min-height:70vh;display:grid;place-items:center;padding:3rem 1rem}.auth-card{width:min(100%,440px);padding:clamp(1.5rem,5vw,2.5rem);border:1px solid #d8eaf6;border-radius:20px;background:#fff;box-shadow:0 18px 48px rgba(10,27,53,.1)}.auth-eyebrow{display:block;color:var(--color-brand-blue,#63B8F3);font-size:.76rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.auth-card h1{color:var(--color-brand-ink,#0A1B35);margin:.45rem 0 .5rem}.auth-card h2{color:var(--color-brand-ink,#0A1B35);font-size:1rem;margin:0}.auth-card p{color:#536273;line-height:1.55}.auth-card form{display:grid;gap:1rem;margin-top:1.5rem}.auth-card small{color:#64748b;line-height:1.45}.auth-card button{border:0;border-radius:10px;background:var(--color-brand-blue,#63B8F3);color:var(--color-brand-ink,#0A1B35);cursor:pointer;font:inherit;font-weight:800;padding:.85rem 1rem}.auth-card button:disabled{cursor:not-allowed;opacity:.6}.auth-note{border-radius:10px;background:#f5faff;padding:1rem}.divider{align-items:center;color:#788797;display:flex;gap:1rem;margin:1.5rem 0}.divider:before,.divider:after{background:#d8e4ea;content:'';height:1px;flex:1}.google{display:flex;justify-content:center;margin-top:1.5rem}.switch{margin:1.5rem 0 0;text-align:center}.switch a{color:#216275;font-weight:800}`;

export default LoginPage;
