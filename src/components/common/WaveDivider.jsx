import React from 'react';

const WaveDivider = ({ className = '', tone = 'soft' }) => (
  <div className={`wave-divider wave-divider--${tone} ${className}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 1440 88" preserveAspectRatio="none" focusable="false">
      <path className="wave-divider__back" d="M0 37C145 13 276 12 431 31C587 50 682 70 846 56C1010 42 1191 5 1440 27V88H0Z" />
      <path className="wave-divider__front" d="M0 53C176 29 320 35 491 56C675 78 820 77 984 48C1150 18 1292 20 1440 40V88H0Z" />
    </svg>
  </div>
);

export default WaveDivider;
