import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { StarIcon, ClockIcon, ShieldCheckIcon, ArrowPathIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

const ServiceDetailsPage = () => {
  const { id } = useParams()
  const [selectedPackage, setSelectedPackage] = useState('basic')

  const service = {
    id: 1,
    title: 'Professional Logo Design',
    provider: 'Creative Studio',
    rating: 4.9,
    reviews: 234,
    image: '🎨',
    packages: [
      { name: 'basic', title: 'Basic Package', price: 800, deliveryTime: '3 days', revisions: 2 },
      { name: 'standard', title: 'Standard Package', price: 1200, deliveryTime: '5 days', revisions: 5 },
      { name: 'premium', title: 'Premium Package', price: 2000, deliveryTime: '7 days', revisions: 'Unlimited' },
    ]
  }

  const currentPackage = service.packages.find(p => p.name === selectedPackage)

  return (
    <div className="service-details">
      <div className="container">
        <div className="service-grid">
          <div className="service-main">
            <h1>{service.title}</h1>
            <div className="provider-info">
              <div className="provider-avatar">{service.provider[0]}</div>
              <div>
                <h3>{service.provider}</h3>
                <div className="provider-rating">
                  <StarIcon className="star-icon" />
                  <span>{service.rating}</span>
                  <span className="review-count">({service.reviews} reviews)</span>
                </div>
              </div>
            </div>

            <div className="service-description">
              <h3>About This Service</h3>
              <p>Get a unique, professional logo that represents your brand identity.</p>
            </div>

            <div className="service-portfolio">
              <h3>Portfolio</h3>
              <div className="portfolio-grid">
                <div className="portfolio-item">🎨</div>
                <div className="portfolio-item">🎨</div>
                <div className="portfolio-item">🎨</div>
              </div>
            </div>
          </div>

          <div className="service-sidebar">
            <div className="sidebar-card">
              <h3>Select Package</h3>
              {service.packages.map(pkg => (
                <button
                  key={pkg.name}
                  onClick={() => setSelectedPackage(pkg.name)}
                  className={`package-btn ${selectedPackage === pkg.name ? 'active' : ''}`}
                >
                  <div className="package-header">
                    <span className="package-title">{pkg.title}</span>
                    <span className="package-price">{pkg.price} MAD</span>
                  </div>
                  <div className="package-details">
                    {pkg.deliveryTime} delivery • {pkg.revisions} revisions
                  </div>
                </button>
              ))}

              <div className="order-total">
                <span>Total</span>
                <span className="total-price">{currentPackage.price} MAD</span>
              </div>

              <button className="order-btn">Order This Service</button>
              <button className="contact-btn">
                <ChatBubbleLeftRightIcon className="chat-icon" />
                Contact Seller
              </button>

              <div className="guarantee">
                <div className="guarantee-item">
                  <ShieldCheckIcon className="guarantee-icon" />
                  <span>Secure payments</span>
                </div>
                <div className="guarantee-item">
                  <ArrowPathIcon className="guarantee-icon" />
                  <span>Money-back guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .service-details {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .service-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .service-grid {
            grid-template-columns: 1fr;
          }
        }
        .service-main h1 {
          font-size: 1.75rem;
          margin-bottom: 1rem;
        }
        .provider-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 1rem;
          margin-bottom: 2rem;
        }
        .provider-avatar {
          width: 3rem;
          height: 3rem;
          background: #87CEEB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.25rem;
        }
        .provider-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
        }
        .star-icon {
          width: 1rem;
          height: 1rem;
          color: #f59e0b;
          fill: #f59e0b;
        }
        .service-description, .service-portfolio {
          margin-bottom: 2rem;
        }
        .service-description h3, .service-portfolio h3 {
          margin-bottom: 1rem;
        }
        .portfolio-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .portfolio-item {
          background: #f3f4f6;
          border-radius: 0.75rem;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .sidebar-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: sticky;
          top: 100px;
        }
        .sidebar-card h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
        }
        .package-btn {
          width: 100%;
          text-align: left;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          background: white;
          cursor: pointer;
          margin-bottom: 0.75rem;
          transition: all 0.2s;
        }
        .package-btn.active {
          border-color: #87CEEB;
          background: rgba(135,206,235,0.05);
        }
        .package-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }
        .package-title {
          font-weight: 600;
        }
        .package-price {
          font-weight: 700;
        }
        .package-details {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .order-total {
          display: flex;
          justify-content: space-between;
          padding: 1rem 0;
          border-top: 1px solid #e5e7eb;
          margin: 1rem 0;
          font-weight: bold;
        }
        .order-btn, .contact-btn {
          width: 100%;
          padding: 0.75rem;
          border-radius: 2rem;
          cursor: pointer;
          margin-bottom: 0.75rem;
        }
        .order-btn {
          background: #1a1a1a;
          color: white;
          border: none;
        }
        .contact-btn {
          background: white;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .chat-icon {
          width: 1rem;
          height: 1rem;
        }
        .guarantee {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
          margin-top: 0.5rem;
        }
        .guarantee-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .guarantee-icon {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  )
}

export default ServiceDetailsPage