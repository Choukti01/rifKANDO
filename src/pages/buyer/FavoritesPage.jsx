import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrashIcon, ShoppingBagIcon, StarIcon } from '@heroicons/react/24/outline'

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([
    { id: 1, title: 'iPhone 13 Pro', price: 9500, seller: 'TechStore', rating: 4.8, image: '📱', type: 'product' },
    { id: 2, title: 'Complete React.js Course', price: 499, seller: 'Ahmed Alawi', rating: 4.9, image: '📚', type: 'course' },
    { id: 3, title: 'Logo Design Service', price: 800, seller: 'Creative Studio', rating: 4.7, image: '🎨', type: 'service' },
  ])

  const removeFavorite = (id) => {
    setFavorites(favorites.filter(item => item.id !== id))
  }

  if (favorites.length === 0) {
    return (
      <div className="empty-favorites">
        <div className="empty-icon">❤️</div>
        <h2>No favorites yet</h2>
        <p>Start adding items to your favorites</p>
        <Link to="/products" className="btn-primary">Explore Products</Link>
        <style>{`
          .empty-favorites {
            text-align: center;
            padding: 4rem 2rem;
          }
          .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          .empty-favorites h2 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }
          .empty-favorites p {
            color: #6b7280;
            margin-bottom: 2rem;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="favorites-page">
      <div className="container">
        <h1 className="favorites-title">My Favorites</h1>

        <div className="favorites-grid">
          {favorites.map(item => (
            <div key={item.id} className="favorite-card">
              <div className="favorite-image">{item.image}</div>
              <div className="favorite-content">
                <Link to={`/${item.type}/${item.id}`} className="favorite-title">
                  {item.title}
                </Link>
                <p className="favorite-seller">{item.seller}</p>
                <div className="favorite-rating">
                  <StarIcon className="star-icon" />
                  <span>{item.rating}</span>
                </div>
                <div className="favorite-footer">
                  <span className="favorite-price">{item.price} MAD</span>
                  <div className="favorite-buttons">
                    <button className="cart-btn">
                      <ShoppingBagIcon className="cart-icon" />
                    </button>
                    <button onClick={() => removeFavorite(item.id)} className="remove-btn">
                      <TrashIcon className="remove-icon" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .favorites-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .favorites-title {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 2rem;
        }
        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .favorite-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s;
        }
        .favorite-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .favorite-image {
          height: 160px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .favorite-content {
          padding: 1rem;
        }
        .favorite-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
          text-decoration: none;
          display: block;
        }
        .favorite-title:hover {
          color: #87CEEB;
        }
        .favorite-seller {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .favorite-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-bottom: 1rem;
          font-size: 0.75rem;
          color: #f59e0b;
        }
        .star-icon {
          width: 0.875rem;
          height: 0.875rem;
          fill: #f59e0b;
        }
        .favorite-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .favorite-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .favorite-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .cart-btn, .remove-btn {
          padding: 0.375rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-btn {
          background: #1a1a1a;
          color: white;
        }
        .remove-btn {
          background: #fee2e2;
          color: #ef4444;
        }
        .cart-icon, .remove-icon {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  )
}

export default FavoritesPage