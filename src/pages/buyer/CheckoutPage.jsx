import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheckIcon, TruckIcon } from '@heroicons/react/24/outline'
import useCart from '../../hooks/useCart'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'


const CheckoutPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { cart, getCartTotal, getCartShipping, clearCart } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const checkoutRequestIdRef = useRef(null)
  const [step, setStep] = useState(1)
  // COD is the only public payment method during the focused launch.
  const paymentMethod = 'cash'
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
  const shipping = getCartShipping()
  const total = subtotal + shipping
  const requiredAddressFields = ['fullName', 'email', 'phone', 'address', 'city']
  const formatAmount = (amount) => `${Number(amount || 0).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'fr' ? 'fr-MA' : 'en-MA')} MAD`

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validateShippingInformation = () => {
    const missingField = requiredAddressFields.some((field) => !String(formData[field] || '').trim())
    if (missingField) {
      toast.error(t('buyer.checkout.deliveryDetailsRequired'))
      return false
    }
    return true
  }

  const handleContinueToPayment = () => {
    if (validateShippingInformation()) setStep(2)
  }

  const handlePlaceOrder = async () => {
    if (!validateShippingInformation()) {
      setStep(1)
      return
    }

    if (!cart.length) {
      navigate('/cart')
      return
    }

    setLoading(true)
    try {
      if (!checkoutRequestIdRef.current) {
        checkoutRequestIdRef.current = globalThis.crypto?.randomUUID?.()
          || `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }
      const requestConfig = {
        headers: { 'Idempotency-Key': checkoutRequestIdRef.current }
      }
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

      /*
       * CMI is intentionally parked for the COD-only launch. The integration
       * stays here as a reactivation reference and is separately protected on
       * the server, so no browser or direct API request can select it today.
      if (paymentMethod === 'cmi') {
        const orderResponse = await api.post('/orders', orderData, requestConfig)
        if (!orderResponse.data.success) throw new Error('Could not create your order')

        const order = orderResponse.data.order
        const paymentResponse = await api.post('/payment/cmi/initiate', { orderId: order.id })
        if (!paymentResponse.data.success || !paymentResponse.data.htmlForm) {
          throw new Error(paymentResponse.data?.error || 'Could not open the secure payment page')
        }

        const formContainer = document.createElement('div')
        formContainer.innerHTML = paymentResponse.data.htmlForm
        document.body.appendChild(formContainer)
        const form = formContainer.querySelector('form')
        if (!form) throw new Error('Could not open the secure payment page')
        form.submit()
      }
      */

      const response = await api.post('/orders', orderData, requestConfig)
      if (!response.data.success) throw new Error('Could not place your COD order')
      toast.success(t('buyer.checkout.orderPlaced'))
      await clearCart()
      navigate('/orders')
    } catch (error) {
      console.error('Order failed:', error)
      toast.error(error.response?.data?.error || t('buyer.checkout.orderFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="container text-center py-16">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold mb-2">{t('buyer.cart.emptyTitle')}</h2>
        <p className="text-gray-500 mb-6">{t('buyer.checkout.emptyLead')}</p>
        <button onClick={() => navigate('/products')} className="btn btn-primary">
          {t('buyer.cart.continueShopping')}
        </button>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="checkout-heading">
          <div>
            <p className="checkout-eyebrow">{t('buyer.checkout.eyebrow')}</p>
            <h1 className="checkout-title">{t('buyer.checkout.title')}</h1>
          </div>
          <p>{t('buyer.checkout.lead')}</p>
        </div>

        {/* Progress Steps */}
        <div className="checkout-steps">
          <div className="step-item">
            <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
            <span>{t('buyer.shipping')}</span>
          </div>
          <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className="step-item">
            <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
            <span>{t('buyer.payment')}</span>
          </div>
          <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className="step-item">
            <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>3</div>
            <span>{t('buyer.confirm')}</span>
          </div>
        </div>

        <div className="checkout-grid">
          <div className="checkout-form-container">
            {step === 1 && (
              <div className="checkout-form">
                <h2>{t('buyer.checkout.shippingInformation')}</h2>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="checkout-full-name">{t('buyer.checkout.fullName')} *</label>
                    <input id="checkout-full-name" autoComplete="name" type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="checkout-email">{t('buyer.checkout.email')} *</label>
                    <input id="checkout-email" autoComplete="email" type="email" name="email" value={formData.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="checkout-phone">{t('buyer.checkout.phone')} *</label>
                    <input id="checkout-phone" autoComplete="tel" type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="checkout-city">{t('buyer.checkout.city')} *</label>
                    <input id="checkout-city" autoComplete="address-level2" type="text" name="city" value={formData.city} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="checkout-address">{t('buyer.checkout.address')} *</label>
                  <input id="checkout-address" autoComplete="street-address" type="text" name="address" value={formData.address} onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <label htmlFor="checkout-postal-code">{t('buyer.checkout.postalCode')}</label>
                  <input id="checkout-postal-code" autoComplete="postal-code" type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label htmlFor="checkout-notes">{t('buyer.checkout.orderNotes')}</label>
                  <textarea id="checkout-notes" rows="3" name="notes" value={formData.notes} onChange={handleChange} placeholder={t('buyer.checkout.notesPlaceholder')}></textarea>
                </div>
                <button type="button" onClick={handleContinueToPayment} className="next-btn">{t('buyer.checkout.continuePayment')}</button>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-form">
                <h2>{t('buyer.checkout.paymentMethod')}</h2>
                <div className="payment-options">
                  <div className="payment-option active" role="status">
                    <TruckIcon className="payment-icon" />
                    <div>
                      <strong>{t('buyer.cashOnDelivery')}</strong>
                      <p>{t('buyer.checkout.codLead')}</p>
                    </div>
                  </div>

                  {/* CMI is retained for a future release. Do not render an unavailable payment choice to buyers. */}
                  {/*
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
                      <p>You will continue to CMI's secure payment page.</p>
                    </div>
                  </label>
                  */}
                </div>
                <div className="form-buttons">
                  <button type="button" onClick={() => setStep(1)} className="back-btn">{t('buyer.back')}</button>
                  <button type="button" onClick={() => setStep(3)} className="next-btn">{t('buyer.checkout.reviewOrder')}</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-form">
                <h2>{t('buyer.checkout.reviewTitle')}</h2>
                <div className="review-section">
                  <h3>{t('buyer.checkout.shippingAddress')}</h3>
                  <p>
                    {formData.fullName}<br />
                    {formData.address}<br />
                    {formData.city}, {formData.postalCode}<br />
                    {formData.phone}<br />
                    {formData.email}
                  </p>
                </div>
                <div className="review-section">
                  <h3>{t('buyer.checkout.paymentMethod')}</h3>
                  <p>{t('buyer.cashOnDelivery')}</p>
                </div>
                <div className="review-section">
                  <h3>{t('buyer.checkout.orderItems')}</h3>
                  {cart.map(item => (
                    <div key={`${item.type}-${item.id}`} className="review-item">
                      <span>{item.title} x {item.quantity}</span>
                      <span>{formatAmount(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="review-total">
                  <span>{t('buyer.checkout.orderTotal')}</span>
                  <strong>{formatAmount(total)}</strong>
                </div>
                <div className="form-buttons">
                  <button type="button" onClick={() => setStep(2)} className="back-btn">{t('buyer.back')}</button>
                  <button 
                    type="button" 
                    onClick={handlePlaceOrder} 
                    className="place-order-btn"
                    disabled={loading}
                  >
                    {loading ? t('buyer.checkout.processing') : t('buyer.checkout.placeCodOrder')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="order-summary">
            <h3>{t('buyer.orderSummary')}</h3>
            <div className="summary-row">
              <span>{t('buyer.subtotal')}</span>
              <span>{formatAmount(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>{t('buyer.shipping')}</span>
              <span>{shipping === 0 ? t('buyer.free') : formatAmount(shipping)}</span>
            </div>
            <div className="summary-total">
              <span>{t('buyer.total')}</span>
              <span>{formatAmount(total)}</span>
            </div>
            <div className="secure-badge">
              <ShieldCheckIcon className="shield-icon" />
              <span>{t('buyer.checkout.secureNote')}</span>
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
          margin: 0;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.04em;
        }
        .checkout-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
        .checkout-heading > p { max-width: 26rem; margin: 0; color: #6b7280; font-size: 0.875rem; line-height: 1.5; text-align: right; }
        .checkout-eyebrow { margin: 0 0 0.35rem; color: #216275; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
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
          .order-summary { position: static; }
          .checkout-heading { align-items: flex-start; flex-direction: column; }
          .checkout-heading > p { max-width: none; text-align: left; }
        }
        @media (max-width: 640px) {
          .checkout-page { padding: 1rem 0; }
          .checkout-form, .order-summary { padding: 1.25rem; border-radius: 0.75rem; }
          .form-row { grid-template-columns: 1fr; }
          .form-field input, .form-field textarea { min-height: 44px; font-size: 16px; }
          .form-buttons { flex-direction: column-reverse; }
          .next-btn, .back-btn, .place-order-btn { width: 100%; min-height: 44px; }
        }
        .checkout-form {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
        .form-field input:focus, .form-field textarea:focus { outline: 3px solid rgba(135, 206, 235, 0.35); border-color: #87CEEB; }
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
          background: #f4fcff;
          box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.12);
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
          min-height: 46px;
          padding: 0.625rem 1.25rem;
          border-radius: 2rem;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        .next-btn, .place-order-btn {
          background: #1a1a1a;
          color: white;
          flex: 1;
        }
        .next-btn:hover:not(:disabled), .place-order-btn:hover:not(:disabled) { background: #333; }
        .next-btn:disabled, .place-order-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .back-btn {
          background: #e5e7eb;
          color: #374151;
        }
        .back-btn:hover { background: #d1d5db; }
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
        .review-total { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding: 1rem; border-radius: 0.75rem; background: #f4fcff; color: #1f2937; }
        .review-total strong { font-size: 1.1rem; }
        .order-summary {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
          align-items: flex-start;
          justify-content: flex-start;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          color: #4b5563;
          line-height: 1.45;
        }
        .shield-icon {
          flex: 0 0 auto;
          width: 1rem;
          height: 1rem;
          margin-top: 0.05rem;
          color: #216275;
        }
        .next-btn:focus-visible, .back-btn:focus-visible, .place-order-btn:focus-visible, .payment-option:focus-within { outline: 3px solid rgba(135, 206, 235, 0.6); outline-offset: 3px; }
      `}</style>
    </div>
  )
}

export default CheckoutPage
