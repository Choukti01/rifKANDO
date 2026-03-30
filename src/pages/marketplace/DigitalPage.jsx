import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { StarIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline'

const DigitalPage = () => {
  const [selectedType, setSelectedType] = useState('all')

  const types = [
    { id: 'all', name: 'All' },
    { id: 'template', name: 'Templates' },
    { id: 'ebook', name: 'E-books' },
    { id: 'software', name: 'Software' },
    { id: 'graphics', name: 'Graphics' },
  ]

  const digitalProducts = [
    { id: 1, title: 'Business Website Template', price: 299, seller: 'DesignMarket', rating: 4.8, downloads: 1234, image: '📄', type: 'template' },
    { id: 2, title: 'Mobile App UI Kit', price: 149, seller: 'UI Studio', rating: 4.7, downloads: 2345, image: '📱', type: 'template' },
    { id: 3, title: 'E-book: Digital Marketing', price: 49, seller: 'Marketing Pro', rating: 4.9, downloads: 3456, image: '📖', type: 'ebook' },
    { id: 4, title: 'Stock Photos Bundle', price: 89, seller: 'PhotoStock', rating: 4.6, downloads: 4567, image: '📸', type: 'graphics' },
  ]

  const filtered = selectedType === 'all' ? digitalProducts : digitalProducts.filter(p => p.type === selectedType)

  return (
    <div className="digital-page">
      <div className="container">
        <div className="digital-header">
          <h1>Digital Products</h1>
          <p>Download templates, e-books, software, and more</p>
        </div>

        <div className="digital-types">
          {types.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`type-btn ${selectedType === type.id ? 'active' : ''}`}
            >
              {type.name}
            </button>
          ))}
        </div>

        <div className="digital-grid">
          {filtered.map(product => (
            <Link key={product.id} to={`/digital/${product.id}`} className="digital-card">
              <div className="digital-image">{product.image}</div>
              <div className="digital-content">
                <h3>{product.title}</h3>
                <p>{product.seller}</p>
                <div className="digital-stats">
                  <div className="digital-rating">
                    <StarIcon className="star-icon" />
                    <span>{product.rating}</span>
                  </div>
                  <div className="digital-downloads">
                    <CloudArrowDownIcon className="download-icon" />
                    <span>{product.downloads.toLocaleString()}</span>
                  </div>
                </div>
                <div className="digital-footer">
                  <span className="digital-price">{product.price} MAD</span>
                  <button className="digital-btn">Download</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .digital-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .digital-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .digital-header h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .digital-header p {
          color: #6b7280;
        }
        .digital-types {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .type-btn {
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .type-btn.active {
          background: #87CEEB;
          border-color: #87CEEB;
          color: #1a1a1a;
        }
        .digital-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .digital-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          transition: all 0.3s;
        }
        .digital-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .digital-image {
          height: 160px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .digital-content {
          padding: 1rem;
        }
        .digital-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .digital-content p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .digital-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .digital-rating, .digital-downloads {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .star-icon {
          width: 0.875rem;
          height: 0.875rem;
          color: #f59e0b;
          fill: #f59e0b;
        }
        .download-icon {
          width: 0.875rem;
          height: 0.875rem;
        }
        .digital-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .digital-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .digital-btn {
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

export default DigitalPage