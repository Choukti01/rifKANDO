import React from 'react';

const VerifiedBadge = ({ size = 'small', showTooltip = true }) => {
  const sizePx = size === 'small' ? 14 : size === 'medium' ? 18 : 22;
  return (
    <span 
      className="verified-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '6px',
        cursor: 'help',
        verticalAlign: 'middle'
      }}
      title={showTooltip ? "Verified Seller" : ""}
    >
      <svg 
        width={sizePx} 
        height={sizePx} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: '#3b82f6' }}
      >
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
          fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
};

export default VerifiedBadge;