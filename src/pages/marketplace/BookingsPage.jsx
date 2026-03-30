import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { StarIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'

const BookingsPage = () => {
  const [selectedType, setSelectedType] = useState('all')

  const types = [
    { id: 'all', name: 'All' },
    { id: 'consultation', name: 'Consultations' },
    { id: 'training', name: 'Training' },
    { id: 'classes', name: 'Classes' },
  ]

  const bookings = [
    { id: 1, title: 'Business Consultation', provider: 'Ahmed Benjelloun', price: 500, duration: '1 hour', rating: 4.9, image: '💼', type: 'consultation' },
    { id: 2, title: 'Personal Training Session', provider: 'Karim Fitness', price: 300, duration: '45 min', rating: 4.8, image: '💪', type: 'training' },
    { id: 3, title: 'Legal Consultation', provider: 'Law Office', price: 800, duration: '1 hour', rating: 4.7, image: '⚖️', type: 'consultation' },
    { id: 4, title: 'Yoga Class', provider: 'Yoga Studio', price: 150, duration: '1 hour', rating: 4.9, image: '🧘', type: 'classes' },
  ]

  const filtered = selectedType === 'all' ? bookings : bookings.filter(b => b.type === selectedType)

  return (
    <div className="bookings-page">
      <div className="container">
        <div className="bookings-header">
          <h1>Bookings</h1>
          <p>Book appointments, consultations, and classes with professionals</p>
        </div>

        <div className="bookings-types">
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

        <div className="bookings-grid">
          {filtered.map(booking => (
            <Link key={booking.id} to={`/booking/${booking.id}`} className="booking-card">
              <div className="booking-image">{booking.image}</div>
              <div className="booking-content">
                <h3>{booking.title}</h3>
                <p>{booking.provider}</p>
                <div className="booking-details">
                  <div className="booking-rating">
                    <StarIcon className="star-icon" />
                    <span>{booking.rating}</span>
                  </div>
                  <div className="booking-duration">
                    <ClockIcon className="clock-icon" />
                    <span>{booking.duration}</span>
                  </div>
                </div>
                <div className="booking-footer">
                  <span className="booking-price">{booking.price} MAD</span>
                  <button className="booking-btn">Book Now</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .bookings-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .bookings-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .bookings-header h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .bookings-header p {
          color: #6b7280;
        }
        .bookings-types {
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
        .type-btn:hover {
          border-color: #87CEEB;
        }
        .type-btn.active {
          background: #87CEEB;
          border-color: #87CEEB;
          color: #1a1a1a;
        }
        .bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .booking-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          transition: all 0.3s;
        }
        .booking-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .booking-image {
          height: 160px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .booking-content {
          padding: 1rem;
        }
        .booking-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .booking-content p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .booking-details {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .booking-rating, .booking-duration {
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
        .booking-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .booking-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .booking-btn {
          padding: 0.375rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .booking-btn:hover {
          background: #2c2c2c;
        }
      `}</style>
    </div>
  )
}

export default BookingsPage