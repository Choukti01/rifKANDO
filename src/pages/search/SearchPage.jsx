import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { getProducts, getCourses, getServices, getDigitalProducts, getBookings } from '../../services/api';
import toast from 'react-hot-toast';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // Fetch all data from all categories
  const fetchAllData = async () => {
    setLoading(true);
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
  };

  useEffect(() => {
    if (query) {
      performSearch();
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query, filterType, sortBy]);

  const performSearch = async () => {
    setLoading(true);
    const allData = await fetchAllData();
    
    let filtered = allData.filter(item => 
      item.searchTitle.toLowerCase().includes(query.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    );

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Apply sorting
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setResults(filtered);
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      product: 'bg-blue-100 text-blue-600',
      course: 'bg-green-100 text-green-600',
      service: 'bg-purple-100 text-purple-600',
      digital: 'bg-orange-100 text-orange-600',
      booking: 'bg-red-100 text-red-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="button" onClick={() => setShowFilters(!showFilters)} className="filter-toggle">
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button" onClick={() => setShowFilters(!showFilters)} className="filter-toggle">
                <FunnelIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-header">
              <h3>Filters</h3>
              <button onClick={() => setShowFilters(false)}>
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

        {/* Results Count */}
        <div className="results-header">
          <p>Found <strong>{results.length}</strong> results for "{query}"</p>
        </div>

        {/* Results Grid */}
        {results.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try searching for something else or check your spelling</p>
            <div className="suggestions">
              <p>Popular searches:</p>
              <div className="suggestion-tags">
                <span onClick={() => window.location.href = '/search?q=iphone'}>iphone</span>
                <span onClick={() => window.location.href = '/search?q=react'}>react</span>
                <span onClick={() => window.location.href = '/search?q=logo'}>logo design</span>
                <span onClick={() => window.location.href = '/search?q=course'}>course</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="results-grid">
            {results.map(result => (
              <Link key={`${result.type}-${result.id}`} to={getDetailUrl(result)} className="result-card">
                <div className="result-image">
                  {getImageIcon(result)}
                </div>
                <div className="result-content">
                  <span className={`result-type ${getTypeColor(result.type)}`}>
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
        .suggestion-tags span {
          padding: 0.375rem 1rem;
          background: #f3f4f6;
          border-radius: 2rem;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .suggestion-tags span:hover {
          background: #e5e7eb;
        }
        @media (max-width: 640px) {
          .search-page { padding: 1rem 0; }
          .search-header, .filters-panel { margin-bottom: 1rem; }
          .filters-panel { padding: 1rem; border-radius: .75rem; }
          .filters-grid { grid-template-columns: 1fr; }
          .results-grid { grid-template-columns: 1fr; gap: 1rem; }
          .result-card:hover { transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );
};

export default SearchPage;
