import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ShoppingBagIcon, AcademicCapIcon, WrenchScrewdriverIcon, ComputerDesktopIcon, CalendarIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const SellerTypePage = () => {
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, updateSellerType } = useAuth();

  const sellerTypes = [
    { id: 'product', title: 'Product Seller', icon: ShoppingBagIcon, description: 'Sell physical products with inventory and order management.', features: ['Inventory', 'Orders', 'Shipping details'] },
    { id: 'course', title: 'Course Instructor', icon: AcademicCapIcon, description: 'Publish structured online courses and lessons.', features: ['Courses', 'Lessons', 'Students'] },
    { id: 'service', title: 'Service Provider', icon: WrenchScrewdriverIcon, description: 'Offer professional services with packages and client requests.', features: ['Services', 'Packages', 'Clients'] },
    { id: 'digital', title: 'Digital Creator', icon: ComputerDesktopIcon, description: 'Sell downloadable digital products from one workspace.', features: ['Files', 'Downloads', 'Requests'] },
    { id: 'booking', title: 'Booking Professional', icon: CalendarIcon, description: 'Offer bookable appointments and manage availability.', features: ['Appointments', 'Availability', 'Clients'] }
  ];

  // If user already has a seller type, redirect to dashboard
  useEffect(() => {
    if (user?.sellerType && user.sellerType !== null && user.sellerType !== '') {
      navigate('/seller/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleContinue = async () => {
    if (!selectedType) return;
    setLoading(true);
    const result = await updateSellerType(selectedType.id);
    if (result.success) {
      navigate('/seller/dashboard', { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="seller-type-page">
      <div className="container">
        <div className="seller-type-header">
          <p className="seller-type-eyebrow">Seller setup · Step 1 of 3</p>
          <h1>Choose your selling workspace</h1>
          <p>Select the primary way you want to sell. Your dashboard will open with the tools that fit this model.</p>
        </div>
        <div className="seller-type-grid" role="radiogroup" aria-label="Choose a seller type">
          {sellerTypes.map(type => {
            const Icon = type.icon;
            const isSelected = selectedType?.id === type.id;
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedType(type)}
                className={`seller-type-card ${isSelected ? 'selected' : ''}`}
              >
                <span className="seller-type-icon"><Icon aria-hidden="true" /></span>
                <span className="seller-type-copy">
                  <span className="seller-type-title-row"><strong>{type.title}</strong>{isSelected && <span className="seller-type-badge"><CheckIcon aria-hidden="true" />Selected</span>}</span>
                  <span className="seller-type-description">{type.description}</span>
                  <span className="seller-type-features">{type.features.map((feature) => <span key={feature}><CheckIcon aria-hidden="true" />{feature}</span>)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="seller-type-action">
          <p>{selectedType ? `${selectedType.title} selected` : 'Select a workspace to continue'}</p>
          <button type="button" onClick={handleContinue} className="continue-btn" disabled={!selectedType || loading}>
            {loading ? 'Saving your workspace...' : selectedType ? `Continue as ${selectedType.title}` : 'Continue'} <ArrowRightIcon aria-hidden="true" />
          </button>
        </div>
      </div>
      <style>{`
        .seller-type-page { padding: 4rem 0; min-height: calc(100vh - 80px); background: linear-gradient(180deg, #f8fcfd 0%, #f9fafb 35%); }
        .seller-type-header { max-width: 700px; text-align: center; margin: 0 auto 2.5rem; }
        .seller-type-eyebrow { margin-bottom: 0.5rem; color: #216275; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
        .seller-type-header h1 { margin-bottom: 0.75rem; font-size: clamp(1.9rem, 4vw, 2.6rem); letter-spacing: -0.04em; }
        .seller-type-header > p:last-child { color: #4b5563; line-height: 1.6; }
        .seller-type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; max-width: 1080px; margin: 0 auto; }
        .seller-type-card { display: flex; width: 100%; min-height: 214px; padding: 1.25rem; gap: 1rem; text-align: left; background: white; border: 1px solid #e5e7eb; border-radius: 1rem; color: #111827; cursor: pointer; transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
        .seller-type-card:hover { transform: translateY(-3px); border-color: #87CEEB; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08); }
        .seller-type-card:focus-visible, .continue-btn:focus-visible { outline: 3px solid rgba(135, 206, 235, 0.6); outline-offset: 3px; }
        .seller-type-card.selected { border-color: #87CEEB; background: #f4fcff; box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.18); }
        .seller-type-icon { flex: 0 0 auto; width: 48px; height: 48px; border-radius: 0.85rem; display: grid; place-items: center; background: #e8f7fc; color: #216275; }
        .seller-type-icon svg { width: 1.5rem; height: 1.5rem; }
        .seller-type-copy { display: block; min-width: 0; }
        .seller-type-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
        .seller-type-title-row strong { font-size: 1.05rem; }
        .seller-type-description { display: block; min-height: 3.1rem; color: #4b5563; font-size: 0.875rem; line-height: 1.5; }
        .seller-type-features { display: grid; gap: 0.35rem; margin-top: 0.85rem; color: #374151; font-size: 0.8rem; }
        .seller-type-features span { display: inline-flex; align-items: center; gap: 0.4rem; }
        .seller-type-features svg { width: 0.9rem; height: 0.9rem; color: #216275; }
        .seller-type-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.22rem 0.45rem; background: #87CEEB; border-radius: 999px; color: #111827; font-size: 0.7rem; font-weight: 800; white-space: nowrap; }
        .seller-type-badge svg { width: 0.75rem; height: 0.75rem; }
        .seller-type-action { display: grid; justify-items: center; gap: 0.85rem; margin-top: 2rem; }
        .seller-type-action p { color: #4b5563; font-size: 0.875rem; }
        .continue-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 48px; min-width: min(100%, 320px); background: #1a1a1a; color: white; padding: 0.875rem 1.25rem; border: none; border-radius: 9999px; font-size: 1rem; font-weight: 700; cursor: pointer; }
        .continue-btn:hover:not(:disabled) { background: #333; }
        .continue-btn svg { width: 1.1rem; height: 1.1rem; }
        .continue-btn:disabled { cursor: not-allowed; opacity: 0.45; }
        @media (max-width: 640px) { .seller-type-page { padding: 2rem 0 2.5rem; } .seller-type-header { text-align: left; margin-bottom: 1.5rem; } .seller-type-grid { grid-template-columns: 1fr; } .seller-type-card { min-height: 0; } .seller-type-description { min-height: 0; } .seller-type-action { position: sticky; bottom: 1rem; padding: 0.75rem; border: 1px solid rgba(229, 231, 235, 0.92); border-radius: 1rem; background: rgba(255,255,255,0.95); box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1); } .seller-type-action p { display: none; } .continue-btn { width: 100%; } }
      `}</style>
    </div>
  );
};

export default SellerTypePage;
