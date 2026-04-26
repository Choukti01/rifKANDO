import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  const categories = [
    {
      title: 'Getting Started',
      icon: '🚀',
      articles: [
        'How to create an account',
        'How to browse products',
        'How to search for items',
        'How to add items to cart'
      ]
    },
    {
      title: 'Buying',
      icon: '🛒',
      articles: [
        'How to place an order',
        'Payment methods accepted',
        'How to track your order',
        'Order cancellation policy'
      ]
    },
    {
      title: 'Selling',
      icon: '💰',
      articles: [
        'How to become a seller',
        'Creating your first listing',
        'Managing your orders',
        'Understanding seller fees'
      ]
    },
    {
      title: 'Payments & Payouts',
      icon: '💳',
      articles: [
        'How do I get paid?',
        'Withdrawal methods',
        'When do I receive payments?',
        'Understanding your earnings'
      ]
    },
    {
      title: 'Account & Security',
      icon: '🔒',
      articles: [
        'How to reset your password',
        'Updating your profile',
        'Account verification',
        'Two-factor authentication'
      ]
    },
    {
      title: 'Disputes & Returns',
      icon: '⚖️',
      articles: [
        'How to request a refund',
        'Return policy',
        'Dispute resolution process',
        'Reporting a problem'
      ]
    }
  ]

  const faqs = [
    { question: 'How do I create an account?', answer: 'Click on "Register" in the top right corner, fill in your details, and verify your email address.' },
    { question: 'What payment methods are accepted?', answer: 'We accept Credit Cards (CMI), Cash on Delivery, and rifKANDO Wallet.' },
    { question: 'How long does shipping take?', answer: 'Shipping within Morocco takes 24-48 hours for major cities, and 3-5 days for remote areas.' },
    { question: 'Can I return an item?', answer: 'Yes, you can return items within 7 days of delivery. The item must be in original condition.' },
    { question: 'How do I become a seller?', answer: 'Click "Become a Seller" on the homepage, choose your seller type, and complete your profile.' },
    { question: 'When do I get paid as a seller?', answer: 'Payments are processed after order completion and are available for withdrawal after 14 days.' }
  ]

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="help-center">
      <div className="container">
        <div className="help-header">
          <h1>How can we help you?</h1>
          <p>Search for answers or browse our help articles</p>
          <div className="search-box">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="help-categories">
          <h2>Browse by Category</h2>
          <div className="categories-grid">
            {categories.map(cat => (
              <div key={cat.title} className="category-card">
                <div className="category-icon">{cat.icon}</div>
                <h3>{cat.title}</h3>
                <ul>
                  {cat.articles.slice(0, 3).map(article => (
                    <li key={article}>
                      <a href="#">{article}</a>
                    </li>
                  ))}
                </ul>
                <a href="#" className="view-all">View all →</a>
              </div>
            ))}
          </div>
        </div>

        <div className="help-faqs">
          <h2>Frequently Asked Questions</h2>
          <div className="faqs-list">
            {filteredFaqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span>{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUpIcon className="faq-icon" />
                  ) : (
                    <ChevronDownIcon className="faq-icon" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="help-contact">
          <h3>Still need help?</h3>
          <p>Our support team is ready to assist you</p>
          <Link to="/contact" className="btn btn-primary">Contact Support</Link>
        </div>
      </div>

      <style>{`
        .help-center {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
        .help-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .help-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }
        .help-header p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .search-box {
          max-width: 500px;
          margin: 0 auto;
          position: relative;
        }
        .search-box input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 2rem;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s;
        }
        .search-box input:focus {
          border-color: #87CEEB;
          box-shadow: 0 0 0 3px rgba(135,206,235,0.1);
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: #9ca3af;
        }
        .help-categories {
          margin-bottom: 3rem;
        }
        .help-categories h2 {
          text-align: center;
          font-size: 1.5rem;
          margin-bottom: 2rem;
          color: #1a1a1a;
        }
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .category-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s;
        }
        .category-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .category-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        .category-card h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }
        .category-card ul {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
        }
        .category-card li {
          margin-bottom: 0.5rem;
        }
        .category-card a {
          color: #6b7280;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .category-card a:hover {
          color: #87CEEB;
        }
        .view-all {
          color: #87CEEB !important;
          font-weight: 500;
          font-size: 0.875rem;
        }
        .help-faqs {
          max-width: 800px;
          margin: 0 auto 3rem;
        }
        .help-faqs h2 {
          text-align: center;
          font-size: 1.5rem;
          margin-bottom: 2rem;
          color: #1a1a1a;
        }
        .faqs-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .faq-item {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .faq-question {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          background: white;
          border: none;
          cursor: pointer;
          font-weight: 500;
          text-align: left;
          font-size: 1rem;
          color: #1a1a1a;
        }
        .faq-question:hover {
          background: #f9fafb;
        }
        .faq-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #6b7280;
        }
        .faq-answer {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          line-height: 1.5;
        }
        .help-contact {
          text-align: center;
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .help-contact h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }
        .help-contact p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  )
}

export default HelpCenter