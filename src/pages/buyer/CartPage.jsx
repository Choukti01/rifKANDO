import React from 'react'
import { Link } from 'react-router-dom'
import { TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import { useCart } from '../../contexts/CartContext'

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount, isEmpty } = useCart()
  const subtotal = getCartTotal()
  const shipping = subtotal > 500 ? 0 : 50
  const tax = subtotal * 0.2
  const total = subtotal + shipping + tax

  // Helper to get product image URL
  const getProductImage = (item) => {
    if (item.media && item.media.length > 0) {
      return `http://localhost:5000${item.media[0].media_url || item.media[0].url}`
    }
    if (item.image && item.image.startsWith('/uploads')) {
      return `http://localhost:5000${item.image}`
    }
    // Fallback emoji based on type/category
    if (item.type === 'course') return '📚'
    if (item.type === 'service') return '🛠️'
    if (item.type === 'digital') return '💻'
    if (item.type === 'booking') return '📅'
    return '📦'
  }

  if (isEmpty) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything to your cart yet</p>
        <Link to="/products" className="btn btn-primary">Continue Shopping</Link>
        <style>{`
          .empty-cart {
            text-align: center;
            padding: 4rem 2rem;
            min-height: calc(100vh - 80px);
          }
          .empty-cart-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          .empty-cart h2 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }
          .empty-cart p {
            color: #6b7280;
            margin-bottom: 2rem;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-title">Shopping Cart <span>({getCartCount()} items)</span></h1>

        <div className="cart-grid">
          <div className="cart-items">
            {cart.map(item => {
              const imageSrc = getProductImage(item)
              const isImageUrl = typeof imageSrc === 'string' && imageSrc.startsWith('http')
              return (
                <div key={`${item.id}-${item.type}`} className="cart-item">
                  <div className="cart-item-image">
                    {isImageUrl ? (
                      <img 
                        src={imageSrc} 
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }}
                      />
                    ) : (
                      <span style={{ fontSize: '2rem' }}>{imageSrc}</span>
                    )}
                  </div>
                  <div className="cart-item-info">
                    <Link to={`/${item.type}/${item.id}`} className="cart-item-title">{item.title}</Link>
                    <p className="cart-item-seller">{item.seller}</p>
                    <div className="cart-item-price">{item.price} MAD</div>
                  </div>
                  <div className="cart-item-quantity">
                    <button onClick={() => updateQuantity(item.id, item.type, item.quantity - 1)}>
                      <MinusIcon className="w-4 h-4" />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)}>
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="cart-item-total">{item.price * item.quantity} MAD</div>
                  <button onClick={() => removeFromCart(item.id, item.type)} className="cart-item-remove">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              )
            })}
            <div className="cart-continue">
              <Link to="/products">← Continue Shopping</Link>
            </div>
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{subtotal} MAD</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `${shipping} MAD`}</span>
            </div>
            <div className="summary-row">
              <span>Tax (20%)</span>
              <span>{tax} MAD</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{total} MAD</span>
            </div>
            <Link to="/checkout">
              <button className="btn btn-primary w-full mt-4">Proceed to Checkout</button>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .cart-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .cart-title {
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 2rem;
        }
        .cart-title span {
          font-size: 1rem;
          font-weight: normal;
          color: #6b7280;
        }
        .cart-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .cart-grid {
            grid-template-columns: 1fr;
          }
        }
        .cart-items {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .cart-item {
          display: grid;
          grid-template-columns: 80px 1fr auto auto 40px;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        @media (max-width: 640px) {
          .cart-item {
            grid-template-columns: 60px 1fr;
            gap: 0.75rem;
          }
          .cart-item-quantity,
          .cart-item-total,
          .cart-item-remove {
            grid-column: span 2;
            justify-content: space-between;
          }
        }
        .cart-item-image {
          width: 60px;
          height: 60px;
          background: #f3f4f6;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .cart-item-title {
          font-weight: 600;
          color: #1a1a1a;
          text-decoration: none;
        }
        .cart-item-title:hover {
          color: #87CEEB;
        }
        .cart-item-seller {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .cart-item-price {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .cart-item-quantity {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .cart-item-quantity button {
          width: 28px;
          height: 28px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-item-quantity span {
          min-width: 24px;
          text-align: center;
        }
        .cart-item-total {
          font-weight: 600;
        }
        .cart-item-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #ef4444;
        }
        .cart-continue {
          padding: 1rem;
          text-align: center;
        }
        .cart-continue a {
          color: #87CEEB;
          text-decoration: none;
        }
        .cart-summary {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: sticky;
          top: 100px;
        }
        .cart-summary h3 {
          font-size: 1.125rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          color: #6b7280;
        }
        .summary-total {
          display: flex;
          justify-content: space-between;
          padding: 1rem 0;
          border-top: 1px solid #e5e7eb;
          margin-top: 0.5rem;
          font-weight: bold;
          font-size: 1.125rem;
        }
      `}</style>
    </div>
  )
}

export default CartPage