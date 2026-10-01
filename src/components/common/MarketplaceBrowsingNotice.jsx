import { ArrowPathIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const MarketplaceBrowsingNotice = ({ onRetry }) => {
  const { t } = useTranslation();

  return (
    <aside className="marketplace-browsing-notice" aria-live="polite" role="status">
      <SignalSlashIcon aria-hidden="true" />
      <p><strong>{t('availability.browseTitle')}</strong> {t('availability.browseDescription')}</p>
      <button type="button" onClick={onRetry}>
        <ArrowPathIcon aria-hidden="true" />
        {t('availability.retry')}
      </button>
      <style>{`
        .marketplace-browsing-notice { align-items:center; background:#eff8ff; border-block:1px solid #c9e7fb; color:#173f5f; display:flex; gap:.75rem; justify-content:center; min-height:3.4rem; padding:.55rem max(1rem, env(safe-area-inset-left)) .55rem max(1rem, env(safe-area-inset-right)); text-align:center; }
        .marketplace-browsing-notice > svg { color:#1684d8; flex:0 0 auto; height:1.25rem; width:1.25rem; }
        .marketplace-browsing-notice p { margin:0; font-size:.86rem; line-height:1.45; }
        .marketplace-browsing-notice strong { font-weight:800; }
        .marketplace-browsing-notice button { align-items:center; background:#173f5f; border:0; border-radius:.55rem; color:#fff; cursor:pointer; display:inline-flex; flex:0 0 auto; font:inherit; font-size:.8rem; font-weight:800; gap:.35rem; min-height:2.25rem; padding:.45rem .65rem; }
        .marketplace-browsing-notice button:hover { background:#0c2b48; }
        .marketplace-browsing-notice button:focus-visible { outline:3px solid rgba(22,132,216,.45); outline-offset:2px; }
        .marketplace-browsing-notice button svg { height:1rem; width:1rem; }
        @media (max-width:640px) { .marketplace-browsing-notice { align-items:flex-start; text-align:left; } .marketplace-browsing-notice button { align-self:center; } }
      `}</style>
    </aside>
  );
};

export default MarketplaceBrowsingNotice;
