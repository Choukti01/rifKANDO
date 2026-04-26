import React from 'react'
import { Link } from 'react-router-dom'

const SellerGuidelines = () => {
  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1>Seller Guidelines</h1>
          <p>Everything you need to know about selling on rifKANDO</p>
        </div>

        <div className="guidelines-content">
          <section className="guideline-section">
            <h2>1. Getting Started</h2>
            <p>To become a seller on rifKANDO, you need to:</p>
            <ul>
              <li>Create a rifKANDO account</li>
              <li>Choose your seller type (Product, Course, Service, Digital, Booking)</li>
              <li>Complete your seller profile with accurate information</li>
              <li>Verify your identity and contact information</li>
            </ul>
          </section>

          <section className="guideline-section">
            <h2>2. Listing Requirements</h2>
            <p>All listings must meet these requirements:</p>
            <ul>
              <li>Clear, accurate titles and descriptions</li>
              <li>High-quality images (minimum 3 images for physical products)</li>
              <li>Accurate pricing in Moroccan Dirham (MAD)</li>
              <li>Detailed specifications and features</li>
              <li>No prohibited or illegal items</li>
            </ul>
          </section>

          <section className="guideline-section">
            <h2>3. Pricing & Fees</h2>
            <p>Our commission structure:</p>
            <ul>
              <li><strong>Physical Products:</strong> 10% commission</li>
              <li><strong>Courses:</strong> 15% commission</li>
              <li><strong>Services:</strong> 12% commission</li>
              <li><strong>Digital Products:</strong> 8% commission</li>
              <li><strong>Bookings:</strong> 5% commission</li>
            </ul>
            <p>Payments are processed and transferred to your rifKANDO wallet. Withdrawals available after 14 days for new sellers.</p>
          </section>

          <section className="guideline-section">
            <h2>4. Order Fulfillment</h2>
            <ul>
              <li>Process orders within 24-48 hours</li>
              <li>Provide tracking information for physical products</li>
              <li>Respond to customer inquiries within 24 hours</li>
              <li>Maintain high quality standards</li>
            </ul>
          </section>

          <section className="guideline-section">
            <h2>5. Prohibited Items</h2>
            <p>The following items are NOT allowed:</p>
            <ul>
              <li>Illegal or counterfeit products</li>
              <li>Weapons or harmful materials</li>
              <li>Adult content</li>
              <li>Hate speech or discriminatory content</li>
              <li>Copyright-infringing materials</li>
            </ul>
          </section>

          <section className="guideline-section">
            <h2>6. Performance Standards</h2>
            <p>Sellers must maintain:</p>
            <ul>
              <li>Minimum 4.0 star rating</li>
              <li>95% order completion rate</li>
              <li>24-hour response time</li>
              <li>Compliance with refund policies</li>
            </ul>
          </section>

          <section className="guideline-section">
            <h2>7. Penalties</h2>
            <p>Violations may result in:</p>
            <ul>
              <li>Listing removal</li>
              <li>Temporary account suspension</li>
              <li>Permanent account termination</li>
              <li>Forfeiture of earnings</li>
            </ul>
          </section>
        </div>

        <div className="guidelines-footer">
          <p>Have questions? <Link to="/contact">Contact our support team</Link></p>
        </div>
      </div>

      <style>{`
        .page-container {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
        .page-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .page-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .page-header p {
          color: #6b7280;
        }
        .guidelines-content {
          max-width: 800px;
          margin: 0 auto;
        }
        .guideline-section {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .guideline-section h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }
        .guideline-section p {
          margin-bottom: 1rem;
          color: #4b5563;
        }
        .guideline-section ul {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
          color: #4b5563;
        }
        .guideline-section li {
          margin-bottom: 0.5rem;
        }
        .guidelines-footer {
          text-align: center;
          margin-top: 2rem;
          padding: 1.5rem;
          background: white;
          border-radius: 1rem;
        }
        .guidelines-footer a {
          color: #87CEEB;
          text-decoration: none;
        }
      `}</style>
    </div>
  )
}

export default SellerGuidelines