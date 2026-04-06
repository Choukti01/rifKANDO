import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }
    addToCart(product, 1, 'product');
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>Products</h1>
          <p>Discover the best products from Moroccan sellers</p>
        </div>

        <div className="products-grid">
          {products.length === 0 ? (
            <p className="text-center col-span-full">No products found</p>
          ) : (
            products.map(product => (
              <div key={product.id} className="product-card">
                <Link to={`/product/${product.id}`}>
                  <div className="product-image">
                    {product.image || '📦'}
                  </div>
                  <div className="product-content">
                    <h3>{product.title}</h3>
                    <p>{product.seller?.name || 'Unknown Seller'}</p>
                    <div className="product-price">
                      <span className="current-price">{product.price} MAD</span>
                      {product.old_price && (
                        <span className="old-price">{product.old_price} MAD</span>
                      )}
                    </div>
                  </div>
                </Link>
                <button 
                  onClick={() => handleAddToCart(product)}
                  className="product-btn"
                >
                  Add to Cart
                </button>
              </div>
            ))
          )}
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
          transition: all 0.3s;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .product-card a {
          text-decoration: none;
          color: inherit;
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
        .product-btn {
          width: calc(100% - 2rem);
          margin: 0 1rem 1rem 1rem;
          padding: 0.6rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .product-btn:hover {
          background: #2c2c2c;
        }
      `}</style>
    </div>
  );
};

export default ProductsPage;