import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { StarIcon, HeartIcon, TruckIcon, ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

const ProductDetailsPage = () => {
  const { id } = useParams()
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')

  const product = {
    id: 1,
    title: 'iPhone 13 Pro',
    price: 9500,
    oldPrice: 10500,
    seller: 'TechStore',
    rating: 4.8,
    reviews: 128,
    inStock: true,
    image: '📱',
    description: 'The iPhone 13 Pro features the A15 Bionic chip, Pro camera system, and Super Retina XDR display.',
    specifications: [
      { label: 'Display', value: '6.1-inch Super Retina XDR' },
      { label: 'Processor', value: 'A15 Bionic' },
      { label: 'Camera', value: 'Triple 12MP system' },
      { label: 'Battery', value: 'Up to 22 hours' },
    ]
  }

  return (
    <div className="product-details">
      <div className="container">
        <div className="product-grid">
          <div className="product-image">
            <div className="image-placeholder">{product.image}</div>
          </div>

          <div className="product-info">
            <h1>{product.title}</h1>
            <div className="product-meta">
              <div className="product-rating">
                <StarIcon className="star-icon" />
                <span>{product.rating}</span>
                <span className="review-count">({product.reviews} reviews)</span>
              </div>
              <div className="product-seller">
                by <span>{product.seller}</span>
              </div>
            </div>

            <div className="product-price">
              <span className="current-price">{product.price} MAD</span>
              {product.oldPrice && <span className="old-price">{product.oldPrice} MAD</span>}
            </div>

            <div className="product-stock">
              {product.inStock ? <span className="in-stock">In Stock</span> : <span className="out-of-stock">Out of Stock</span>}
            </div>

            <div className="product-quantity">
              <label>Quantity</label>
              <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            <div className="product-actions">
              <button className="add-to-cart-btn">Add to Cart</button>
              <button className="favorite-btn">
                <HeartIcon className="heart-icon" />
              </button>
            </div>

            <div className="product-shipping">
              <div className="shipping-item">
                <TruckIcon className="shipping-icon" />
                <span>Free shipping on orders over 500 MAD</span>
              </div>
              <div className="shipping-item">
                <ShieldCheckIcon className="shipping-icon" />
                <span>14-day money-back guarantee</span>
              </div>
              <div className="shipping-item">
                <ArrowPathIcon className="shipping-icon" />
                <span>7-day return policy</span>
              </div>
            </div>
          </div>
        </div>

        <div className="product-tabs">
          <div className="tabs-header">
            <button className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
            <button className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`} onClick={() => setActiveTab('specifications')}>Specifications</button>
          </div>
          <div className="tabs-content">
            {activeTab === 'description' && <p>{product.description}</p>}
            {activeTab === 'specifications' && (
              <div className="specs-list">
                {product.specifications.map(spec => (
                  <div key={spec.label} className="spec-item">
                    <span className="spec-label">{spec.label}</span>
                    <span className="spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .product-details {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .product-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }
        @media (max-width: 768px) {
          .product-grid {
            grid-template-columns: 1fr;
          }
        }
        .image-placeholder {
          background: #f3f4f6;
          border-radius: 1rem;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8rem;
        }
        .product-info h1 {
          font-size: 1.75rem;
          margin-bottom: 1rem;
        }
        .product-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .product-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #f59e0b;
        }
        .star-icon {
          width: 1rem;
          height: 1rem;
          fill: #f59e0b;
        }
        .review-count {
          color: #6b7280;
          margin-left: 0.25rem;
        }
        .product-price {
          margin-bottom: 1rem;
        }
        .current-price {
          font-size: 1.5rem;
          font-weight: bold;
        }
        .old-price {
          font-size: 1rem;
          color: #9ca3af;
          text-decoration: line-through;
          margin-left: 0.5rem;
        }
        .product-stock {
          margin-bottom: 1rem;
        }
        .in-stock {
          color: #10b981;
        }
        .product-quantity {
          margin-bottom: 1.5rem;
        }
        .quantity-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .quantity-selector button {
          width: 2rem;
          height: 2rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .product-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .add-to-cart-btn {
          flex: 1;
          padding: 0.75rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          cursor: pointer;
        }
        .favorite-btn {
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 2rem;
          cursor: pointer;
        }
        .heart-icon {
          width: 1.25rem;
          height: 1.25rem;
        }
        .product-shipping {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }
        .shipping-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }
        .shipping-icon {
          width: 1rem;
          height: 1rem;
        }
        .product-tabs {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .tabs-header {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }
        .tab-btn {
          padding: 1rem 2rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .tab-btn.active {
          color: #87CEEB;
          border-bottom: 2px solid #87CEEB;
        }
        .tabs-content {
          padding: 1.5rem;
        }
        .specs-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .spec-item {
          display: flex;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .spec-label {
          width: 150px;
          font-weight: 500;
        }
        .spec-value {
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default ProductDetailsPage