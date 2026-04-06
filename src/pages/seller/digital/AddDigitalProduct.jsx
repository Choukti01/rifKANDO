import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const AddDigitalProduct = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    category: 'template',
    file_type: 'url',
    file_url: '',
    file_size: '',
    download_limit: '',
    image: '💻'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addFile = () => {
    setFiles([...files, { name: '', url: '', size: '' }]);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const updateFile = (index, field, value) => {
    const newFiles = [...files];
    newFiles[index][field] = value;
    setFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let productData = {
        ...formData,
        price: parseFloat(formData.price),
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
        download_limit: parseInt(formData.download_limit) || 0
      };

      // If multiple files, include them
      if (files.length > 0) {
        productData.files = files;
      }
      
      await api.post('/digital', productData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Digital product created successfully!');
      navigate('/seller/dashboard/digital');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-digital-product">
      <h2>Add Digital Product</h2>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>Product Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g., Business Website Template"
            required
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="form-input"
            rows="4"
            placeholder="Describe your product..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price (MAD) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="form-input"
              placeholder="299"
              required
            />
          </div>
          <div className="form-group">
            <label>Original Price (Optional)</label>
            <input
              type="number"
              name="old_price"
              value={formData.old_price}
              onChange={handleChange}
              className="form-input"
              placeholder="499"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="template">Templates</option>
              <option value="ebook">E-books</option>
              <option value="software">Software</option>
              <option value="graphics">Graphics</option>
              <option value="audio">Audio/Music</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div className="form-group">
            <label>Product Icon</label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="form-input"
              placeholder="💻"
            />
          </div>
        </div>

        {/* File Delivery Method */}
        <div className="form-group">
          <label>Delivery Method *</label>
          <select
            name="file_type"
            value={formData.file_type}
            onChange={handleChange}
            className="form-input"
          >
            <option value="url">Direct Download URL</option>
            <option value="google_drive">Google Drive</option>
            <option value="dropbox">Dropbox</option>
            <option value="multiple">Multiple Files</option>
          </select>
        </div>

        {/* Single URL Option */}
        {(formData.file_type === 'url' || formData.file_type === 'google_drive' || formData.file_type === 'dropbox') && (
          <div className="form-row">
            <div className="form-group">
              <label>File URL *</label>
              <input
                type="text"
                name="file_url"
                value={formData.file_url}
                onChange={handleChange}
                className="form-input"
                placeholder={
                  formData.file_type === 'google_drive' 
                    ? 'https://drive.google.com/file/d/...' 
                    : formData.file_type === 'dropbox'
                    ? 'https://www.dropbox.com/s/...'
                    : 'https://example.com/file.zip'
                }
              />
              <small>
                {formData.file_type === 'google_drive' && 'Share link with "Anyone with link can view"'}
                {formData.file_type === 'dropbox' && 'Share link with "Anyone with link can view"'}
                {formData.file_type === 'url' && 'Direct download link to your file'}
              </small>
            </div>
            <div className="form-group">
              <label>File Size (Optional)</label>
              <input
                type="text"
                name="file_size"
                value={formData.file_size}
                onChange={handleChange}
                className="form-input"
                placeholder="5.2 MB"
              />
            </div>
          </div>
        )}

        {/* Multiple Files Option */}
        {formData.file_type === 'multiple' && (
          <div className="multiple-files-section">
            <div className="files-header">
              <label>Product Files</label>
              <button type="button" onClick={addFile} className="add-file-btn">
                <PlusIcon className="w-4 h-4" />
                Add File
              </button>
            </div>
            {files.map((file, index) => (
              <div key={index} className="file-row">
                <input
                  type="text"
                  placeholder="File name"
                  value={file.name}
                  onChange={(e) => updateFile(index, 'name', e.target.value)}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="File URL"
                  value={file.url}
                  onChange={(e) => updateFile(index, 'url', e.target.value)}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="File size"
                  value={file.size}
                  onChange={(e) => updateFile(index, 'size', e.target.value)}
                  className="form-input file-size"
                />
                <button type="button" onClick={() => removeFile(index)} className="remove-file-btn">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {files.length === 0 && (
              <p className="no-files-message">Click "Add File" to add files to this product</p>
            )}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Download Limit (0 = unlimited)</label>
            <input
              type="number"
              name="download_limit"
              value={formData.download_limit}
              onChange={handleChange}
              className="form-input"
              placeholder="0"
            />
            <small>Set a limit on how many times a customer can download</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/seller/dashboard/digital')}
            className="btn btn-outline"
          >
            Cancel
          </button>
        </div>
      </form>

      <style>{`
        .add-digital-product {
          max-width: 800px;
          margin: 0 auto;
        }
        .add-digital-product h2 {
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
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        small {
          display: block;
          font-size: 0.7rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        .multiple-files-section {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .add-file-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: #87CEEB;
          color: #1a1a1a;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.75rem;
        }
        .file-row {
          display: grid;
          grid-template-columns: 2fr 3fr 1fr auto;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          align-items: center;
        }
        .file-size {
          width: 80px;
        }
        .remove-file-btn {
          padding: 0.5rem;
          background: #fee2e2;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          color: #ef4444;
        }
        .no-files-message {
          text-align: center;
          color: #9ca3af;
          font-size: 0.875rem;
          padding: 1rem;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .btn-primary {
          background: #1a1a1a;
          color: white;
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid #e5e7eb;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default AddDigitalProduct;