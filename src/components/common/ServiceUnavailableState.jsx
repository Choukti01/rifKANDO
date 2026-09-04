import { ArrowPathIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const ServiceUnavailableState = ({ onRetry, compact = false }) => {
  const { t } = useTranslation();

  return (
    <section className={`service-unavailable ${compact ? 'service-unavailable-compact' : ''}`} aria-live="polite" role="status">
      <SignalSlashIcon aria-hidden="true" />
      <div>
        <h2>{t('availability.title')}</h2>
        <p>{t('availability.description')}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          <ArrowPathIcon aria-hidden="true" />
          {t('availability.retry')}
        </button>
      )}
      <style>{`
        .service-unavailable { align-items: center; background: #fff; border: 1px solid #d7e7f2; border-radius: 1rem; color: var(--color-brand-ink, #0a1b35); display: grid; gap: 1rem; grid-template-columns: auto minmax(0, 1fr) auto; padding: clamp(1.25rem, 4vw, 2rem); text-align: left; }
        .service-unavailable > svg { color: var(--color-brand-blue, #63b8f3); height: 2.25rem; width: 2.25rem; }
        .service-unavailable h2 { font-size: 1.1rem; margin: 0; }
        .service-unavailable p { color: #607084; line-height: 1.55; margin: .3rem 0 0; max-width: 42rem; }
        .service-unavailable button { align-items: center; background: var(--color-brand-ink, #0a1b35); border: 0; border-radius: .65rem; color: #fff; cursor: pointer; display: inline-flex; font: inherit; font-size: .85rem; font-weight: 800; gap: .45rem; min-height: 2.75rem; padding: .65rem .85rem; white-space: nowrap; }
        .service-unavailable button:hover, .service-unavailable button:focus-visible { background: #16324f; }
        .service-unavailable button:focus-visible { outline: 3px solid rgba(99, 184, 243, .55); outline-offset: 3px; }
        .service-unavailable button svg { height: 1rem; width: 1rem; }
        .service-unavailable-compact { margin: 0 auto; max-width: 58rem; }
        @media (max-width: 640px) { .service-unavailable { align-items: flex-start; grid-template-columns: auto minmax(0, 1fr); } .service-unavailable button { grid-column: 1 / -1; justify-content: center; width: 100%; } }
      `}</style>
    </section>
  );
};

export default ServiceUnavailableState;
