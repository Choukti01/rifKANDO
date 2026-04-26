import React, { useState } from 'react'
import { EnvelopeIcon, PhoneIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="contact-page">
      <div className="container">
        <div className="contact-header">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you. Send us a message and we'll respond within 24 hours.</p>
        </div>

        <div className="contact-grid">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <div className="info-item">
              <EnvelopeIcon className="info-icon" />
              <div>
                <h3>Email</h3>
                <p>rifKANDO@gmail.com</p>
                <p>sellersRifKANDO@gmail.com</p>
              </div>
            </div>
            <div className="info-item">
              <PhoneIcon className="info-icon" />
              <div>
                <h3>Phone</h3>
                <p>+212 624483286</p>
                <p>Available Mon-Fri, 9am-6pm</p>
              </div>
            </div>
            <div className="info-item">
              <MapPinIcon className="info-icon" />
              <div>
                <h3>Office</h3>
                <p>Nador</p>
                <p>Nador, Morocco</p>
              </div>
            </div>
            <div className="info-item">
              <ClockIcon className="info-icon" />
              <div>
                <h3>Business Hours</h3>
                <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                <p>Saturday: 10:00 AM - 2:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>

          <div className="contact-form">
            <h2>Send us a Message</h2>
            {submitted ? (
              <div className="success-message">
                <p>✓ Message sent successfully! We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    rows="5"
                    className="form-input"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full">Send Message</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .contact-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
          background: #f9fafb;
        }
        .contact-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .contact-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .contact-header p {
          color: #6b7280;
        }
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }
        }
        .contact-info, .contact-form {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .contact-info h2, .contact-form h2 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .info-item {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .info-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: #87CEEB;
        }
        .info-item h3 {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        .info-item p {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }
        .success-message {
          background: #d1fae5;
          color: #065f46;
          padding: 1rem;
          border-radius: 0.75rem;
          text-align: center;
        }
      `}</style>
    </div>
  )
}

export default ContactPage