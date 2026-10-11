import React from 'react';

const WaveDivider = ({ className = '', tone = 'soft' }) => (
  <div className={`wave-divider wave-divider--${tone} ${className}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 1440 32" preserveAspectRatio="none" focusable="false">
      <path className="wave-divider__line" d="M0 16C175 4 344 4 512 16C680 28 849 28 1018 16C1185 4 1325 5 1440 14" />
    </svg>
  </div>
);

export default WaveDivider;
