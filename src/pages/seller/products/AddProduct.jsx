import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AddProduct = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '', price: '', description: '', category: '', stock: '', images: []
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    // API call will go here
    navigate('/seller/dashboard/products')
  }

  return (
    <div className="add-product">
      <h2>Add New Product</h2>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>Product Title</label>
          <input type="text" className="form-input" placeholder="Enter product title" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Price (MAD)</label>
            <input type="number" className="form-input" placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Stock Quantity</label>
            <input type="number" className="form-input" placeholder="0" />
          </div>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select className="form-input">
            <option>Select category</option>
            <option>Electronics</option>
            <option>Fashion</option>
            <option>Handicrafts</option>
          </select>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows="5" className="form-input" placeholder="Describe your product..."></textarea>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Publish Product</button>
          <button type="button" onClick={() => navigate('/seller/dashboard/products')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .add-product {
          max-width: 800px;
          margin: 0 auto;
        }
        .add-product h2 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .product-form {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
      `}</style>
    </div>
  )
}

export default AddProduct