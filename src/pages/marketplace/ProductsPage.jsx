import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import api from '../../services/api';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState(null);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  
  // Tab state: 'new', 'used_as_new', 'joutiya'
  const [activeCondition, setActiveCondition] = useState('new');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchInput, setSearchInput] = useState('');

  const categories = ['electronics', 'fashion', 'handicrafts', 'books', 'home'];

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, selectedCategory, minPrice, maxPrice, sortBy, currentPage, activeCondition]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sortBy) params.append('sortBy', sortBy);
      params.append('page', currentPage);
      params.append('limit', 20);
      params.append('condition', activeCondition);  // ← send the condition
      
      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalProducts(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (!isAuthenticated) { toast.error('Please login'); return; }
    addToCart(product, 1, 'product');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchProducts();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const conditionLabels = {
    new: 'New',
    used_as_new: 'Used as New',
    joutiya: 'Joutiya (Haggle)'
  };

  if (loading) return <div className="container text-center py-16"><div className="spinner"></div><p>Loading products...</p></div>;

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>Products</h1>
          <p>Discover the best products from Moroccan sellers</p>
        </div>

        {/* Condition Tabs */}
        <div className="condition-tabs">
          <button
            className={`tab-btn ${activeCondition === 'new' ? 'active' : ''}`}
            onClick={() => { setActiveCondition('new'); setCurrentPage(1); }}
          >
            New
          </button>
          <button
            className={`tab-btn ${activeCondition === 'used_as_new' ? 'active' : ''}`}
            onClick={() => { setActiveCondition('used_as_new'); setCurrentPage(1); }}
          >
            Used as New
          </button>
          <button
            className={`tab-btn ${activeCondition === 'joutiya' ? 'active' : ''}`}
            onClick={() => { setActiveCondition('joutiya'); setCurrentPage(1); }}
          >
            Joutiya (Haggle)
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="filters-bar">
          <div className="search-form">
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(searchInput);
                  setCurrentPage(1);
                  fetchProducts();
                }
              }}
            />
            <button 
              onClick={() => {
                setSearchTerm(searchInput);
                setCurrentPage(1);
                fetchProducts();
              }} 
              className="search-btn"
            >
              Search
            </button>
          </div>
          
          <div className="filters">
            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="filter-select">
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
            </select>
            
            <input type="number" placeholder="Min Price" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }} className="price-input" />
            <input type="number" placeholder="Max Price" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }} className="price-input" />
            
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} className="filter-select">
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
          
          <div className="results-count">{totalProducts} products found</div>
        </div>

        {/* Products Grid */}
        <div className="products-grid">
          {products.length === 0 ? (
            <p className="text-center col-span-full">No products found</p>
          ) : (
            products.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-image" onClick={() => setGalleryProduct(product)}>
                  {product.media && product.media.length > 0 ? (
                    <>
                      {product.media[0].media_type === 'video' && <div className="video-badge">🎬 Video</div>}
                      <img src={`http://localhost:5000${product.media[0].media_url}`} alt={product.title} />
                      {product.media.length > 1 && <div className="media-count">{product.media.length} items</div>}
                    </>
                  ) : (
                    <div className="image-placeholder">📦</div>
                  )}
                  {/* Condition badge */}
                  <div className="condition-badge">{conditionLabels[product.condition] || 'New'}</div>
                </div>
                <Link to={`/product/${product.id}`}><h3>{product.title}</h3></Link>
                <p>by <Link to={`/profile/${product.seller_id}`} className="seller-link">{product.seller_name || 'Unknown Seller'}</Link></p>
                <div className="product-rating">⭐ {product.rating || 0} ({product.reviews_count || 0} reviews)</div>
                <div className="product-price">
                  <span className="current-price">{product.price} MAD</span>
                  {product.old_price && <span className="old-price">{product.old_price} MAD</span>}
                </div>
                {product.condition === 'joutiya' ? (
                  <button className="product-btn negotiate-btn">Make Offer</button>
                ) : (
                  <button onClick={() => handleAddToCart(product)} className="product-btn">Add to Cart</button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="page-btn">← Previous</button>
            <span className="page-info">Page {currentPage} of {totalPages}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="page-btn">Next →</button>
          </div>
        )}
      </div>

      {galleryProduct && (
        <MediaGallery
          media={galleryProduct.media.map(m => ({ url: `http://localhost:5000${m.media_url}`, type: m.media_type }))}
          onClose={() => setGalleryProduct(null)}
        />
      )}

      <style>{`
        .products-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .products-header { text-align: center; margin-bottom: 2rem; }
        
        /* Condition Tabs */
        .condition-tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        .condition-tabs .tab-btn {
          padding: 0.5rem 1.5rem;
          background: none;
          border: none;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 2rem;
          transition: all 0.2s;
          color: #6b7280;
        }
        .condition-tabs .tab-btn.active {
          background: #87CEEB;
          color: #1a1a1a;
        }
        .condition-tabs .tab-btn:hover:not(.active) {
          background: #f3f4f6;
        }
        
        .filters-bar { background: white; border-radius: 1rem; padding: 1rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .search-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .search-input { flex: 1; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .search-btn { padding: 0.75rem 1.5rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .filters { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
        .filter-select, .price-input { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .price-input { width: 100px; }
        .results-count { font-size: 0.875rem; color: #6b7280; text-align: right; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .product-card { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.3s; position: relative; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .product-image { height: 200px; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; }
        .product-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .video-badge { position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .media-count { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .condition-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: #87CEEB;
          color: #1a1a1a;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          font-weight: 500;
        }
        .product-card h3 { font-size: 1rem; margin: 0.75rem 1rem 0.25rem; }
        .product-card p { font-size: 0.75rem; color: #6b7280; margin: 0 1rem 0.5rem; }
        .seller-link { color: #87CEEB; text-decoration: none; }
        .product-rating { font-size: 0.7rem; color: #f59e0b; margin: 0 1rem 0.5rem; }
        .product-price { margin: 0 1rem 0.5rem; display: flex; gap: 0.5rem; align-items: baseline; }
        .current-price { font-weight: 700; }
        .old-price { font-size: 0.75rem; color: #9ca3af; text-decoration: line-through; }
        .product-btn { width: calc(100% - 2rem); margin: 0 1rem 1rem; padding: 0.6rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; }
        .negotiate-btn { background: #f59e0b; color: white; }
        .negotiate-btn:hover { background: #d97706; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
        .page-btn { padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 0.875rem; color: #6b7280; }
        @media (max-width: 768px) { .filters { flex-direction: column; } .price-input { width: 100%; } .condition-badge { font-size: 0.6rem; } }
      `}</style>
    </div>
  );
};

export default ProductsPage;