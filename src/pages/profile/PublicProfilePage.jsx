import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPinIcon, EnvelopeIcon, PhoneIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const userRes = await api.get(`/users/${userId}`);
        setProfile(userRes.data.user);
        const productsRes = await api.get(`/users/${userId}/products`);
        setProducts(productsRes.data.products || []);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Seller not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const handleSendMessage = () => {
    navigate(`/messages/${userId}`);
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading profile...</p></div>;
  if (!profile) return <div className="container text-center py-16"><p>Seller not found</p><Link to="/">Go Home</Link></div>;

  const isSeller = profile.seller_type && profile.seller_type !== null && profile.seller_type !== '';
  const sellerTypeLabel = {
    product: '🛍️ Product Seller',
    course: '📚 Course Instructor',
    service: '🛠️ Service Provider',
    digital: '💻 Digital Creator',
    booking: '📅 Booking Pro'
  }[profile.seller_type] || 'Seller';

  return (
    <div className="public-profile">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.profilePicture ? (
              <img src={`http://localhost:5000${profile.profilePicture}`} alt={profile.name} />
            ) : (
              <div className="avatar-initial">{profile.name?.charAt(0) || 'U'}</div>
            )}
          </div>
          <div className="profile-info">
            <h1>{profile.name}</h1>
            <div className="profile-badge">
              {isSeller ? (
                <span className="badge-seller">{sellerTypeLabel}</span>
              ) : (
                <span className="badge-buyer">🛒 Buyer</span>
              )}
            </div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-details">
              {profile.city && (
                <div className="detail-item">
                  <MapPinIcon className="detail-icon" />
                  <span>{profile.city}, {profile.country || 'Morocco'}</span>
                </div>
              )}
              
              {/* Chat Button - only show if logged in and not viewing own profile */}
              {isAuthenticated && user?.id !== profile.id && (
                <button onClick={handleSendMessage} className="chat-btn">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  Message {profile.name}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {products.length > 0 && (
          <div className="seller-products">
            <h2>Products by {profile.name}</h2>
            <div className="products-grid">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  <Link to={`/product/${product.id}`}>
                    <div className="product-image">
                      {product.media && product.media.length > 0 ? (
                        <img src={`http://localhost:5000${product.media[0].media_url}`} alt={product.title} />
                      ) : (
                        <div className="image-placeholder">📦</div>
                      )}
                    </div>
                    <h3>{product.title}</h3>
                    <p className="price">{product.price} MAD</p>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`
        .public-profile { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .profile-header { display: flex; gap: 2rem; align-items: center; background: white; border-radius: 1rem; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        @media (max-width: 768px) { .profile-header { flex-direction: column; text-align: center; } }
        .profile-avatar { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #87CEEB, #5F9EA0); display: flex; align-items: center; justify-content: center; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-initial { font-size: 3rem; color: white; font-weight: bold; }
        .profile-info h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
        .profile-badge { margin-bottom: 1rem; }
        .badge-seller, .badge-buyer { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 500; }
        .badge-seller { background: #d1fae5; color: #065f46; }
        .badge-buyer { background: #e0e7ff; color: #3730a3; }
        .profile-bio { color: #4b5563; margin-bottom: 1rem; }
        .profile-details { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
        .detail-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #6b7280; }
        .detail-icon { width: 1rem; height: 1rem; }
        .chat-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #87CEEB; color: #1a1a1a; border: none; border-radius: 2rem; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .chat-btn:hover { background: #6bb5d4; transform: translateY(-1px); }
        .seller-products h2 { font-size: 1.25rem; margin-bottom: 1rem; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem; }
        .product-card { background: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .product-card:hover { transform: translateY(-4px); }
        .product-card a { text-decoration: none; color: inherit; }
        .product-image { height: 160px; background: #f3f4f6; overflow: hidden; }
        .product-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .product-card h3 { font-size: 0.9rem; margin: 0.75rem; font-weight: 600; }
        .product-card .price { margin: 0 0.75rem 0.75rem; font-weight: bold; color: #1a1a1a; }
      `}</style>
    </div>
  );
};

export default PublicProfilePage;