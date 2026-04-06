import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ClockIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { getServices } from '../../services/api';
import toast from 'react-hot-toast';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Services' },
    { id: 'design', name: 'Design & Creative' },
    { id: 'development', name: 'Development & IT' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'consulting', name: 'Consulting' },
    { id: 'writing', name: 'Writing & Translation' },
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await getServices();
      setServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(s => s.category === selectedCategory);

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading services...</p>
      </div>
    );
  }

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
          {filteredServices.length === 0 ? (
            <p className="text-center col-span-full">No services found</p>
          ) : (
            filteredServices.map(service => (
              <Link key={service.id} to={`/service/${service.id}`} className="service-card">
                <div className="service-image">
                  {service.image || '🛠️'}
                </div>
                <div className="service-content">
                  <h3>{service.title}</h3>
                  <p>by {service.provider_name}</p>
                  <div className="service-details">
                    <div className="service-rating">
                      <StarIcon className="star-icon" />
                      <span>{service.rating || 0}</span>
                    </div>
                    <div className="service-delivery">
                      <ClockIcon className="clock-icon" />
                      <span>{service.delivery_time || '3 days'}</span>
                    </div>
                  </div>
                  <div className="service-footer">
                    <span className="service-price">From {service.price} MAD</span>
                    <button className="service-btn">View Details</button>
                  </div>
                </div>
              </Link>
            ))
          )}
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
  );
};

export default ServicesPage;