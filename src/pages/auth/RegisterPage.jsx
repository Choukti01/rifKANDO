import React, { useCallback } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authMethods, googleLogin } = useAuth();
  const { t } = useTranslation();
  const requestedPath = new URLSearchParams(location.search).get('next');
  const redirectAfterAuth = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/';

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) navigate(redirectAfterAuth, { replace: true });
  }, [googleLogin, navigate, redirectAfterAuth]);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <span className="auth-eyebrow">{t('auth.account')}</span>
        <h1 id="register-title">{t('auth.join')}</h1>
        <p>{t('auth.googleOnlyCreateLead')}</p>

        {authMethods.google && <div className="google"><GoogleLogin onError={() => toast.error(t('auth.googleSignUpFailed'))} onSuccess={handleGoogleSuccess} theme="outline" width="320" /></div>}
        {!authMethods.google && <p className="auth-note">{t('auth.googleUnavailable')}</p>}

        <p className="switch">{t('auth.alreadyHave')} <Link to="/login">{t('auth.signIn')}</Link></p>
      </section>
      <style>{styles}</style>
    </main>
  );
};

const styles = `.auth-page{min-height:70vh;display:grid;place-items:center;padding:clamp(1.5rem,6vw,3rem) 1rem}.auth-card{width:min(100%,460px);padding:clamp(1.5rem,5vw,2.5rem);border:1px solid #d8eaf6;border-radius:20px;background:#fff;box-shadow:0 18px 48px rgba(10,27,53,.1)}.auth-eyebrow{display:block;color:var(--color-brand-blue,#63B8F3);font-size:.76rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.auth-card h1{color:var(--color-brand-ink,#0A1B35);margin:.45rem 0 .5rem}.auth-card p{color:#536273;line-height:1.55}.auth-note{border-radius:10px;background:#f5faff;padding:1rem}.google{display:flex;justify-content:center;margin-top:1.5rem;max-width:100%;overflow:hidden}.google>div,.google iframe{max-width:100%!important}.switch{margin:1.5rem 0 0;text-align:center}.switch a{color:#216275;font-weight:800}@media(max-width:380px){.auth-page{padding-inline:.75rem}.auth-card{padding:1.25rem}}`;

export default RegisterPage;
