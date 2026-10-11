import React from 'react';

const WaveDivider = ({ className = '', tone = 'soft' }) => (
  <div className={`wave-divider wave-divider--${tone} ${className}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 1440 88" preserveAspectRatio="none" focusable="false">
      <path className="wave-divider__front" d="M0 42C166 17 334 21 500 47C674 74 820 73 990 44C1157 15 1304 18 1440 39V88H0Z" />
    </svg>
  </div>
);

export default WaveDivider;
