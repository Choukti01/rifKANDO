import React from 'react'
import { Link } from 'react-router-dom'
import { TrashIcon, PlusIcon, MinusIcon, ShoppingCartIcon, ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import useCart from '../../hooks/useCart'
import MarketplaceImage from '../../components/common/MarketplaceImage'

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal, getCartCount, isEmpty } = useCart()
  const subtotal = getCartTotal()
  const shipping = subtotal > 500 ? 0 : 50
  const total = subtotal + shipping

  const getProductImage = (item) => {
    if (item.media && item.media.length > 0) {
      return item.media[0].media_url || item.media[0].url;
    }
    return item.image || null;
  }

  const formatAmount = (amount) => `${Number(amount || 0).toLocaleString()} MAD`

  if (isEmpty) {
    return (
      <div className="empty-cart">
        <ShoppingCartIcon className="empty-cart-icon" aria-hidden="true" />
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
            width: 4rem;
            height: 4rem;
            color: #216275;
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
        <div className="cart-heading">
          <div>
            <p className="cart-eyebrow">Your basket</p>
            <h1 className="cart-title">Shopping cart <span>({getCartCount()} {getCartCount() === 1 ? 'item' : 'items'})</span></h1>
          </div>
          <p className="cart-heading-note">Review your items before checkout.</p>
        </div>

        <div className="cart-grid">
          <div className="cart-items">
            {cart.map(item => {
              const imageSrc = getProductImage(item)
              const atStockLimit = Number.isFinite(Number(item.stock)) && item.quantity >= Number(item.stock)
              return (
                <div key={`${item.id}-${item.type}`} className="cart-item">
                  <div className="cart-item-image">
                    <MarketplaceImage source={imageSrc} alt={item.title} className="cart-item-media" />
                  </div>
                  <div className="cart-item-info">
                    <Link to={`/${item.type}/${item.id}`} className="cart-item-title">{item.title}</Link>
                    <p className="cart-item-seller">Sold by {item.seller || 'Seller'}</p>
                    <div className="cart-item-price">{formatAmount(item.price)}</div>
                  </div>
                  <div className="cart-item-quantity" role="group" aria-label={`Quantity for ${item.title}`}>
                    <button type="button" onClick={() => updateQuantity(item.id, item.type, item.quantity - 1)} disabled={item.quantity <= 1} aria-label={`Decrease quantity for ${item.title}`}>
                      <MinusIcon className="w-4 h-4" />
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)} disabled={atStockLimit} aria-label={`Increase quantity for ${item.title}`}>
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="cart-item-total"><span>Line total</span>{formatAmount(item.price * item.quantity)}</div>
                  <button type="button" onClick={() => removeFromCart(item.id, item.type)} className="cart-item-remove" aria-label={`Remove ${item.title} from cart`}>
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              )
            })}
            <div className="cart-continue">
              <Link to="/products"><ArrowLeftIcon aria-hidden="true" />Continue shopping</Link>
            </div>
          </div>

          <div className="cart-summary">
            <h3>Order summary</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatAmount(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : formatAmount(shipping)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{formatAmount(total)}</span>
            </div>
            {shipping > 0 && <p className="shipping-note">Free delivery applies to orders over 500 MAD.</p>}
            <Link to="/checkout" className="checkout-link">Continue to checkout</Link>
            <p className="cart-secure-note"><ShieldCheckIcon aria-hidden="true" />Delivery and payment details are reviewed at checkout.</p>
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
          font-weight: 800;
          letter-spacing: -0.035em;
          margin: 0;
        }
        .cart-title span {
          font-size: 1rem;
          font-weight: normal;
          color: #6b7280;
        }
        .cart-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.75rem; }
        .cart-eyebrow { margin-bottom: 0.35rem; color: #216275; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .cart-heading-note { color: #6b7280; font-size: 0.875rem; }
        .cart-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .cart-grid {
            grid-template-columns: 1fr;
          }
          .cart-heading { align-items: flex-start; flex-direction: column; margin-bottom: 1.25rem; }
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
            grid-template-columns: 60px 1fr auto;
            gap: 0.75rem;
          }
          .cart-item-image { grid-row: span 2; }
          .cart-item-quantity { grid-column: 2; justify-content: flex-start; }
          .cart-item-total { grid-column: 1 / -1; }
          .cart-item-remove { grid-column: 3; grid-row: 1; }
          .cart-summary { position: static; }
          .cart-item-quantity button { width: 40px; height: 40px; }
          .cart-item-remove { min-width: 44px; min-height: 44px; }
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
        .cart-item-media { width: 100%; height: 100%; }
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
          width: 32px;
          height: 32px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-item-quantity button:hover:not(:disabled) { background: #e8f7fc; border-color: #87CEEB; }
        .cart-item-quantity button:disabled { opacity: 0.45; cursor: not-allowed; }
        .cart-item-quantity span {
          min-width: 24px;
          text-align: center;
        }
        .cart-item-total {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.15rem;
          font-weight: 800;
        }
        .cart-item-total span {
          color: #6b7280;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .cart-item-remove {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          color: #ef4444;
        }
        .cart-item-remove:hover { border-color: #ef4444; background: #fff5f5; }
        .cart-continue {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
        }
        .cart-continue a {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #216275;
          font-size: 0.875rem;
          font-weight: 700;
          text-decoration: none;
        }
        .cart-continue svg { width: 1rem; height: 1rem; }
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
        .shipping-note { margin: 0 0 1rem; color: #4b5563; font-size: 0.75rem; line-height: 1.5; }
        .checkout-link { display: flex; min-height: 48px; align-items: center; justify-content: center; border-radius: 0.65rem; background: #1a1a1a; color: white; font-weight: 800; text-decoration: none; }
        .checkout-link:hover { background: #333; }
        .cart-secure-note { display: flex; align-items: flex-start; gap: 0.4rem; margin: 1rem 0 0; padding-top: 1rem; border-top: 1px solid #e5e7eb; color: #4b5563; font-size: 0.75rem; line-height: 1.45; }
        .cart-secure-note svg { flex: 0 0 auto; width: 1rem; height: 1rem; color: #216275; }
        .cart-item-quantity button:focus-visible, .cart-item-remove:focus-visible, .cart-continue a:focus-visible, .checkout-link:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.6); outline-offset: 3px; }
      `}</style>
    </div>
  )
}

export default CartPage
