import { ArrowRightIcon, ClockIcon, MagnifyingGlassIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Focused-launch placeholder for marketplace surfaces that are intentionally
 * retained in the codebase but not yet accepting public activity.
 */
const UnderDevelopment = ({ sectionKey, sellerWorkspace = false }) => {
  const { t } = useTranslation();
  const section = t(`launch.sections.${sectionKey}`);

  return (
    <section className={`under-development ${sellerWorkspace ? 'under-development-dashboard' : ''}`}>
      <div className="under-development-card">
        <span className="under-development-icon" aria-hidden="true"><ClockIcon /></span>
        <p className="under-development-eyebrow">{t('launch.eyebrow')}</p>
        <h1>{t('launch.title', { section })}</h1>
        <p>{t('launch.description', { section })}</p>
        <div className="under-development-actions">
          <Link to="/products" className="under-development-primary">
            <ShoppingBagIcon aria-hidden="true" />
            {t('launch.products')}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
          <Link to="/findit" className="under-development-secondary">
            <MagnifyingGlassIcon aria-hidden="true" />
            {t('launch.findit')}
          </Link>
        </div>
      </div>

      <style>{`
        .under-development {
          display: grid;
          min-height: min(66vh, 46rem);
          padding: clamp(2.5rem, 8vw, 6rem) 1rem;
          place-items: center;
        }
        .under-development-dashboard { min-height: min(55vh, 38rem); padding: clamp(1.5rem, 5vw, 4rem) 0; }
        .under-development-card {
          width: min(100%, 42rem);
          padding: clamp(2rem, 6vw, 4rem);
          text-align: center;
          background: linear-gradient(145deg, #fff, var(--color-brand-soft));
          border: 1px solid rgba(33, 98, 117, 0.16);
          border-radius: 1.5rem;
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.09);
        }
        .under-development-icon {
          display: inline-grid;
          width: 3.5rem;
          height: 3.5rem;
          margin-bottom: 1.25rem;
          color: var(--color-brand-ink);
          background: rgba(99, 184, 243, 0.2);
          border-radius: 1rem;
          place-items: center;
        }
        .under-development-icon svg { width: 1.75rem; height: 1.75rem; }
        .under-development-eyebrow {
          margin: 0 0 0.65rem;
          color: var(--color-brand-ink);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .under-development h1 { margin: 0; color: #111827; font-size: clamp(1.8rem, 5vw, 2.75rem); letter-spacing: -0.045em; }
        .under-development p:not(.under-development-eyebrow) { max-width: 35rem; margin: 1rem auto 0; color: #52606d; line-height: 1.7; }
        .under-development-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: 2rem; }
        .under-development-actions a { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 2.9rem; padding: 0.7rem 1rem; border-radius: 0.8rem; font-weight: 750; text-decoration: none; }
        .under-development-actions svg { width: 1.05rem; height: 1.05rem; }
        .under-development-primary { color: #fff; background: var(--color-brand-ink); }
        .under-development-primary:hover { background: #163e4a; }
        .under-development-secondary { color: var(--color-brand-ink); background: #fff; border: 1px solid rgba(33, 98, 117, 0.25); }
        .under-development-secondary:hover { background: var(--color-brand-soft); }
        .under-development-actions a:focus-visible { outline: 3px solid rgba(99, 184, 243, 0.55); outline-offset: 3px; }
        @media (max-width: 480px) { .under-development-actions { display: grid; } .under-development-actions a { width: 100%; } }
      `}</style>
    </section>
  );
};

export default UnderDevelopment;
