import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

const ImageFallback = ({ alt, className, style }) => (
  <div
    className={`media-fallback ${className}`.trim()}
    role="img"
    aria-label={`No image available for ${alt || 'this listing'}`}
    style={{
      width: '100%',
      height: '100%',
      minHeight: '100%',
      display: 'grid',
      placeItems: 'center',
      background: 'linear-gradient(135deg, #e8f7fc 0%, #f7fafc 100%)',
      color: '#52707c',
      fontSize: '0.875rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      ...style,
    }}
  >
    <span>No preview available</span>
  </div>
);

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
