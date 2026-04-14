import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, AcademicCapIcon, WrenchScrewdriverIcon, ComputerDesktopIcon, CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { getProducts, getCourses, getServices, getDigitalProducts, getBookings } from '/src/services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery'; // Add this import

const HomePage = () => {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galleryItem, setGalleryItem] = useState(null); // Add this state
  const [stats, setStats] = useState({
    productsCount: 0,
    coursesCount: 0,
    servicesCount: 0,
    digitalCount: 0,
    bookingsCount: 0
  });

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      
      let products = [];
      let courses = [];
      let services = [];
      let digital = [];
      let bookings = [];
      
      try {
        const productsRes = await getProducts();
        products = productsRes.data.products || [];
      } catch (e) {
        console.log('Products error:', e);
      }
      
      try {
        const coursesRes = await getCourses();
        courses = coursesRes.data.courses || [];
      } catch (e) {
        console.log('Courses error:', e);
      }
      
      try {
        const servicesRes = await getServices();
        services = servicesRes.data.services || [];
      } catch (e) {
        console.log('Services error:', e);
      }
      
      try {
        const digitalRes = await getDigitalProducts();
        digital = digitalRes.data.products || [];
      } catch (e) {
        console.log('Digital error:', e);
      }
      
      try {
        const bookingsRes = await getBookings();
        bookings = bookingsRes.data.bookings || [];
      } catch (e) {
        console.log('Bookings error:', e);
      }

      setStats({
        productsCount: products.length,
        coursesCount: courses.length,
        servicesCount: services.length,
        digitalCount: digital.length,
        bookingsCount: bookings.length
      });

      const allItems = [
        ...products.slice(0, 2).map(item => ({ ...item, type: 'product' })),
        ...courses.slice(0, 2).map(item => ({ ...item, type: 'course' })),
        ...services.slice(0, 2).map(item => ({ ...item, type: 'service' })),
        ...digital.slice(0, 2).map(item => ({ ...item, type: 'digital' })),
        ...bookings.slice(0, 2).map(item => ({ ...item, type: 'booking' }))
      ].slice(0, 8);

      setFeaturedItems(allItems);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'Products', icon: ShoppingBagIcon, path: '/products', color: '#3B82F6', count: stats.productsCount },
    { name: 'Courses', icon: AcademicCapIcon, path: '/courses', color: '#10B981', count: stats.coursesCount },
    { name: 'Services', icon: WrenchScrewdriverIcon, path: '/services', color: '#8B5CF6', count: stats.servicesCount },
    { name: 'Digital', icon: ComputerDesktopIcon, path: '/digital', color: '#F59E0B', count: stats.digitalCount },
    { name: 'Bookings', icon: CalendarIcon, path: '/bookings', color: '#EF4444', count: stats.bookingsCount },
  ];

  const getItemUrl = (item) => {
    switch(item.type) {
      case 'product': return `/product/${item.id}`;
      case 'course': return `/course/${item.id}`;
      case 'service': return `/service/${item.id}`;
      case 'digital': return `/digital/${item.id}`;
      case 'booking': return `/booking/${item.id}`;
      default: return '#';
    }
  };

  // UPDATED: Get the first media image URL or fallback to emoji
  const getItemImage = (item) => {
    const media = item.media;
    if (media && media.length > 0) {
      const primaryMedia = media.find(m => m.is_primary) || media[0];
      return `http://localhost:5000${primaryMedia.media_url}`;
    }
    // Fallback emojis
    const icons = {
      product: '📦',
      course: '📚',
      service: '🛠️',
      digital: '💻',
      booking: '📅'
    };
    return icons[item.type] || '📦';
  };

  // Check if item has media (to enable gallery on click)
  const hasMedia = (item) => {
    return item.media && item.media.length > 0;
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Welcome to <span className="text-primary">rifKANDI</span>
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
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.name} to={cat.path} className="category-card">
                  <div className="category-icon" style={{ backgroundColor: cat.color }}>
                    <Icon className="category-icon-svg" />
                  </div>
                  <h3 className="category-name">{cat.name}</h3>
                  <p className="category-count">{cat.count.toLocaleString()} items</p>
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
            {featuredItems.map(item => {
              const itemImage = getItemImage(item);
              const isImageUrl = typeof itemImage === 'string' && itemImage.startsWith('http');
              const itemHasMedia = hasMedia(item);
              
              return (
                <div key={`${item.type}-${item.id}`} className="card">
                  <div 
                    className="card-image" 
                    onClick={() => itemHasMedia && setGalleryItem(item)}
                    style={{ cursor: itemHasMedia ? 'pointer' : 'default' }}
                  >
                    {isImageUrl ? (
                      <img 
                        src={itemImage} 
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '3rem' }}>{itemImage}</span>
                    )}
                  </div>
                  <div className="card-content">
                    <div className="card-type-badge">
                      {item.type}
                    </div>
                    <h3 className="card-title">{item.title}</h3>
                    <p className="card-seller">
                      {item.seller_name || item.provider_name || item.instructor_name || 'Seller'}
                    </p>
                    <div className="card-price-row">
                      <div>
                        <span className="card-price">{item.price} MAD</span>
                        {item.old_price && (
                          <span className="card-old-price">{item.old_price} MAD</span>
                        )}
                      </div>
                      <div className="card-rating">
                        ★ {item.rating || 0}
                      </div>
                    </div>
                    <Link to={getItemUrl(item)}>
                      <button className="btn btn-primary btn-sm btn-block">View Details</button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{stats.productsCount + stats.digitalCount}</div>
              <div className="stat-label">Products Available</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats.coursesCount}</div>
              <div className="stat-label">Online Courses</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{stats.servicesCount + stats.bookingsCount}</div>
              <div className="stat-label">Services Offered</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Happy Customers</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container text-center">
          <h2 className="cta-title">Ready to start selling?</h2>
          <p className="cta-description">Join thousands of sellers on rifKANDI</p>
          <Link to="/choose-seller-type">
            <button className="cta-button">Become a Seller</button>
          </Link>
        </div>
      </section>

      {/* Gallery Modal */}
      {galleryItem && (
        <MediaGallery
          media={galleryItem.media.map(m => ({ url: `http://localhost:5000${m.media_url}`, type: m.media_type }))}
          onClose={() => setGalleryItem(null)}
        />
      )}

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
        
        .btn-large {
          padding: 0.875rem 2rem;
          font-size: 1rem;
        }
        
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
          height: 180px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-type-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #87CEEB20;
          color: #87CEEB;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          text-transform: capitalize;
        }
        .card-content {
          padding: 1rem;
        }
        .card-title {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .card-seller {
          font-size: 0.7rem;
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
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a1a1a;
        }
        .card-old-price {
          font-size: 0.75rem;
          color: #9ca3af;
          text-decoration: line-through;
          margin-left: 0.5rem;
        }
        .card-rating {
          font-size: 0.75rem;
          color: #f59e0b;
        }
        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
        }
        .btn-block {
          width: 100%;
        }
        
        .stats-section {
          padding: 3rem 0;
          background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%);
          color: white;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          text-align: center;
        }
        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          font-size: 0.875rem;
          color: #9ca3af;
        }
        
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
          border: none;
          border-radius: 2rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cta-button:hover {
          background: #2c2c2c;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default HomePage;