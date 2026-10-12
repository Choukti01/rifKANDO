import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { getListingQuality } from '../../utils/productListingQuality';

const ListingQualityChecklist = ({ formData, media }) => {
  const { t } = useTranslation();
  const { checks, imageCount, requiredImages, ready } = getListingQuality(formData, media);
  const rows = [
    ['details', t('productForm.quality.details')],
    ['city', t('productForm.quality.city')],
    ['cover', t('productForm.quality.cover')],
    ['photos', t('productForm.quality.photos', { current: imageCount, required: requiredImages })],
  ];

  return (
    <aside className={`listing-quality ${ready ? 'listing-quality-ready' : ''}`} aria-live="polite">
      <div className="listing-quality__heading">
        <div>
          <span>{t('productForm.quality.eyebrow')}</span>
          <h3>{t('productForm.quality.title')}</h3>
        </div>
        <strong>{ready ? t('productForm.quality.ready') : t('productForm.quality.incomplete')}</strong>
      </div>
      <p>{t(`productForm.quality.condition.${formData.condition || 'new'}`)}</p>
      <ul>
        {rows.map(([key, label]) => (
          <li key={key} className={checks[key] ? 'is-complete' : ''}>
            {checks[key] ? <CheckCircleIcon aria-hidden="true" /> : <ExclamationCircleIcon aria-hidden="true" />}
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default ListingQualityChecklist;
