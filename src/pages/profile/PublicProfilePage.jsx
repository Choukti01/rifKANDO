import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import { getImageUrl } from '../../utils/imageUtils';

const PublicProfilePage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    const loadProfile = async () => {
      try {
        const [userRes, productsRes] = await Promise.all([
          api.get(`/users/${userId}`),
          api.get(`/users/${userId}/products`)
        ]);
        if (!isCurrent) return;

        setUser(userRes.data.user);
        setProducts(productsRes.data.products || []);
      } catch (error) {
        if (isCurrent) console.error('Error fetching profile:', error);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  if (loading) return <div className="text-center py-16"><div className="spinner"></div><p>Loading profile...</p></div>;
  if (!user) return <div className="text-center py-16">User not found</div>;

  return (
    <div className="public-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.profilePicture ? (
            <img src={getImageUrl(user.profilePicture)} alt={user.name} />
          ) : (
            <span>{user.name.charAt(0)}</span>
          )}
        </div>
        <div className="profile-info">
          <h1>
            {user.name}
            {user.is_verified_seller === 1 && <VerifiedBadge size="medium" />}
          </h1>
          <p className="profile-bio">{user.bio || 'No bio yet'}</p>
          <p className="profile-location">{user.city}, {user.country}</p>
          <p className="profile-role">{user.seller_type ? `${user.seller_type} seller` : 'Buyer'}</p>
        </div>
      </div>

      <div className="profile-products">
        <h2>Products by {user.name}</h2>
        {products.length === 0 ? (
          <p>No products listed yet.</p>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <Link to={`/product/${product.id}`} key={product.id} className="product-card">
                <div className="product-image">
                  {product.media && product.media[0] ? (
                    <img src={getImageUrl(product.media[0].media_url)} alt={product.title} />
                  ) : (
                    <div className="image-placeholder">📦</div>
                  )}
                </div>
                <h3>{product.title}</h3>
                <div className="product-price">{product.price} MAD</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .public-profile { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .profile-header { display: flex; gap: 2rem; margin-bottom: 3rem; align-items: center; flex-wrap: wrap; }
        .profile-avatar { width: 120px; height: 120px; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; overflow: hidden; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-info h1 { font-size: 1.75rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
        .profile-bio { color: #6b7280; margin-bottom: 0.5rem; }
        .profile-location { font-size: 0.875rem; color: #6b7280; }
        .profile-role { font-size: 0.75rem; background: #f3f4f6; display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.5rem; margin-top: 0.5rem; }
        .profile-products h2 { font-size: 1.25rem; margin-bottom: 1rem; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }
        .product-card { background: white; border-radius: 1rem; overflow: hidden; text-decoration: none; color: inherit; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .product-image { height: 150px; background: #f3f4f6; overflow: hidden; }
        .product-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .product-card h3 { font-size: 0.9rem; padding: 0.5rem; margin: 0; }
        .product-price { padding: 0 0.5rem 0.5rem; font-weight: bold; }
      `}</style>
    </div>
  );
};

export default PublicProfilePage;
