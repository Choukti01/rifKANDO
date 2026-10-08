import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';
import { useTranslation } from 'react-i18next';

const ImageFallback = ({ alt, className, style }) => {
  const { t } = useTranslation();
  return <div className={`media-fallback ${className}`.trim()} role="img" aria-label={t('media.noImageFor', { title: alt || t('products.unknownSeller') })} style={{ width: '100%', height: '100%', minHeight: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #e8f7fc 0%, #f7fafc 100%)', color: '#52707c', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em', ...style }}><span>{t('media.noPreview')}</span></div>;
};

const ResilientImage = ({ source, alt, className, style }) => {
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) return <ImageFallback alt={alt} className={className} style={style} />;

  return (
    <img
      src={getImageUrl(source)}
      alt={alt || ''}
      className={className}
      style={style}
      onError={() => setHasFailed(true)}
    />
  );
};

const MarketplaceImage = ({ source, alt, className = '', style }) => {
  if (!source) return <ImageFallback alt={alt} className={className} style={style} />;

  return <ResilientImage key={source} source={source} alt={alt} className={className} style={style} />;
};

export default MarketplaceImage;
