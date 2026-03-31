import React from 'react'

const TermsPage = () => {
  return (
    <div className="legal-page">
      <div className="container">
        <div className="legal-header">
          <h1>Terms of Service</h1>
          <p>Last updated: March 2026</p>
        </div>

        <div className="legal-content">
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using rifKANDI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>rifKANDI is a multi-service platform that connects buyers and sellers. We provide a marketplace for physical products, digital products, courses, services, and bookings.</p>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <p>You must create an account to use certain features. You are responsible for maintaining the security of your account and for all activities that occur under your account.</p>
          </section>

          <section>
            <h2>4. Buying and Selling</h2>
            <p>When you purchase an item on rifKANDI, you agree to pay the listed price plus any applicable fees. Sellers agree to deliver the item as described and within the stated timeframe.</p>
          </section>

          <section>
            <h2>5. Payments and Fees</h2>
            <p>All payments are processed through our secure payment system. rifKANDI charges a commission on each sale, as outlined in our pricing page.</p>
          </section>

          <section>
            <h2>6. Refund Policy</h2>
            <p>Buyers may request refunds within 7 days of delivery for physical products, and within 14 days for digital products and services. Refunds are subject to review.</p>
          </section>

          <section>
            <h2>7. Prohibited Activities</h2>
            <p>You may not use our platform for illegal activities, to sell prohibited items, or to harass other users. Violations may result in account suspension or termination.</p>
          </section>

          <section>
            <h2>8. Intellectual Property</h2>
            <p>rifKANDI and its content are protected by copyright, trademark, and other laws. You may not copy, modify, or distribute our content without permission.</p>
          </section>

          <section>
            <h2>9. Limitation of Liability</h2>
            <p>rifKANDI is not liable for any damages arising from your use of our platform. We provide the platform "as is" without warranties of any kind.</p>
          </section>

          <section>
            <h2>10. Changes to Terms</h2>
            <p>We may modify these terms at any time. Continued use of the platform constitutes acceptance of the modified terms.</p>
          </section>

          <section>
            <h2>11. Contact Information</h2>
            <p>For questions about these terms, please contact us at legal@rifkandi.com.</p>
          </section>
        </div>
      </div>

      <style>{`
        .legal-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
        .legal-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .legal-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .legal-header p {
          color: #6b7280;
        }
        .legal-content {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .legal-content section {
          margin-bottom: 2rem;
        }
        .legal-content h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }
        .legal-content p {
          color: #4b5563;
          line-height: 1.6;
        }
      `}</style>
    </div>
  )
}

export default TermsPage