import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const VerificationUpload = () => {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('national_id');
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/seller/verification-status');
      setVerificationStatus(res.data.verification);
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    setUploading(true);
    try {
      await api.post('/seller/upload-verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded. Admin will review it.');
      fetchStatus();
      setFile(null);
      document.getElementById('fileInput').value = '';
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    if (!verificationStatus) return null;
    switch (verificationStatus.status) {
      case 'pending': return <span className="badge pending">Pending Review</span>;
      case 'approved': return <span className="badge approved">✅ Verified Seller</span>;
      case 'rejected': return <span className="badge rejected">❌ Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="verification-upload">
      <h2>Seller Verification</h2>
      <p>Upload a clear photo of your National ID card or Passport to get verified.</p>
      
      {verificationStatus && (
        <div className="status-card">
          <h3>Current Status: {getStatusBadge()}</h3>
          {verificationStatus.status === 'rejected' && (
            <p className="rejected-note">Your document was rejected. Please upload a valid, clear image.</p>
          )}
          {verificationStatus.status === 'approved' && (
            <p>Your account is now verified. The blue badge will appear on your products and profile.</p>
          )}
        </div>
      )}
      
      {(!verificationStatus || verificationStatus.status !== 'approved') && (
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>Document Type</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="form-input">
              <option value="national_id">National ID Card</option>
              <option value="passport">Passport</option>
            </select>
          </div>
          <div className="form-group">
            <label>Upload File (JPEG, PNG, PDF – max 10MB)</label>
            <input type="file" id="fileInput" accept="image/*,application/pdf" onChange={handleFileChange} className="form-input" required />
          </div>
          <button type="submit" disabled={uploading} className="btn-primary">
            {uploading ? 'Uploading...' : 'Submit for Verification'}
          </button>
        </form>
      )}
      
      <style>{`
        .verification-upload { max-width: 600px; margin: 0 auto; background: white; border-radius: 1rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .status-card { background: #f9fafb; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; }
        .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; }
        .badge.pending { background: #fef3c7; color: #92400e; }
        .badge.approved { background: #d1fae5; color: #065f46; }
        .badge.rejected { background: #fee2e2; color: #991b1b; }
        .rejected-note { color: #dc2626; margin-top: 0.5rem; }
        .upload-form { margin-top: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-input { width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
        .btn-primary { background: #1a1a1a; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default VerificationUpload;