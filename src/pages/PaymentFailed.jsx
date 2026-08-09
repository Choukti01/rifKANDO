import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/outline';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="payment-failed">
      <div className="failed-container">
        <XCircleIcon className="failed-icon" />
        <h1>Payment was not completed</h1>
        <p>Your payment was not confirmed by the payment provider.</p>
        {orderId && <p>Order ID: <strong>{orderId}</strong></p>}
        <p>Return to your cart to review your items or choose another payment method.</p>
        <div className="payment-actions">
          <Link to="/cart" className="payment-primary-action">Return to cart</Link>
          <Link to="/" className="payment-secondary-action">Continue shopping</Link>
        </div>
      </div>
      <style>{`
        .payment-failed { min-height: calc(100vh - 80px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: #f8fcfd; }
        .failed-container { width: min(100%, 520px); text-align: center; background: white; padding: 3rem; border: 1px solid #e5e7eb; border-radius: 1rem; box-shadow: 0 12px 32px rgba(15,23,42,0.08); }
        .failed-container h1 { margin-bottom: 0.75rem; font-size: clamp(1.5rem, 4vw, 2rem); letter-spacing: -0.035em; }
        .failed-container p { color: #4b5563; line-height: 1.6; }
        .failed-icon { width: 4rem; height: 4rem; color: #ef4444; margin: 0 auto 1rem; }
        .payment-actions { display: flex; justify-content: center; gap: 0.75rem; margin-top: 1.5rem; }
        .payment-primary-action, .payment-secondary-action { display: inline-flex; min-height: 46px; align-items: center; justify-content: center; padding: 0.75rem 1rem; border-radius: 0.65rem; font-weight: 700; text-decoration: none; }
        .payment-primary-action { background: #1a1a1a; color: white; }
        .payment-primary-action:hover { background: #333; }
        .payment-secondary-action { border: 1px solid #e5e7eb; color: #1a1a1a; }
        .payment-primary-action:focus-visible, .payment-secondary-action:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.6); outline-offset: 3px; }
        @media (max-width: 520px) { .failed-container { padding: 2rem 1.25rem; } .payment-actions { flex-direction: column; } }
      `}</style>
    </div>
  );
};

export default PaymentFailed;
