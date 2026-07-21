import React from 'react';

const LoadingSkeleton = ({ variant = 'grid', count = 6, label = 'Loading content' }) => (
  <div className={`skeleton skeleton-${variant}`} role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    {Array.from({ length: count }, (_, index) => (
      <div className="skeleton-card" key={index}>
        <div className="skeleton-block skeleton-media" />
        <div className="skeleton-block skeleton-line skeleton-line-wide" />
        <div className="skeleton-block skeleton-line skeleton-line-short" />
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
