import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheckIcon, TruckIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import toast from 'react-hot-toast'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const { cart, getCartTotal, clearCart } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    postalCode: '',
    notes: ''
  })

  const subtotal = getCartTotal()
  const shipping = subtotal > 500 ? 0 : 50
  const total = subtotal + shipping   // No tax line – matches backend split logic

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handlePlaceOrder = async () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.address || !formData.city) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    
    try {
      const orderData = {
        shippingAddress: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode
        },
        paymentMethod: paymentMethod,
        notes: formData.notes,
        items: cart.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          type: item.type
        })),
        total: total
      }

      if (paymentMethod === 'cmi') {
        // Create order first
        const orderResponse = await api.post('/orders', orderData)
        
        if (orderResponse.data.success) {
          const order = orderResponse.data.order
          
          // Initiate CMI payment
          const paymentResponse = await api.post('/payment/cmi/initiate', { orderId: order.id })
          
          if (paymentResponse.data.success) {
            const formContainer = document.createElement('div')
            formContainer.innerHTML = paymentResponse.data.htmlForm
            document.body.appendChild(formContainer)
            const form = formContainer.querySelector('form')
            if (form) form.submit()
          } else {
            toast.error('Failed to initiate payment')
            setLoading(false)
          }
        }
      } else {
        // Cash on Delivery flow
        const response = await api.post('/orders', orderData)
        
        if (response.data.success) {
          toast.success('Order placed successfully!')
          clearCart()
          navigate('/orders')
        }
      }
    } catch (error) {
      console.error('Order failed:', error)
      toast.error(error.response?.data?.error || 'Failed to place order')
      setLoading(false)
    } finally {
      if (paymentMethod !== 'cmi') {
        setLoading(false)
      }
    }
  }

  if (cart.length === 0) {
    return (
      <div className="container text-center py-16">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add items to your cart before checking out</p>
        <button onClick={() => navigate('/products')} className="btn btn-primary">
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1 className="checkout-title">Checkout</h1>

        {/* Progress Steps */}
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
            <span>Confirm</span>
          </div>
        </div>

        <div className="checkout-grid">
          <div className="checkout-form-container">
            {step === 1 && (
              <div className="checkout-form">
                <h2>Shipping Information</h2>
                <div className="form-row">
                  <div className="form-field">
                    <label>Full Name *</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
                  </div>
                  <div className="form-field">
                    <label>Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Phone *</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div className="form-field">
                    <label>City *</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-field">
                  <label>Address *</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <label>Postal Code</label>
                  <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Order Notes (Optional)</label>
                  <textarea rows="3" name="notes" value={formData.notes} onChange={handleChange} placeholder="Special delivery instructions..."></textarea>
                </div>
                <button type="button" onClick={() => setStep(2)} className="next-btn">Continue to Payment</button>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-form">
                <h2>Payment Method</h2>
                <div className="payment-options">
                  <label className={`payment-option ${paymentMethod === 'cash' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="cash" 
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                    />
                    <TruckIcon className="payment-icon" />
                    <div>
                      <strong>Cash on Delivery</strong>
                      <p>Pay when you receive your order</p>
                    </div>
                  </label>

                  <label className={`payment-option ${paymentMethod === 'cmi' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="cmi"
                      checked={paymentMethod === 'cmi'}
                      onChange={() => setPaymentMethod('cmi')}
                    />
                    <CreditCardIcon className="payment-icon" />
                    <div>
                      <strong>Credit Card (Visa / MasterCard)</strong>
                      <p>Secure payment via CMI</p>
                    </div>
                  </label>
                </div>
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
                  <p>
                    {formData.fullName}<br />
                    {formData.address}<br />
                    {formData.city}, {formData.postalCode}<br />
                    {formData.phone}<br />
                    {formData.email}
                  </p>
                </div>
                <div className="review-section">
                  <h3>Payment Method</h3>
                  <p>{paymentMethod === 'cash' ? 'Cash on Delivery' : 'Credit Card (CMI)'}</p>
                </div>
                <div className="review-section">
                  <h3>Order Items</h3>
                  {cart.map(item => (
                    <div key={item.id} className="review-item">
                      <span>{item.title} x {item.quantity}</span>
                      <span>{item.price * item.quantity} MAD</span>
                    </div>
                  ))}
                </div>
                <div className="form-buttons">
                  <button type="button" onClick={() => setStep(2)} className="back-btn">Back</button>
                  <button 
                    type="button" 
                    onClick={handlePlaceOrder} 
                    className="place-order-btn"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{subtotal} MAD</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `${shipping} MAD`}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{total} MAD</span>
            </div>
            <div className="secure-badge">
              <ShieldCheckIcon className="shield-icon" />
              <span>Secure checkout</span>
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
        .form-field input, .form-field textarea {
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
          gap: 1rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .payment-option.active {
          border-color: #87CEEB;
          background: rgba(135,206,235,0.05);
        }
        .payment-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: #87CEEB;
        }
        .payment-option p {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0;
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
        .next-btn:disabled, .place-order-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          margin: 0;
        }
        .review-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
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
          font-size: 1rem;
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