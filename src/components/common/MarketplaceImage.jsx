import React, { useEffect, useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

const MarketplaceImage = ({ source, alt, className = '', style }) => {
  const [hasFailed, setHasFailed] = useState(!source);

  useEffect(() => {
    setHasFailed(!source);
  }, [source]);

  if (hasFailed) {
    return (
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
  }

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

export default MarketplaceImage;
