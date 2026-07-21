import React from 'react';
import { Link } from 'react-router-dom';
import { TrashIcon, ShoppingBagIcon, StarIcon } from '@heroicons/react/24/outline';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

const FavoritesPage = () => {
  const { favorites, removeFromFavorites, loading, isEmpty } = useFavorites();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const handleAddToCart = (item) => {
    if (!isAuthenticated) {
      toast.error('Please login to add to cart');
      return;
    }
    addToCart({
      id: item.item_id,
      title: item.title,
      price: item.price,
      image: item.image,
      type: item.type
    }, 1, item.type);
  };

  const getDetailUrl = (item) => {
    switch(item.type) {
      case 'product': return `/product/${item.item_id}`;
      case 'course': return `/course/${item.item_id}`;
      case 'service': return `/service/${item.item_id}`;
      case 'digital': return `/digital/${item.item_id}`;
      case 'booking': return `/booking/${item.item_id}`;
      default: return '#';
    }
  };

  if (loading) {
    return (
      <div className="container py-16"><LoadingSkeleton label="Loading favorites" /></div>
    );
  }

  if (isEmpty) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<span>♡</span>}
          title="No favorites yet"
          description="Save products you love and they’ll be ready for you here."
          action={<Link to="/products" className="btn btn-primary">Explore products</Link>}
        />
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="container">
        <h1 className="favorites-title">My Favorites</h1>

        <div className="favorites-grid">
          {favorites.map(item => (
            <div key={`${item.type}-${item.item_id}`} className="favorite-card">
              <Link to={getDetailUrl(item)} className="favorite-image-link">
                <div className="favorite-image">
                  {item.image || (item.type === 'product' ? '' : 
                                 item.type === 'course' ? '' : 
                                 item.type === 'service' ? '' : 
                                 item.type === 'digital' ? '' : '')}
                </div>
              </Link>
              <div className="favorite-content">
                <Link to={getDetailUrl(item)} className="favorite-title">
                  {item.title}
                </Link>
                <p className="favorite-seller">{item.seller_name}</p>
                <div className="favorite-rating">
                  <StarIcon className="star-icon" />
                  <span>{item.rating || 0}</span>
                </div>
                <div className="favorite-footer">
                  <span className="favorite-price">{item.price} MAD</span>
                  <div className="favorite-buttons">
                    <button 
                      onClick={() => handleAddToCart(item)} 
                      className="cart-btn"
                      title="Add to Cart"
                    >
                      <ShoppingBagIcon className="cart-icon" />
                    </button>
                    <button 
                      onClick={() => removeFromFavorites(item.item_id, item.type)} 
                      className="remove-btn"
                      title="Remove from Favorites"
                    >
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
          background: #f9fafb;
        }
        .favorites-title {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 2rem;
        }
        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .favorite-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }
        .favorite-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .favorite-image-link {
          text-decoration: none;
        }
        .favorite-image {
          height: 180px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .favorite-content {
          padding: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .favorite-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
          text-decoration: none;
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
          margin-top: auto;
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
          padding: 0.5rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .cart-btn {
          background: #1a1a1a;
          color: white;
        }
        .cart-btn:hover {
          background: #2c2c2c;
        }
        .remove-btn {
          background: #fee2e2;
          color: #ef4444;
        }
        .remove-btn:hover {
          background: #fecaca;
        }
        .cart-icon, .remove-icon {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  );
};

export default FavoritesPage;
