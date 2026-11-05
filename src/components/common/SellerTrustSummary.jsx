import { ShieldCheckIcon, SparklesIcon, StarIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const SellerTrustSummary = ({ trust, compact = false }) => {
  const { t } = useTranslation();
  if (!trust) return null;

  const deliveredOrders = Number(trust.deliveredOrders || 0);
  const reviewCount = Number(trust.verifiedReviewCount || 0);
  const averageRating = Number(trust.verifiedAverageRating || 0);
  const badge = trust.badge === 'reliable' || trust.badge === 'new' ? trust.badge : null;

  return (
    <div className={`seller-trust-summary ${compact ? 'seller-trust-summary--compact' : ''}`} aria-label={t('sellerTrust.label')}>
      {badge && (
        <span className={`seller-trust-badge seller-trust-badge--${badge}`}>
          {badge === 'reliable' ? <ShieldCheckIcon aria-hidden="true" /> : <SparklesIcon aria-hidden="true" />}
          {t(`sellerTrust.badges.${badge}`)}
        </span>
      )}
      {deliveredOrders > 0 && (
        <span className="seller-trust-stat" title={t('sellerTrust.delivered', { count: deliveredOrders })}>
          <TruckIcon aria-hidden="true" /> {t('sellerTrust.delivered', { count: deliveredOrders })}
        </span>
      )}
      {reviewCount > 0 && (
        <span className="seller-trust-stat" title={t('sellerTrust.reviews', { count: reviewCount })}>
          <StarIcon aria-hidden="true" /> {averageRating.toFixed(1)} · {t('sellerTrust.reviews', { count: reviewCount })}
        </span>
      )}
    </div>
  );
};

export default SellerTrustSummary;
