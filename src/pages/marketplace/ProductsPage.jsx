import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import api from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import MarketplaceImage from '../../components/common/MarketplaceImage';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryProduct, setGalleryProduct] = useState(null);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  
  const [activeCondition, setActiveCondition] = useState('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const categories = ['electronics', 'fashion', 'handicrafts', 'books', 'home'];

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (selectedCategory) params.append('category', selectedCategory);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (sortBy) params.append('sortBy', sortBy);
    params.append('page', currentPage);
    params.append('limit', 20);
    params.append('condition', activeCondition);
    if (verifiedOnly) params.append('verified', 'true');

    const response = await api.get(`/products?${params.toString()}`);
    return response.data;
  }, [activeCondition, currentPage, maxPrice, minPrice, searchTerm, selectedCategory, sortBy, verifiedOnly]);

  useEffect(() => {
    let isCurrent = true;

    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        if (!isCurrent) return;

        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalProducts(data.pagination?.total || 0);
      } catch (error) {
        if (!isCurrent) return;

        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadProducts();

    return () => {
      isCurrent = false;
    };
  }, [fetchProducts]);

  const handleAddToCart = (product) => {
    if (!isAuthenticated) { toast.error('Please login'); return; }
    addToCart(product, 1, 'product');
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

  const hasActiveFilters = Boolean(searchTerm || selectedCategory || minPrice || maxPrice || verifiedOnly);
  const activeFilterCount = [searchTerm, selectedCategory, minPrice, maxPrice, verifiedOnly].filter(Boolean).length;

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setVerifiedOnly(false);
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const applySearch = (event) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  if (loading) return <div className="container py-16"><LoadingSkeleton label="Loading products" /></div>;

  return (
    <div className="products-page">
      <div className="container">
        <div className="products-header">
          <h1>Products</h1>
          <p>Discover the best products from Moroccan sellers</p>
        </div>

        <div className="condition-tabs">
          <button className={`tab-btn ${activeCondition === 'new' ? 'active' : ''}`} onClick={() => { setActiveCondition('new'); setCurrentPage(1); }}>New</button>
          <button className={`tab-btn ${activeCondition === 'used_as_new' ? 'active' : ''}`} onClick={() => { setActiveCondition('used_as_new'); setCurrentPage(1); }}>Used as New</button>
          <button className={`tab-btn ${activeCondition === 'joutiya' ? 'active' : ''}`} onClick={() => { setActiveCondition('joutiya'); setCurrentPage(1); }}>Joutiya (Haggle)</button>
        </div>

        <div className="filters-bar">
          <form className="product-search-form" onSubmit={applySearch}>
            <input type="search" placeholder="Search products..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="product-search-input" aria-label="Search products" />
            <button type="submit" className="product-search-btn">Search</button>
          </form>
          <div className="filter-toolbar">
            <button type="button" className="filters-toggle" onClick={() => setShowMobileFilters((isOpen) => !isOpen)} aria-controls="product-filter-fields" aria-expanded={showMobileFilters}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            {hasActiveFilters && <button type="button" className="clear-filters-btn" onClick={clearFilters}>Clear filters</button>}
          </div>
          <div id="product-filter-fields" className={`filter-fields ${showMobileFilters ? 'filter-fields-open' : ''}`}>
            <div className="filters">
              <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="filter-select" aria-label="Category">
                <option value="">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
              <input type="number" min="0" placeholder="Min Price" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }} className="price-input" aria-label="Minimum price" />
              <input type="number" min="0" placeholder="Max Price" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }} className="price-input" aria-label="Maximum price" />
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} className="filter-select" aria-label="Sort products">
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
            <div className="filter-verified">
              <label>
                <input type="checkbox" checked={verifiedOnly} onChange={(e) => { setVerifiedOnly(e.target.checked); setCurrentPage(1); }} />
                <span>Verified sellers only</span>
              </label>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="active-filters" aria-label="Active filters">
              {searchTerm && <button type="button" className="filter-chip" onClick={() => { setSearchInput(''); setSearchTerm(''); setCurrentPage(1); }}>Search: {searchTerm} <span aria-hidden="true">×</span></button>}
              {selectedCategory && <button type="button" className="filter-chip" onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}>{selectedCategory} <span aria-hidden="true">×</span></button>}
              {minPrice && <button type="button" className="filter-chip" onClick={() => { setMinPrice(''); setCurrentPage(1); }}>From {minPrice} MAD <span aria-hidden="true">×</span></button>}
              {maxPrice && <button type="button" className="filter-chip" onClick={() => { setMaxPrice(''); setCurrentPage(1); }}>Up to {maxPrice} MAD <span aria-hidden="true">×</span></button>}
              {verifiedOnly && <button type="button" className="filter-chip" onClick={() => { setVerifiedOnly(false); setCurrentPage(1); }}>Verified sellers <span aria-hidden="true">×</span></button>}
            </div>
          )}
          <div className="results-count" aria-live="polite">{totalProducts} products found{hasActiveFilters ? ` with ${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}` : ''}</div>
        </div>

        <div className="products-grid">
          {products.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No products found"
                description="Try a different search or clear a filter to see more listings."
                action={<button type="button" className="btn btn-outline" onClick={clearFilters}>Clear filters</button>}
              />
            </div>
          ) : (
            products.map(product => (
              <div key={product.id} className="product-card">
                <div
                  className="product-image"
                  role={product.media?.length ? 'button' : undefined}
                  tabIndex={product.media?.length ? 0 : undefined}
                  aria-label={product.media?.length ? `View media for ${product.title}` : undefined}
                  onClick={() => product.media?.length && setGalleryProduct(product)}
                  onKeyDown={(event) => {
                    if (product.media?.length && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setGalleryProduct(product);
                    }
                  }}
                >
                  {product.media && product.media.length > 0 ? (
                    <>
                      {product.media[0].media_type === 'video' && <div className="video-badge">🎬 Video</div>}
                      <MarketplaceImage source={product.media[0].media_url} alt={product.title} />
                      {product.media.length > 1 && <div className="media-count">{product.media.length} items</div>}
                    </>
                  ) : (
                    <div className="image-placeholder">📦</div>
                  )}
                  <div className="condition-badge">{conditionLabels[product.condition] || 'New'}</div>
                </div>
                <Link to={`/product/${product.id}`}><h3>{product.title}</h3></Link>
                <p>
                  by <Link to={`/profile/${product.seller_id}`} className="seller-link">{product.seller_name || 'Unknown Seller'}</Link>
                </p>
                <div className="product-rating">⭐ {product.rating || 0} ({product.reviews_count || 0} reviews)</div>
                <div className="product-price">
                  <span className="current-price">{product.price} MAD</span>
                  {product.old_price && <span className="old-price">{product.old_price} MAD</span>}
                </div>
                {product.condition === 'joutiya' ? (
                  <Link to={`/product/${product.id}`} className="product-btn negotiate-btn">Make an Offer</Link>
                ) : (
                  <button onClick={() => handleAddToCart(product)} className="product-btn">Add to Cart</button>
                )}
              </div>
            ))
          )}
        </div>

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
          media={galleryProduct.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}
          onClose={() => setGalleryProduct(null)}
        />
      )}

      <style>{`
        /* keep your existing styles unchanged */
        .products-page { padding: 2rem 0; min-height: calc(100vh - 80px); }
        .products-header { text-align: center; margin-bottom: 2rem; }
        .condition-tabs { display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
        .condition-tabs .tab-btn { padding: 0.5rem 1.5rem; background: none; border: none; font-size: 1rem; font-weight: 500; cursor: pointer; border-radius: 2rem; transition: all 0.2s; color: #6b7280; }
        .condition-tabs .tab-btn.active { background: #87CEEB; color: #1a1a1a; }
        .condition-tabs .tab-btn:hover:not(.active) { background: #f3f4f6; }
        .filters-bar { background: white; border-radius: 1rem; padding: 1rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .products-page .product-search-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .products-page .product-search-input { flex: 1; min-height: 44px; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .products-page .product-search-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.16); }
        .products-page .product-search-btn { min-height: 44px; padding: 0.75rem 1.5rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .products-page .product-search-btn:hover { background: #333; }
        .products-page .product-search-btn:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.55); outline-offset: 2px; }
        .filter-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
        .filters-toggle { display: none; min-height: 44px; padding: 0.5rem 1rem; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 0.5rem; color: #1a1a1a; font-weight: 600; cursor: pointer; }
        .clear-filters-btn { min-height: 36px; padding: 0.4rem 0.75rem; background: none; border: none; color: #4b5563; font-weight: 600; cursor: pointer; }
        .filters-toggle:focus-visible, .clear-filters-btn:focus-visible, .filter-chip:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.55); outline-offset: 2px; }
        .filters { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
        .filter-select, .price-input { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .price-input { width: 100px; }
        .filter-verified { margin-bottom: 1rem; font-size: 0.875rem; }
        .filter-verified label { display: flex; align-items: center; gap: 0.5rem; width: fit-content; cursor: pointer; }
        .active-filters { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0 0 1rem; }
        .filter-chip { display: inline-flex; min-height: 32px; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; background: rgba(135, 206, 235, 0.2); border: 1px solid rgba(95, 158, 160, 0.28); border-radius: 999px; color: #1f2937; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .filter-chip:hover { background: rgba(135, 206, 235, 0.34); }
        .results-count { font-size: 0.875rem; color: #6b7280; text-align: right; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .product-card { display: flex; flex-direction: column; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.3s; position: relative; }
        .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .product-image { height: 200px; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; }
        .product-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; }
        .video-badge { position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .media-count { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: white; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .condition-badge { position: absolute; top: 0.5rem; right: 0.5rem; background: #87CEEB; color: #1a1a1a; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; font-weight: 500; }
        .product-card h3 { font-size: 1rem; margin: 0.75rem 1rem 0.25rem; }
        .product-card p { font-size: 0.75rem; color: #6b7280; margin: 0 1rem 0.5rem; }
        .seller-link { color: #87CEEB; text-decoration: none; }
        .product-rating { font-size: 0.7rem; color: #f59e0b; margin: 0 1rem 0.5rem; }
        .product-price { margin: 0 1rem 0.5rem; display: flex; gap: 0.5rem; align-items: baseline; }
        .current-price { font-weight: 700; }
        .old-price { font-size: 0.75rem; color: #9ca3af; text-decoration: line-through; }
        .product-btn { display: inline-flex; width: calc(100% - 2rem); min-height: 44px; margin: auto 1rem 1rem; align-items: center; justify-content: center; padding: 0.6rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; text-decoration: none; }
        .negotiate-btn { background: #f59e0b; color: white; }
        .negotiate-btn:hover { background: #d97706; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
        .page-btn { padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-info { font-size: 0.875rem; color: #6b7280; }
        @media (max-width: 768px) {
          .condition-tabs { gap: 0.25rem; }
          .condition-tabs .tab-btn { flex: 1; min-height: 44px; padding: 0.5rem; font-size: 0.8rem; }
          .filters-toggle { display: inline-flex; align-items: center; }
          .filter-fields { display: none; }
          .filter-fields.filter-fields-open { display: block; }
          .filters { flex-direction: column; }
          .filter-select, .price-input { width: 100%; min-height: 44px; }
          .filter-verified { margin-bottom: 0.5rem; }
          .results-count { text-align: left; }
        }
      `}</style>
    </div>
  );
};

export default ProductsPage;
