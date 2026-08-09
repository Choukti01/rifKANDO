import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { getProducts, getCourses, getServices, getDigitalProducts, getBookings } from '../../services/api';
import toast from 'react-hot-toast';
import MarketplaceImage from '../../components/common/MarketplaceImage';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const searchInputRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [results, setResults] = useState([]);
  const [completedSearchKey, setCompletedSearchKey] = useState('');
  const searchKey = JSON.stringify({ query, filterType, sortBy });
  const loading = Boolean(query) && completedSearchKey !== searchKey;
  const visibleResults = query ? results : [];

  // Fetch all data from all categories
  const fetchAllData = useCallback(async () => {
    try {
      const [productsRes, coursesRes, servicesRes, digitalRes, bookingsRes] = await Promise.all([
        getProducts(),
        getCourses(),
        getServices(),
        getDigitalProducts(),
        getBookings()
      ]);

      const allResults = [
        ...(productsRes.data.products || []).map(item => ({ ...item, type: 'product', searchTitle: item.title })),
        ...(coursesRes.data.courses || []).map(item => ({ ...item, type: 'course', searchTitle: item.title })),
        ...(servicesRes.data.services || []).map(item => ({ ...item, type: 'service', searchTitle: item.title })),
        ...(digitalRes.data.products || []).map(item => ({ ...item, type: 'digital', searchTitle: item.title })),
        ...(bookingsRes.data.bookings || []).map(item => ({ ...item, type: 'booking', searchTitle: item.title }))
      ];

      return allResults;
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load search results');
      return [];
    }
  }, []);

  useEffect(() => {
    if (!query) return undefined;

    let isCurrent = true;

    const performSearch = async () => {
      const allData = await fetchAllData();

      let filtered = allData.filter(item =>
        item.searchTitle.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      );

      if (filterType !== 'all') {
        filtered = filtered.filter(item => item.type === filterType);
      }

      if (sortBy === 'price-low') {
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === 'price-high') {
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (sortBy === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      if (!isCurrent) return;

      setResults(filtered);
      setCompletedSearchKey(searchKey);
    };

    void performSearch();

    return () => {
      isCurrent = false;
    };
  }, [fetchAllData, filterType, query, searchKey, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    const nextQuery = searchInputRef.current?.value.trim();
    if (nextQuery) {
      navigate(`/search?q=${encodeURIComponent(nextQuery)}`);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      product: 'Product',
      course: 'Course',
      service: 'Service',
      digital: 'Digital',
      booking: 'Booking'
    };
    return labels[type] || type;
  };

  const getDetailUrl = (item) => {
    switch(item.type) {
      case 'product': return `/product/${item.id}`;
      case 'course': return `/course/${item.id}`;
      case 'service': return `/service/${item.id}`;
      case 'digital': return `/digital/${item.id}`;
      case 'booking': return `/booking/${item.id}`;
      default: return '#';
    }
  };

  const getImageIcon = (item) => {
    if (item.image) return item.image;
    const icons = {
      product: '📦',
      course: '📚',
      service: '🛠️',
      digital: '💻',
      booking: '📅'
    };
    return icons[item.type] || '📦';
  };

  const getPrimaryMedia = (item) => item.media?.find((media) => media.is_primary) || item.media?.[0];
  const hasActiveFilters = filterType !== 'all' || sortBy !== 'relevance';

  const clearFilters = () => {
    setFilterType('all');
    setSortBy('relevance');
    setShowFilters(false);
  };

  const runSuggestedSearch = (suggestion) => {
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  if (loading) {
    return (
      <div className="search-page">
        <div className="container">
          <div className="search-header">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <MagnifyingGlassIcon className="search-icon" />
                <input
                  type="text"
                  placeholder="Search products, courses, services..."
                  ref={searchInputRef}
                  defaultValue={query}
                />
                <button type="button" onClick={() => setShowFilters(!showFilters)} className="filter-toggle" aria-label="Toggle search filters" aria-controls="search-filters" aria-expanded={showFilters}>
                  <FunnelIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
          <div className="text-center py-16">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-page">
      <div className="container">
        {/* Search Header */}
        <div className="search-header">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <MagnifyingGlassIcon className="search-icon" />
              <input
                type="text"
                placeholder="Search products, courses, services..."
                ref={searchInputRef}
                defaultValue={query}
              />
              <button type="submit" className="search-submit">Search</button>
              <button type="button" onClick={() => setShowFilters(!showFilters)} className="filter-toggle" aria-label="Toggle search filters" aria-controls="search-filters" aria-expanded={showFilters}>
                <FunnelIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div id="search-filters" className="filters-panel">
            <div className="filters-header">
              <h3>Filters</h3>
              <button type="button" onClick={() => setShowFilters(false)} aria-label="Close filters">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="filters-grid">
              <div>
                <label>Type</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="product">Products</option>
                  <option value="course">Courses</option>
                  <option value="service">Services</option>
                  <option value="digital">Digital Products</option>
                  <option value="booking">Bookings</option>
                </select>
              </div>
              <div>
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="relevance">Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="search-active-filters" aria-label="Active search filters">
            {filterType !== 'all' && (
              <button type="button" onClick={() => setFilterType('all')}>
                {getTypeLabel(filterType)} <span aria-hidden="true">×</span>
              </button>
            )}
            {sortBy !== 'relevance' && (
              <button type="button" onClick={() => setSortBy('relevance')}>
                {sortBy === 'price-low' ? 'Price: low to high' : sortBy === 'price-high' ? 'Price: high to low' : 'Top rated'} <span aria-hidden="true">×</span>
              </button>
            )}
            <button type="button" className="search-clear-filters" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        {/* Results Count */}
        <div className="results-header" aria-live="polite">
          <p>Found <strong>{visibleResults.length}</strong> results for "{query}"</p>
        </div>

        {/* Results Grid */}
        {visibleResults.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try searching for something else or check your spelling</p>
            <div className="suggestions">
              <p>Popular searches:</p>
              <div className="suggestion-tags">
                <button type="button" onClick={() => runSuggestedSearch('iphone')}>iphone</button>
                <button type="button" onClick={() => runSuggestedSearch('react')}>react</button>
                <button type="button" onClick={() => runSuggestedSearch('logo design')}>logo design</button>
                <button type="button" onClick={() => runSuggestedSearch('course')}>course</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="results-grid">
            {visibleResults.map(result => (
              <Link key={`${result.type}-${result.id}`} to={getDetailUrl(result)} className="result-card">
                <div className="result-image">
                  {getPrimaryMedia(result) ? (
                    <MarketplaceImage source={getPrimaryMedia(result).media_url} alt={result.title} />
                  ) : (
                    <span aria-hidden="true">{getImageIcon(result)}</span>
                  )}
                </div>
                <div className="result-content">
                  <span className={`result-type result-type-${result.type}`}>
                    {getTypeLabel(result.type)}
                  </span>
                  <h3>{result.title}</h3>
                  <p>by {result.seller_name || result.provider_name || result.instructor_name || 'Provider'}</p>
                  <div className="result-footer">
                    <div className="result-rating">
                      <StarIcon className="star-icon" />
                      <span>{result.rating || 0}</span>
                    </div>
                    <span className="result-price">{result.price} MAD</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .search-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .search-header {
          margin-bottom: 2rem;
        }
        .search-form {
          margin-bottom: 1rem;
        }
        .search-input-wrapper {
          position: relative;
          display: flex;
          gap: 0.5rem;
        }
        .search-input-wrapper input {
          flex: 1;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          font-size: 1rem;
          outline: none;
        }
        .search-input-wrapper input:focus {
          border-color: #87CEEB;
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: #9ca3af;
        }
        .filter-toggle {
          padding: 0.875rem 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          cursor: pointer;
        }
        .search-submit {
          min-height: 46px;
          padding: 0.75rem 1rem;
          background: #1a1a1a;
          border: 1px solid #1a1a1a;
          border-radius: 1rem;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }
        .search-submit:hover {
          background: #333;
        }
        .search-submit:focus-visible,
        .filter-toggle:focus-visible,
        .filters-header button:focus-visible,
        .search-active-filters button:focus-visible,
        .suggestion-tags button:focus-visible {
          outline: 3px solid rgba(135, 206, 235, 0.55);
          outline-offset: 2px;
        }
        .filters-panel {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .filters-grid label {
          display: block;
          font-size: 0.75rem;
          margin-bottom: 0.25rem;
          color: #6b7280;
        }
        .filters-grid select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }
        .search-active-filters {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem;
        }
        .search-active-filters button {
          min-height: 32px;
          padding: 0.35rem 0.65rem;
          background: rgba(135, 206, 235, 0.2);
          border: 1px solid rgba(95, 158, 160, 0.28);
          border-radius: 999px;
          color: #1f2937;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .search-active-filters .search-clear-filters {
          background: transparent;
          border-color: transparent;
          color: #4b5563;
        }
        .results-header {
          margin-bottom: 1.5rem;
        }
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .result-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          transition: all 0.3s;
        }
        .result-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .result-image {
          height: 160px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          overflow: hidden;
        }
        .result-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .result-content {
          padding: 1rem;
        }
        .result-type {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .result-type-product { background: #e8f7fc; color: #216275; }
        .result-type-course { background: #eaf7ef; color: #23633b; }
        .result-type-service { background: #f2ecfb; color: #65409b; }
        .result-type-digital { background: #fff2e3; color: #9a550e; }
        .result-type-booking { background: #fcecee; color: #9a3041; }
        .result-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .result-content p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .result-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .result-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #f59e0b;
        }
        .star-icon {
          width: 0.875rem;
          height: 0.875rem;
          fill: #f59e0b;
        }
        .result-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .no-results {
          text-align: center;
          padding: 3rem;
        }
        .no-results-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .no-results h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .no-results p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .suggestions {
          margin-top: 1rem;
        }
        .suggestion-tags {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
        }
        .suggestion-tags button {
          padding: 0.375rem 1rem;
          background: #f3f4f6;
          border: 1px solid transparent;
          border-radius: 2rem;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .suggestion-tags button:hover {
          background: #e5e7eb;
        }
        @media (max-width: 640px) {
          .search-page { padding: 1rem 0; }
          .search-header, .filters-panel { margin-bottom: 1rem; }
          .search-input-wrapper { gap: 0.4rem; }
          .search-submit { padding: 0.75rem; }
          .filter-toggle { min-width: 46px; padding: 0.75rem; }
          .filters-panel { padding: 1rem; border-radius: .75rem; }
          .filters-grid { grid-template-columns: 1fr; }
          .search-active-filters { margin-bottom: 0.75rem; }
          .results-grid { grid-template-columns: 1fr; gap: 1rem; }
          .result-card:hover { transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );
};

export default SearchPage;
