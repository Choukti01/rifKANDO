import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StarIcon, ClockIcon, ShieldCheckIcon, ArrowPathIcon, ChatBubbleLeftRightIcon, CheckBadgeIcon, DocumentTextIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { getService, orderService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ServiceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [requirements, setRequirements] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchService();
    }
  }, [id]);

  const fetchService = async () => {
    try {
      setLoading(true);
      const response = await getService(id);
      setService(response.data.service);
    } catch (error) {
      console.error('Error fetching service:', error);
      toast.error('Failed to load service details');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to order this service');
      navigate('/login');
      return;
    }

    if (!requirements.trim()) {
      toast.error('Please describe your requirements');
      return;
    }

    setOrdering(true);
    try {
      const response = await orderService(id, {
        package_name: 'Standard Package',
        requirements: requirements,
        price: service.price
      });
      
      if (response.data.success) {
        toast.success('Order placed successfully! The provider will contact you soon.');
        navigate('/orders');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to place order';
      toast.error(message);
    } finally {
      setOrdering(false);
    }
  };

  const handleContactProvider = () => {
    if (!isAuthenticated) {
      toast.error('Please login to contact the provider');
      navigate('/login');
      return;
    }
    setShowContactModal(true);
  };

  const copyEmailToClipboard = () => {
    if (service?.provider_email) {
      navigator.clipboard.writeText(service.provider_email);
      toast.success('Email copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading service details...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container text-center py-16">
        <p className="text-gray-500">Service not found</p>
        <Link to="/services" className="btn btn-primary mt-4">Back to Services</Link>
      </div>
    );
  }

  return (
    <div className="service-details-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> / <Link to="/services">Services</Link> / <span>{service.title}</span>
        </div>

        <div className="service-details-grid">
          <div className="service-main">
            <h1>{service.title}</h1>
            
            <div className="provider-card">
              <div className="provider-avatar">
                {service.provider_name?.charAt(0) || 'P'}
              </div>
              <div className="provider-info">
                <h3>{service.provider_name || 'Service Provider'}</h3>
                <div className="provider-rating">
                  <StarIcon className="star-icon" />
                  <span>{service.rating || 0}</span>
                  <span className="review-count">({service.reviews_count || 0} reviews)</span>
                </div>
                <div className="provider-stats">
                  <span>{service.orders_count || 0} orders completed</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>About This Service</h2>
              <p>{service.description}</p>
            </div>

            <div className="section">
              <h2>What's Included</h2>
              <div className="included-grid">
                <div className="included-item">
                  <CheckBadgeIcon className="check-icon" />
                  <span>Professional quality work</span>
                </div>
                <div className="included-item">
                  <CheckBadgeIcon className="check-icon" />
                  <span>{service.revisions || 2} revisions included</span>
                </div>
                <div className="included-item">
                  <CheckBadgeIcon className="check-icon" />
                  <span>Delivery in {service.delivery_time || '3 days'}</span>
                </div>
                <div className="included-item">
                  <CheckBadgeIcon className="check-icon" />
                  <span>100% satisfaction guaranteed</span>
                </div>
              </div>
            </div>

            {showOrderForm ? (
              <div className="order-form-section">
                <h2>Place Your Order</h2>
                <div className="order-form">
                  <div className="form-group">
                    <label>Service: {service.title}</label>
                  </div>
                  <div className="form-group">
                    <label>Price: {service.price} MAD</label>
                  </div>
                  <div className="form-group">
                    <label>Your Requirements *</label>
                    <textarea
                      className="requirements-textarea"
                      rows="5"
                      placeholder="Please describe your project requirements in detail..."
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                    />
                    <small>Be as detailed as possible to get the best service</small>
                  </div>
                  <div className="form-buttons">
                    <button className="submit-order-btn" onClick={handleOrder} disabled={ordering}>
                      {ordering ? 'Processing...' : 'Confirm Order'}
                    </button>
                    <button className="cancel-order-btn" onClick={() => setShowOrderForm(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="service-sidebar">
            <div className="price-card">
              <div className="service-icon">{service.image || '🛠️'}</div>
              <div className="price-section">
                <span className="current-price">{service.price} MAD</span>
                {service.old_price && <span className="old-price">{service.old_price} MAD</span>}
              </div>
              
              {!showOrderForm && (
                <button className="order-btn" onClick={() => setShowOrderForm(true)}>Order This Service</button>
              )}
              
              <button className="contact-btn" onClick={handleContactProvider}>
                <ChatBubbleLeftRightIcon className="chat-icon" />
                Contact Provider
              </button>

              <div className="features-list">
                <div className="feature"><ShieldCheckIcon className="feature-icon" /><span>Secure payments</span></div>
                <div className="feature"><ArrowPathIcon className="feature-icon" /><span>Money-back guarantee</span></div>
                <div className="feature"><ClockIcon className="feature-icon" /><span>{service.delivery_time || '3 days'} delivery</span></div>
                <div className="feature"><DocumentTextIcon className="feature-icon" /><span>Detailed requirements</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Contact {service.provider_name}</h3>
              <button className="modal-close" onClick={() => setShowContactModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="contact-info">
                <div className="contact-avatar">{service.provider_name?.charAt(0) || 'P'}</div>
                <div className="contact-details">
                  <p><strong>Provider:</strong> {service.provider_name}</p>
                  <p><strong>Email:</strong> {service.provider_email || 'Not available'}</p>
                  <p><strong>Response time:</strong> Usually within 24 hours</p>
                </div>
              </div>
              <div className="contact-actions">
                <button className="copy-email-btn" onClick={copyEmailToClipboard}><EnvelopeIcon className="w-4 h-4" /> Copy Email</button>
                {service.provider_email && (
                  <a href={`mailto:${service.provider_email}?subject=Inquiry about ${service.title}`} className="send-email-btn">Send Email</a>
                )}
              </div>
              <p className="contact-note">You can also place an order directly and the provider will contact you.</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .service-details-page { padding: 2rem 0; min-height: calc(100vh - 80px); background: #f9fafb; }
        .breadcrumb { margin-bottom: 2rem; font-size: 0.875rem; color: #6b7280; }
        .breadcrumb a { color: #87CEEB; text-decoration: none; }
        .service-details-grid { display: grid; grid-template-columns: 1fr 350px; gap: 2rem; }
        @media (max-width: 768px) { .service-details-grid { grid-template-columns: 1fr; } }
        .service-main { background: white; border-radius: 1rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .service-main h1 { font-size: 1.75rem; margin-bottom: 1.5rem; }
        .provider-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 1rem; margin-bottom: 2rem; }
        .provider-avatar { width: 56px; height: 56px; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; }
        .provider-info h3 { font-size: 1rem; margin-bottom: 0.25rem; }
        .provider-rating { display: flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: #f59e0b; }
        .star-icon { width: 1rem; height: 1rem; fill: #f59e0b; }
        .provider-stats { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
        .section { margin-bottom: 2rem; }
        .section h2 { font-size: 1.25rem; margin-bottom: 1rem; }
        .section p { color: #4b5563; line-height: 1.6; }
        .included-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        @media (max-width: 640px) { .included-grid { grid-template-columns: 1fr; } }
        .included-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #4b5563; }
        .check-icon { width: 1rem; height: 1rem; color: #10b981; }
        .order-form-section { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; }
        .order-form-section h2 { font-size: 1.25rem; margin-bottom: 1rem; }
        .order-form { background: #f9fafb; border-radius: 1rem; padding: 1.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-weight: 500; margin-bottom: 0.5rem; }
        .requirements-textarea { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; font-family: inherit; }
        small { display: block; font-size: 0.7rem; color: #6b7280; margin-top: 0.25rem; }
        .form-buttons { display: flex; gap: 1rem; margin-top: 1rem; }
        .submit-order-btn { padding: 0.625rem 1.5rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; cursor: pointer; }
        .cancel-order-btn { padding: 0.625rem 1.5rem; background: #e5e7eb; color: #374151; border: none; border-radius: 2rem; cursor: pointer; }
        .service-sidebar { position: sticky; top: 100px; }
        .price-card { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .service-icon { font-size: 4rem; margin-bottom: 1rem; }
        .price-section { margin-bottom: 1.5rem; }
        .current-price { font-size: 1.75rem; font-weight: bold; color: #1a1a1a; }
        .old-price { font-size: 0.875rem; color: #9ca3af; text-decoration: line-through; margin-left: 0.5rem; }
        .order-btn { width: 100%; padding: 0.875rem; background: #1a1a1a; color: white; border: none; border-radius: 2rem; font-size: 1rem; font-weight: 600; cursor: pointer; margin-bottom: 0.75rem; }
        .contact-btn { width: 100%; padding: 0.875rem; background: white; border: 1px solid #e5e7eb; border-radius: 2rem; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.5rem; }
        .chat-icon { width: 1rem; height: 1rem; }
        .features-list { border-top: 1px solid #e5e7eb; padding-top: 1rem; }
        .feature { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.75rem; color: #6b7280; }
        .feature-icon { width: 1rem; height: 1rem; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; border-radius: 1rem; width: 450px; max-width: 90%; overflow: hidden; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
        .modal-header h3 { margin: 0; font-size: 1.125rem; }
        .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
        .modal-body { padding: 1.5rem; }
        .contact-info { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
        .contact-avatar { width: 60px; height: 60px; background: #87CEEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; }
        .contact-details p { margin: 0.25rem 0; font-size: 0.875rem; }
        .contact-actions { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .copy-email-btn, .send-email-btn { flex: 1; padding: 0.625rem; border-radius: 0.5rem; font-size: 0.875rem; cursor: pointer; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .copy-email-btn { background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; }
        .send-email-btn { background: #1a1a1a; color: white; border: none; }
        .contact-note { font-size: 0.75rem; color: #6b7280; margin-top: 1rem; text-align: center; }
      `}</style>
    </div>
  );
};

export default ServiceDetailsPage;