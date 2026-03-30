import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheckIcon, TruckIcon, CreditCardIcon } from '@heroicons/react/24/outline'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    paymentMethod: 'card',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: ''
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/orders')
  }

  const subtotal = 9999
  const shipping = 50
  const tax = 1999.8
  const total = subtotal + shipping + tax

  return (
    <div className="checkout-page">
      <div className="container">
        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-steps">
          <div className="step-item">
            <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
            <span>Shipping</span>
          </div>
          <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className="step-item">
            <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
            <span>Payment</span>
          </div>
          <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className="step-item">
            <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>3</div>
            <span>Review</span>
          </div>
        </div>

        <div className="checkout-grid">
          <div className="checkout-form-container">
            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <div className="checkout-form">
                  <h2>Shipping Information</h2>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Full Name</label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
                    </div>
                    <div className="form-field">
                      <label>Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Phone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>
                    <div className="form-field">
                      <label>City</label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} required />
                  </div>
                  <div className="form-field">
                    <label>Postal Code</label>
                    <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} required />
                  </div>
                  <button type="button" onClick={() => setStep(2)} className="next-btn">Continue to Payment</button>
                </div>
              )}

              {step === 2 && (
                <div className="checkout-form">
                  <h2>Payment Method</h2>
                  <div className="payment-options">
                    <label className="payment-option">
                      <input type="radio" name="paymentMethod" value="card" checked={formData.paymentMethod === 'card'} onChange={handleChange} />
                      <CreditCardIcon className="payment-icon" />
                      <span>Credit Card (CMI)</span>
                    </label>
                    <label className="payment-option">
                      <input type="radio" name="paymentMethod" value="cash" checked={formData.paymentMethod === 'cash'} onChange={handleChange} />
                      <TruckIcon className="payment-icon" />
                      <span>Cash on Delivery</span>
                    </label>
                  </div>

                  {formData.paymentMethod === 'card' && (
                    <div className="card-details">
                      <div className="form-field">
                        <label>Card Number</label>
                        <input type="text" name="cardNumber" placeholder="1234 5678 9012 3456" />
                      </div>
                      <div className="form-field">
                        <label>Cardholder Name</label>
                        <input type="text" name="cardName" placeholder="John Doe" />
                      </div>
                      <div className="form-row">
                        <div className="form-field">
                          <label>Expiry Date</label>
                          <input type="text" name="cardExpiry" placeholder="MM/YY" />
                        </div>
                        <div className="form-field">
                          <label>CVV</label>
                          <input type="text" name="cardCvv" placeholder="123" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-buttons">
                    <button type="button" onClick={() => setStep(1)} className="back-btn">Back</button>
                    <button type="button" onClick={() => setStep(3)} className="next-btn">Review Order</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="checkout-form">
                  <h2>Review Your Order</h2>
                  <div className="review-section">
                    <h3>Shipping Address</h3>
                    <p>{formData.fullName}<br />{formData.address}<br />{formData.city}, {formData.postalCode}<br />{formData.phone}</p>
                  </div>
                  <div className="review-section">
                    <h3>Payment Method</h3>
                    <p>{formData.paymentMethod === 'card' ? 'Credit Card (CMI)' : 'Cash on Delivery'}</p>
                  </div>
                  <div className="form-buttons">
                    <button type="button" onClick={() => setStep(2)} className="back-btn">Back</button>
                    <button type="submit" className="place-order-btn">Place Order</button>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{subtotal} MAD</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping} MAD</span>
            </div>
            <div className="summary-row">
              <span>Tax (20%)</span>
              <span>{tax} MAD</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{total} MAD</span>
            </div>
            <div className="secure-badge">
              <ShieldCheckIcon className="shield-icon" />
              <span>Secure payment guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .checkout-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .checkout-title {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 2rem;
        }
        .checkout-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .step-circle {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }
        .step-circle.active {
          background: #87CEEB;
          color: #1a1a1a;
        }
        .step-line {
          width: 4rem;
          height: 2px;
          background: #e5e7eb;
          margin: 0 0.5rem 1.5rem 0.5rem;
        }
        .step-line.active {
          background: #87CEEB;
        }
        .checkout-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .checkout-grid {
            grid-template-columns: 1fr;
          }
        }
        .checkout-form {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .checkout-form h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-field {
          margin-bottom: 1rem;
        }
        .form-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #374151;
        }
        .form-field input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .payment-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .payment-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          cursor: pointer;
        }
        .payment-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #6b7280;
        }
        .card-details {
          margin-top: 1rem;
        }
        .form-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .next-btn, .back-btn, .place-order-btn {
          padding: 0.625rem 1.5rem;
          border-radius: 2rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        .next-btn, .place-order-btn {
          background: #1a1a1a;
          color: white;
        }
        .back-btn {
          background: #e5e7eb;
          color: #374151;
        }
        .review-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .review-section h3 {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .review-section p {
          font-size: 0.875rem;
          color: #6b7280;
        }
        .order-summary {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: sticky;
          top: 100px;
        }
        .order-summary h3 {
          font-size: 1.125rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .summary-total {
          display: flex;
          justify-content: space-between;
          padding: 1rem 0;
          border-top: 1px solid #e5e7eb;
          margin-top: 0.5rem;
          font-weight: bold;
        }
        .secure-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .shield-icon {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  )
}

export default CheckoutPage