import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const AddDigitalProduct = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    category: 'ebooks',
    file_size: '',
    download_limit: '',
    image: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataFile = new FormData();
    formDataFile.append('media', file);

    setUploadingFile(true);
    try {
      const response = await api.post('/upload-media', formDataFile, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setUploadedFile({
          url: response.data.url,
          name: file.name,
          size: file.size
        });
        toast.success('File uploaded successfully');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uploadedFile) {
      toast.error('Please upload a digital file');
      return;
    }
    setLoading(true);
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
        download_limit: parseInt(formData.download_limit) || 0,
        file_url: uploadedFile.url,
        file_type: 'file',
        media: media.map((m, idx) => ({ ...m, order: idx, isPrimary: idx === 0 }))
      };
      
      await api.post('/digital', productData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Digital product created successfully!');
      navigate('/seller/dashboard/digital');
    } catch (error) {
      console.error('Error creating digital product:', error);
      toast.error(error.response?.data?.error || 'Failed to create digital product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-digital">
      <h2>Add Digital Product</h2>
      <form onSubmit={handleSubmit} className="digital-form">
        <div className="form-group">
          <label>Product Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows="4" required />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price (MAD) *</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label>Original Price (Optional)</label>
            <input type="number" name="old_price" value={formData.old_price} onChange={handleChange} className="form-input" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} className="form-input" required>
              <option value="ebooks">E-books</option>
              <option value="software">Software</option>
              <option value="templates">Templates</option>
              <option value="music">Music & Audio</option>
              <option value="graphics">Graphics & Design</option>
              <option value="graphics">Others</option>

            </select>
          </div>
          <div className="form-group">
            <label>File Size (e.g., "5 MB")</label>
            <input type="text" name="file_size" value={formData.file_size} onChange={handleChange} className="form-input" placeholder="5 MB" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Download Limit</label>
            <input type="number" name="download_limit" value={formData.download_limit} onChange={handleChange} className="form-input" placeholder="0 = unlimited" />
          </div>
          <div className="form-group">
            <label>Icon (optional)</label>
            <input type="text" name="image" value={formData.image} onChange={handleChange} className="form-input" placeholder="" />
          </div>
        </div>

        {/* Digital File Upload (replaces external URL) */}
        <div className="form-group">
          <label>Upload Digital File * (PDF, ZIP, MP3, EPUB, etc.)</label>
          <input type="file" onChange={handleFileUpload} accept=".pdf,.zip,.mp3,.mp4,.epub,.mobi,.jpg,.png" className="form-input" />
          {uploadingFile && <p>Uploading...</p>}
          {uploadedFile && (
            <div className="uploaded-file">
              ✅ {uploadedFile.name} ({(uploadedFile.size / (1024*1024)).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* Images/Videos Gallery */}
        <div className="form-group">
          <label>Product Images & Videos (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} maxFiles={10} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading || uploadingFile}>{loading ? 'Creating...' : 'Publish Digital Product'}</button>
          <button type="button" onClick={() => navigate('/seller/dashboard/digital')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .add-digital { max-width: 800px; margin: 0 auto; }
        .add-digital h2 { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .digital-form { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .uploaded-file { margin-top: 0.5rem; padding: 0.5rem; background: #d1fae5; border-radius: 0.5rem; font-size: 0.875rem; color: #065f46; }
        .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn-primary { background: #1a1a1a; color: white; padding: 0.625rem 1.25rem; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-outline { background: transparent; border: 1px solid #e5e7eb; padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default AddDigitalProduct;