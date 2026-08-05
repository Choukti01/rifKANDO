import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const EditDigitalProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [media, setMedia] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [hasExistingFile, setHasExistingFile] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    category: 'ebooks',
    file_type: 'url',
    file_url: '',
    file_size: '',
    download_limit: '',
    image: '💻'
  });

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/digital/${id}`);
      const product = response.data.product;
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        old_price: product.old_price || '',
        category: product.category || 'ebooks',
        file_type: 'file',
        file_url: '',
        file_size: product.file_size || '',
        download_limit: product.download_limit || '',
        image: product.image || '💻'
      });
      setHasExistingFile(product.file_type === 'file');
      if (product.media && product.media.length) {
        setMedia(product.media.map(m => ({ url: m.media_url, type: m.media_type })));
      }
    } catch (error) {
      console.error('Error fetching digital product:', error);
      toast.error('Failed to load product data');
      navigate('/seller/dashboard/digital');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formDataFile = new FormData();
    formDataFile.append('file', file);
    setUploadingFile(true);
    try {
      const response = await api.post('/upload-digital-file', formDataFile, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFile({
        storageReference: response.data.storageReference,
        name: response.data.fileName,
        size: response.data.fileSize,
        contentType: response.data.contentType
      });
      toast.success('Private digital file uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload the digital file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
        download_limit: parseInt(formData.download_limit) || 0,
        file_url: uploadedFile?.storageReference || undefined,
        file_name: uploadedFile?.name || undefined,
        file_content_type: uploadedFile?.contentType || undefined,
        media: media.map((m, idx) => ({ ...m, order: idx, isPrimary: idx === 0 }))
      };
      
      await api.put(`/digital/${id}`, productData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Digital product updated successfully!');
      navigate('/seller/dashboard/digital');
    } catch (error) {
      console.error('Error updating digital product:', error);
      toast.error(error.response?.data?.error || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading product data...</p>
      </div>
    );
  }

  return (
    <div className="edit-digital">
      <h2>Edit Digital Product</h2>
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
            </select>
          </div>
          <div className="form-group">
            <label>Private digital file</label>
            <input type="file" onChange={handleFileUpload} className="form-input" accept=".pdf,.zip,.epub,.mobi,.mp3,.mp4,.jpg,.jpeg,.png,.webp" />
            {uploadingFile && <p>Uploading and validating file…</p>}
            {!uploadingFile && uploadedFile && <p>New file ready: {uploadedFile.name}</p>}
            {!uploadingFile && !uploadedFile && hasExistingFile && <p>Your existing private file will remain unchanged.</p>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>File Size (e.g., "5 MB")</label>
            <input type="text" name="file_size" value={formData.file_size} onChange={handleChange} className="form-input" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Download Limit</label>
            <input type="number" name="download_limit" value={formData.download_limit} onChange={handleChange} className="form-input" placeholder="0 = unlimited" />
          </div>
          <div className="form-group">
            <label>Icon</label>
            <input type="text" name="image" value={formData.image} onChange={handleChange} className="form-input" placeholder="💻" />
          </div>
        </div>

        <div className="form-group">
          <label>Product Images & Videos (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Update Product'}
          </button>
          <button type="button" onClick={() => navigate('/seller/dashboard/digital')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .edit-digital { max-width: 800px; margin: 0 auto; }
        .edit-digital h2 { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .digital-form { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn-primary { background: #1a1a1a; color: white; padding: 0.625rem 1.25rem; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-outline { background: transparent; border: 1px solid #e5e7eb; padding: 0.625rem 1.25rem; border-radius: 0.5rem; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default EditDigitalProduct;
