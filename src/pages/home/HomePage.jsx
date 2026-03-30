import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBagIcon, AcademicCapIcon, WrenchScrewdriverIcon, ComputerDesktopIcon, CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

const HomePage = () => {
  const categories = [
    { name: 'Products', icon: ShoppingBagIcon, path: '/products', color: '#3B82F6', count: '10k+' },
    { name: 'Courses', icon: AcademicCapIcon, path: '/courses', color: '#10B981', count: '500+' },
    { name: 'Services', icon: WrenchScrewdriverIcon, path: '/services', color: '#8B5CF6', count: '1k+' },
    { name: 'Digital', icon: ComputerDesktopIcon, path: '/digital', color: '#F59E0B', count: '2k+' },
    { name: 'Bookings', icon: CalendarIcon, path: '/bookings', color: '#EF4444', count: '300+' },
  ]

  const featuredItems = [
    { id: 1, title: 'iPhone 13 Pro', price: 9500, oldPrice: 10500, seller: 'TechStore', rating: 4.8, image: '📱', type: 'product' },
    { id: 2, title: 'Complete React.js Course', price: 499, oldPrice: 999, seller: 'Ahmed Alawi', rating: 4.9, image: '📚', type: 'course' },
    { id: 3, title: 'Logo Design Service', price: 800, seller: 'Creative Studio', rating: 4.7, image: '🎨', type: 'service' },
    { id: 4, title: 'Business Website Template', price: 299, seller: 'DesignMarket', rating: 4.8, image: '📄', type: 'digital' },
  ]

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Welcome to <span className="text-primary">RifKANDI</span>
            </h1>
            <p className="hero-description">
              Morocco's first multi-service platform. Shop products, take courses, hire professionals, all in one place.
            </p>
            <div className="hero-buttons">
              <Link to="/products">
                <button className="btn btn-primary btn-large">Start Shopping</button>
              </Link>
              <Link to="/choose-seller-type">
                <button className="btn btn-outline btn-large">Become a Seller</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">
            Explore <span>Categories</span>
          </h2>
          <div className="categories-grid">
            {categories.map((cat, index) => {
              const Icon = cat.icon
              return (
                <Link key={cat.name} to={cat.path} className="category-card">
                  <div className="category-icon" style={{ backgroundColor: cat.color }}>
                    <Icon className="category-icon-svg" />
                  </div>
                  <h3 className="category-name">{cat.name}</h3>
                  <p className="category-count">{cat.count} items</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="section bg-gray-50">
        <div className="container">
          <div className="featured-header">
            <h2 className="featured-title">Featured Items</h2>
            <Link to="/products" className="view-all-link">
              View All <ArrowRightIcon className="view-all-icon" />
            </Link>
          </div>
          <div className="featured-grid">
            {featuredItems.map(item => (
              <Link key={item.id} to={`/${item.type}/${item.id}`} className="card">
                <div className="card-image">
                  {item.image}
                </div>
                <div className="card-content">
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-seller">{item.seller}</p>
                  <div className="card-price-row">
                    <div>
                      <span className="card-price">{item.price} MAD</span>
                      {item.oldPrice && (
                        <span className="card-old-price">{item.oldPrice} MAD</span>
                      )}
                    </div>
                    <div className="card-rating">
                      ★ {item.rating}
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm btn-block">Add to Cart</button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container text-center">
          <h2 className="cta-title">Ready to start selling?</h2>
          <p className="cta-description">Join thousands of sellers on RifKANDI</p>
          <Link to="/choose-seller-type">
            <button className="btn cta-button">Become a Seller</button>
          </Link>
        </div>
      </section>

      <style>{`
        .home-page {
          min-height: calc(100vh - 80px);
        }
        
        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, rgba(135,206,235,0.08) 0%, #ffffff 100%);
          padding: 5rem 0;
        }
        .hero-content {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }
        .hero-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
          .hero-title {
            font-size: 3.5rem;
          }
        }
        .hero-description {
          font-size: 1.125rem;
          color: #4b5563;
          margin-bottom: 2rem;
        }
        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        /* Large Buttons */
        .btn-large {
          padding: 0.875rem 2rem;
          font-size: 1rem;
        }
        
        /* Categories */
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .categories-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 768px) {
          .categories-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .categories-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        .category-card {
          background: white;
          padding: 1.5rem;
          text-align: center;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          text-decoration: none;
          display: block;
        }
        .category-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .category-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }
        .category-icon-svg {
          width: 32px;
          height: 32px;
          color: white;
        }
        .category-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .category-count {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        /* Featured Section */
        .bg-gray-50 {
          background-color: #f9fafb;
        }
        .featured-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .featured-title {
          font-size: 1.75rem;
          font-weight: 700;
        }
        .view-all-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #87CEEB;
          text-decoration: none;
          transition: gap 0.2s;
        }
        .view-all-link:hover {
          gap: 0.75rem;
        }
        .view-all-icon {
          width: 1rem;
          height: 1rem;
        }
        .featured-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .featured-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .featured-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        /* Card */
        .card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          display: block;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .card-image {
          height: 200px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
        }
        .card-content {
          padding: 1.25rem;
        }
        .card-title {
          font-weight: 600;
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }
        .card-seller {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .card-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .card-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1a1a;
        }
        .card-old-price {
          font-size: 0.875rem;
          color: #9ca3af;
          text-decoration: line-through;
          margin-left: 0.5rem;
        }
        .card-rating {
          font-size: 0.875rem;
          color: #f59e0b;
        }
        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
        .btn-block {
          width: 100%;
        }
        
        /* CTA Section */
        .cta-section {
          background: #87CEEB;
          padding: 4rem 0;
          text-align: center;
        }
        .cta-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }
        .cta-description {
          font-size: 1.125rem;
          margin-bottom: 2rem;
          color: #1a1a1a;
        }
        .cta-button {
          background: #1a1a1a;
          color: white;
          padding: 0.875rem 2rem;
          font-size: 1rem;
        }
        .cta-button:hover {
          background: #2c2c2c;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  )
}

export default HomePage