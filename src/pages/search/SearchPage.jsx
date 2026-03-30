import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline'

const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(query)
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [results, setResults] = useState([])

  const allResults = [
    { id: 1, type: 'product', title: 'iPhone 13 Pro', price: 9500, seller: 'TechStore', rating: 4.8, image: '📱' },
    { id: 2, type: 'course', title: 'Complete React.js Course', price: 499, seller: 'Ahmed Alawi', rating: 4.9, image: '📚' },
    { id: 3, type: 'service', title: 'Logo Design Service', price: 800, seller: 'Creative Studio', rating: 4.7, image: '🎨' },
    { id: 4, type: 'digital', title: 'Business Website Template', price: 299, seller: 'DesignMarket', rating: 4.8, image: '📄' },
    { id: 5, type: 'booking', title: 'Business Consultation', price: 500, seller: 'Ahmed Benjelloun', rating: 4.9, image: '💼' }
  ]

  useEffect(() => {
    let filtered = allResults.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || item.seller.toLowerCase().includes(query.toLowerCase()))
    if (filterType !== 'all') filtered = filtered.filter(item => item.type === filterType)
    if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating)
    setResults(filtered)
  }, [query, filterType, sortBy])

  const handleSearch = (e) => { e.preventDefault(); if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery)}` }

  const getTypeColor = (type) => ({ product: 'bg-blue-100 text-blue-600', course: 'bg-green-100 text-green-600', service: 'bg-purple-100 text-purple-600', digital: 'bg-orange-100 text-orange-600', booking: 'bg-red-100 text-red-600' }[type])

  return (
    <div className="search-page"><div className="container">
      <form onSubmit={handleSearch} className="search-form"><div className="search-input-wrapper"><MagnifyingGlassIcon className="search-icon" /><input type="text" placeholder="Search for products, courses, services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /><button type="button" onClick={() => setShowFilters(!showFilters)} className="filter-toggle"><FunnelIcon className="w-5 h-5" /></button></div></form>

      {showFilters && (<div className="filters-panel"><div className="filters-header"><h3>Filters</h3><button onClick={() => setShowFilters(false)}><XMarkIcon className="w-5 h-5" /></button></div><div className="filters-grid"><div><label>Type</label><select value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="all">All Types</option><option value="product">Products</option><option value="course">Courses</option><option value="service">Services</option><option value="digital">Digital</option><option value="booking">Bookings</option></select></div><div><label>Sort By</label><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="relevance">Relevance</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="rating">Top Rated</option></select></div></div></div>)}

      <div className="search-results-header"><p>Found <strong>{results.length}</strong> results for "{query}"</p></div>

      <div className="search-results-grid">{results.map(result => (<Link key={result.id} to={`/${result.type}/${result.id}`} className="search-result-card"><div className="search-result-image">{result.image}</div><div className="search-result-content"><span className={`search-result-type ${getTypeColor(result.type)}`}>{result.type}</span><h3>{result.title}</h3><p>{result.seller}</p><div className="search-result-footer"><div className="flex items-center gap-1"><StarIcon className="w-4 h-4 text-yellow-400 fill-current" /><span>{result.rating}</span></div><span className="search-result-price">{result.price} MAD</span></div></div></Link>))}</div>
    </div><style>{`.search-page { padding: 2rem 0; min-height: calc(100vh - 80px); } .search-form { margin-bottom: 2rem; } .search-input-wrapper { position: relative; display: flex; gap: 0.5rem; } .search-input-wrapper input { flex: 1; padding: 0.875rem 1rem 0.875rem 2.75rem; border: 1px solid #e5e7eb; border-radius: 1rem; font-size: 1rem; } .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); width: 1.25rem; height: 1.25rem; color: #9ca3af; } .filter-toggle { padding: 0.875rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 1rem; cursor: pointer; } .filters-panel { background: white; border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); } .filters-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; } .filters-header h3 { font-size: 1rem; font-weight: 600; } .filters-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; } .filters-grid label { display: block; font-size: 0.75rem; margin-bottom: 0.25rem; color: #6b7280; } .filters-grid select { width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; } .search-results-header { margin-bottom: 1.5rem; } .search-results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; } .search-result-card { background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-decoration: none; transition: all 0.3s ease; } .search-result-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); } .search-result-image { height: 160px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 3rem; } .search-result-content { padding: 1rem; } .search-result-type { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; margin-bottom: 0.5rem; text-transform: capitalize; } .search-result-content h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; color: #1a1a1a; } .search-result-content p { font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; } .search-result-footer { display: flex; justify-content: space-between; align-items: center; } .search-result-price { font-weight: 700; color: #1a1a1a; }`}</style></div>)
}

export default SearchPage