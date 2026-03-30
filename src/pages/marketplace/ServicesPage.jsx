import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { StarIcon, ClockIcon } from '@heroicons/react/24/outline'

const ServicesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All Services' },
    { id: 'design', name: 'Design & Creative' },
    { id: 'development', name: 'Development & IT' },
    { id: 'consulting', name: 'Consulting' },
  ]

  const services = [
    { id: 1, title: 'Logo Design', provider: 'Creative Studio', price: 800, rating: 4.9, deliveryTime: '3 days', image: '🎨', category: 'design' },
    { id: 2, title: 'Website Development', provider: 'DevPro', price: 2500, rating: 4.8, deliveryTime: '7 days', image: '💻', category: 'development' },
    { id: 3, title: 'Business Consulting', provider: 'BizConsult', price: 1200, rating: 4.8, deliveryTime: '1 day', image: '💼', category: 'consulting' },
  ]

  const filtered = selectedCategory === 'all' ? services : services.filter(s => s.category === selectedCategory)

  return (
    <div className="services-page">
      <div className="container">
        <div className="services-header">
          <h1>Professional Services</h1>
          <p>Hire expert freelancers for your business needs</p>
        </div>

        <div className="services-categories">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="services-grid">
          {filtered.map(service => (
            <Link key={service.id} to={`/service/${service.id}`} className="service-card">
              <div className="service-image">{service.image}</div>
              <div className="service-content">
                <h3>{service.title}</h3>
                <p>{service.provider}</p>
                <div className="service-details">
                  <div className="service-rating">
                    <StarIcon className="star-icon" />
                    <span>{service.rating}</span>
                  </div>
                  <div className="service-delivery">
                    <ClockIcon className="clock-icon" />
                    <span>{service.deliveryTime}</span>
                  </div>
                </div>
                <div className="service-footer">
                  <span className="service-price">From {service.price} MAD</span>
                  <button className="service-btn">Order Now</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .services-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .services-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .services-header h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .services-categories {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .cat-btn {
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
        }
        .cat-btn.active {
          background: #87CEEB;
          border-color: #87CEEB;
          color: #1a1a1a;
        }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .service-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          transition: all 0.3s;
        }
        .service-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .service-image {
          height: 160px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .service-content {
          padding: 1rem;
        }
        .service-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .service-content p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .service-details {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .service-rating, .service-delivery {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .star-icon, .clock-icon {
          width: 0.875rem;
          height: 0.875rem;
        }
        .star-icon {
          color: #f59e0b;
          fill: #f59e0b;
        }
        .service-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .service-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .service-btn {
          padding: 0.375rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

export default ServicesPage