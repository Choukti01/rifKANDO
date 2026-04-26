import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShoppingBagIcon, AcademicCapIcon, WrenchScrewdriverIcon, ComputerDesktopIcon, CalendarIcon } from '@heroicons/react/24/outline';

const SellerTypePage = () => {
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, updateSellerType } = useAuth();

  const sellerTypes = [
    { id: 'product', title: 'Product Seller', icon: ShoppingBagIcon, color: '#3B82F6', description: 'Sell physical products', features: ['Inventory', 'Shipping', 'Orders'] },
    { id: 'course', title: 'Course Instructor', icon: AcademicCapIcon, color: '#10B981', description: 'Create and sell online courses', features: ['Video lessons', 'Students', 'Certificates'] },
    { id: 'service', title: 'Service Provider', icon: WrenchScrewdriverIcon, color: '#8B5CF6', description: 'Offer professional services', features: ['Packages', 'Booking', 'Clients'] },
    { id: 'digital', title: 'Digital Creator', icon: ComputerDesktopIcon, color: '#F59E0B', description: 'Sell digital products', features: ['Files', 'Downloads', 'Licenses'] },
    { id: 'booking', title: 'Booking Professional', icon: CalendarIcon, color: '#EF4444', description: 'Manage appointments', features: ['Schedule', 'Calendar', 'Reminders'] }
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
      // Force navigation after a short delay to ensure state is updated
      setTimeout(() => {
        navigate('/seller/dashboard', { replace: true });
      }, 100);
    }
    setLoading(false);
  };

  return (
    <div className="seller-type-page">
      <div className="container">
        <div className="seller-type-header">
          <h1>How do you want to sell on <span>rifKANDO</span>?</h1>
          <p>Choose your seller type to get a customized dashboard</p>
        </div>
        <div className="seller-type-grid">
          {sellerTypes.map(type => {
            const Icon = type.icon;
            const isSelected = selectedType?.id === type.id;
            return (
              <div key={type.id} onClick={() => setSelectedType(type)} className={`seller-type-card ${isSelected ? 'selected' : ''}`}>
                <div className="seller-type-icon" style={{ backgroundColor: type.color }}><Icon className="w-8 h-8 text-white" /></div>
                <h3>{type.title}</h3>
                <p>{type.description}</p>
                <div className="seller-type-features">{type.features.map((f, i) => <span key={i}>✓ {f}</span>)}</div>
                {isSelected && <div className="seller-type-badge">Selected</div>}
              </div>
            );
          })}
        </div>
        {selectedType && (
          <div className="seller-type-action">
            <button onClick={handleContinue} className="continue-btn" disabled={loading}>
              {loading ? 'Saving...' : `Continue as ${selectedType.title}`}
            </button>
          </div>
        )}
      </div>
      <style>{`
        .seller-type-page { padding: 4rem 0; min-height: calc(100vh - 80px); background: #f9fafb; }
        .seller-type-header { text-align: center; margin-bottom: 3rem; }
        .seller-type-header h1 { font-size: 2rem; }
        .seller-type-header h1 span { color: #87CEEB; }
        .seller-type-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
        .seller-type-card { background: white; border-radius: 1rem; padding: 1.5rem; cursor: pointer; transition: 0.3s; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .seller-type-card:hover { transform: translateY(-4px); }
        .seller-type-card.selected { border-color: #87CEEB; }
        .seller-type-icon { width: 64px; height: 64px; border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
        .seller-type-card h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
        .seller-type-card p { font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem; }
        .seller-type-features { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; color: #10b981; margin-bottom: 1rem; }
        .seller-type-badge { margin-top: 1rem; padding: 0.25rem 0.75rem; background: #87CEEB; border-radius: 9999px; font-size: 0.75rem; text-align: center; }
        .seller-type-action { text-align: center; margin-top: 3rem; }
        .continue-btn { background: #1a1a1a; color: white; padding: 0.875rem 2rem; border: none; border-radius: 9999px; font-size: 1rem; cursor: pointer; }
        .continue-btn:disabled { opacity: 0.6; }
      `}</style>
    </div>
  );
};

export default SellerTypePage;