import React from 'react'
import { Link } from 'react-router-dom'
import { CheckIcon, ShoppingBagIcon, AcademicCapIcon, WrenchScrewdriverIcon, ComputerDesktopIcon, CalendarIcon } from '@heroicons/react/24/outline'

const PricingPage = () => {
  const pricingPlans = [
    {
      type: 'product',
      title: 'Product Seller',
      icon: ShoppingBagIcon,
      commission: '10%',
      features: ['Inventory management', 'Shipping tracking', 'Order fulfillment', 'Customer reviews', 'Sales analytics'],
      bestFor: 'Physical products sellers'
    },
    {
      type: 'course',
      title: 'Course Instructor',
      icon: AcademicCapIcon,
      commission: '15%',
      features: ['Video hosting', 'Student management', 'Certificates', 'Course analytics', 'Drip content'],
      bestFor: 'Educators and trainers'
    },
    {
      type: 'service',
      title: 'Service Provider',
      icon: WrenchScrewdriverIcon,
      commission: '12%',
      features: ['Service packages', 'Booking management', 'Client communication', 'Portfolio showcase', 'Reviews system'],
      bestFor: 'Freelancers and consultants'
    },
    {
      type: 'digital',
      title: 'Digital Creator',
      icon: ComputerDesktopIcon,
      commission: '8%',
      features: ['File delivery', 'License management', 'Downloads tracking', 'Preview system', 'Secure delivery'],
      bestFor: 'Digital product creators'
    },
    {
      type: 'booking',
      title: 'Booking Professional',
      icon: CalendarIcon,
      commission: '5%',
      features: ['Schedule management', 'Appointment booking', 'Calendar sync', 'Reminders', 'Availability settings'],
      bestFor: 'Service professionals'
    }
  ]

  return (
    <div className="pricing-page">
      <div className="container">
        <div className="pricing-header">
          <h1>Simple, Transparent Pricing</h1>
          <p>Start selling on rifKANDO with competitive commission rates</p>
        </div>

        <div className="pricing-grid">
          {pricingPlans.map(plan => {
            const Icon = plan.icon
            return (
              <div key={plan.type} className="pricing-card">
                <div className="pricing-card-header">
                  <div className="pricing-icon">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3>{plan.title}</h3>
                  <div className="pricing-commission">
                    <span className="commission-rate">{plan.commission}</span>
                    <span className="commission-label">commission</span>
                  </div>
                  <p className="pricing-bestfor">{plan.bestFor}</p>
                </div>
                <div className="pricing-card-body">
                  <ul>
                    {plan.features.map(feature => (
                      <li key={feature}>
                        <CheckIcon className="check-icon" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pricing-card-footer">
                  <Link to="/choose-seller-type" className="btn btn-primary w-full">
                    Start Selling
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pricing-faq">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>When do I get paid?</h3>
              <p>Payments are processed after order completion and customer confirmation. Funds are available for withdrawal after 14 days for new sellers, and 7 days for established sellers.</p>
            </div>
            <div className="faq-item">
              <h3>Are there any hidden fees?</h3>
              <p>No hidden fees. The commission is the only fee you pay. Payment processing fees are included in the commission.</p>
            </div>
            <div className="faq-item">
              <h3>Can I change my seller type?</h3>
              <p>Yes, you can add multiple seller types from your dashboard settings. Each type has its own commission rate.</p>
            </div>
            <div className="faq-item">
              <h3>What about refunds?</h3>
              <p>When a customer requests a refund, the full amount is returned to them. If the refund is approved, we don't charge commission on that transaction.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pricing-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
        .pricing-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .pricing-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .pricing-header p {
          color: #6b7280;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .pricing-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s;
        }
        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .pricing-card-header {
          padding: 1.5rem;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, rgba(135,206,235,0.05) 0%, #ffffff 100%);
        }
        .pricing-icon {
          width: 56px;
          height: 56px;
          background: #87CEEB;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }
        .pricing-icon svg {
          color: #1a1a1a;
        }
        .pricing-card-header h3 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }
        .pricing-commission {
          margin-bottom: 0.5rem;
        }
        .commission-rate {
          font-size: 2rem;
          font-weight: bold;
          color: #1a1a1a;
        }
        .commission-label {
          font-size: 0.875rem;
          color: #6b7280;
        }
        .pricing-bestfor {
          font-size: 0.875rem;
          color: #87CEEB;
        }
        .pricing-card-body {
          padding: 1.5rem;
        }
        .pricing-card-body ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .pricing-card-body li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: #4b5563;
        }
        .check-icon {
          width: 1rem;
          height: 1rem;
          color: #10b981;
        }
        .pricing-card-footer {
          padding: 1rem 1.5rem 1.5rem;
        }
        .pricing-faq {
          max-width: 900px;
          margin: 0 auto;
        }
        .pricing-faq h2 {
          text-align: center;
          margin-bottom: 2rem;
        }
        .faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 768px) {
          .faq-grid {
            grid-template-columns: 1fr;
          }
        }
        .faq-item {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
        }
        .faq-item h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .faq-item p {
          font-size: 0.875rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  )
}

export default PricingPage