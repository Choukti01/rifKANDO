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
        <h1>Payment Failed ❌</h1>
        <p>Your payment could not be processed.</p>
        {orderId && <p>Order ID: <strong>{orderId}</strong></p>}
        <p>Please try again or use another payment method.</p>
        <Link to="/cart" className="btn-primary">Try Again</Link>
        <Link to="/" className="btn-secondary">Continue Shopping</Link>
      </div>
      <style>{`
        .payment-failed { min-height: calc(100vh - 80px); display: flex; align-items: center; justify-content: center; background: #f9fafb; }
        .failed-container { text-align: center; background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 500px; }
        .failed-icon { width: 4rem; height: 4rem; color: #ef4444; margin: 0 auto 1rem; }
        .btn-primary { display: inline-block; background: #1a1a1a; color: white; padding: 0.75rem 1.5rem; border-radius: 2rem; text-decoration: none; margin: 1rem 0.5rem; }
        .btn-secondary { display: inline-block; background: transparent; border: 1px solid #e5e7eb; padding: 0.75rem 1.5rem; border-radius: 2rem; text-decoration: none; color: #1a1a1a; margin: 1rem 0.5rem; }
      `}</style>
    </div>
  );
};

export default PaymentFailed;