import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AddService = () => {
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/seller/dashboard/services')
  }

  return (
    <div className="add-service">
      <h2>Add New Service</h2>
      <form onSubmit={handleSubmit} className="service-form">
        <div className="form-group">
          <label>Service Title</label>
          <input type="text" className="form-input" placeholder="Enter service title" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Price (MAD)</label>
            <input type="number" className="form-input" placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Delivery Time</label>
            <input type="text" className="form-input" placeholder="e.g., 3 days" />
          </div>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select className="form-input">
            <option>Consulting</option>
            <option>Design</option>
            <option>Development</option>
            <option>Marketing</option>
          </select>
        </div>
        <div className="form-group">
          <label>Service Description</label>
          <textarea rows="5" className="form-input" placeholder="Describe your service..."></textarea>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Publish Service</button>
          <button type="button" onClick={() => navigate('/seller/dashboard/services')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .add-service {
          max-width: 800px;
          margin: 0 auto;
        }
        .add-service h2 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .service-form {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  )
}

export default AddService