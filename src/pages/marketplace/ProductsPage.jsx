import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { StarIcon } from '@heroicons/react/24/outline'

const ProductsPage = () => {
  const products = [
    { id: 1, title: 'iPhone 13 Pro', price: 9500, oldPrice: 10500, seller: 'TechStore', rating: 4.8, image: '📱', category: 'electronics' },
    { id: 2, title: 'Nike Air Max', price: 890, seller: 'Sportify', rating: 4.5, image: '👟', category: 'fashion' },
    { id: 3, title: 'Moroccan Leather Bag', price: 1200, oldPrice: 1500, seller: 'Artisanat Maroc', rating: 4.9, image: '👜', category: 'handicrafts' },
    { id: 4, title: 'Smart Watch Series 7', price: 2200, seller: 'GadgetHub', rating: 4.6, image: '⌚', category: 'electronics' },
  ]

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>Products</h1>
          <p>Discover the best products from Moroccan sellers</p>
        </div>

        <div className="products-grid">
          {products.map(product => (
            <Link key={product.id} to={`/product/${product.id}`} className="product-card">
              <div className="product-image">{product.image}</div>
              <div className="product-content">
                <h3>{product.title}</h3>
                <p>{product.seller}</p>
                <div className="product-price">
                  <span className="current-price">{product.price} MAD</span>
                  {product.oldPrice && <span className="old-price">{product.oldPrice} MAD</span>}
                </div>
                <div className="product-rating">
                  <StarIcon className="star-icon" />
                  <span>{product.rating}</span>
                </div>
                <button className="product-btn">Add to Cart</button>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .products-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .products-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .products-header h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .product-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          transition: all 0.3s;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .product-image {
          height: 200px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
        }
        .product-content {
          padding: 1rem;
        }
        .product-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .product-content p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .product-price {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .current-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .old-price {
          font-size: 0.75rem;
          color: #9ca3af;
          text-decoration: line-through;
        }
        .product-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-bottom: 1rem;
          color: #f59e0b;
          font-size: 0.75rem;
        }
        .star-icon {
          width: 0.875rem;
          height: 0.875rem;
          fill: #f59e0b;
        }
        .product-btn {
          width: 100%;
          padding: 0.5rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .product-btn:hover {
          background: #2c2c2c;
        }
      `}</style>
    </div>
  )
}

export default ProductsPage