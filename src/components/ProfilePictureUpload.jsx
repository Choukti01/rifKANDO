import React, { useState, useRef } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUtils';


const ProfilePictureUpload = ({ currentImage, userName, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, and WEBP images are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    uploadFile(file);
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);

    setUploading(true);
    try {
      const response = await api.post('/users/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        toast.success('Profile picture updated successfully!');
        onUploadSuccess(response.data.profilePicture);
        setPreviewUrl(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload profile picture');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    setUploading(true);
    try {
      const response = await api.delete('/users/profile-picture');
      if (response.data.success) {
        toast.success('Profile picture removed');
        onUploadSuccess('');
      }
    } catch (error) {
      toast.error('Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  const displayImage = previewUrl || (currentImage ? getImageUrl(currentImage) : null);

  return (
    <div className="profile-picture-upload">
      <div className="avatar-container">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={userName || 'Profile'} 
            className="profile-avatar-img"
          />
        ) : (
          <div className="profile-avatar-initial">
            {userName?.charAt(0) || 'U'}
          </div>
        )}
        
        {uploading && (
          <div className="upload-overlay">
            <div className="spinner-small"></div>
          </div>
        )}
      </div>

      <div className="avatar-actions">
        <button 
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <CameraIcon className="upload-icon" />
          <span>{currentImage ? 'Change Photo' : 'Upload Photo'}</span>
        </button>
        
        {currentImage && (
          <button 
            className="remove-btn"
            onClick={handleRemovePicture}
            disabled={uploading}
          >
            <XMarkIcon className="remove-icon" />
            <span>Remove</span>
          </button>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};


// Inject styles
const styles = `
  .profile-picture-upload {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .avatar-container {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto;
  }
  
  .profile-avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #e5e7eb;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  .profile-avatar-initial {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #87CEEB 0%, #5F9EA0 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: bold;
    color: white;
    border: 3px solid #e5e7eb;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .avatar-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 0.5rem;
  }
  
  .upload-btn, .remove-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  
  .upload-btn {
    background: #87CEEB;
    color: #1a1a1a;
  }
  
  .upload-btn:hover {
    background: #6bb5d4;
    transform: translateY(-1px);
  }
  
  .upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .remove-btn {
    background: #f3f4f6;
    color: #dc2626;
  }
  
  .remove-btn:hover {
    background: #fee2e2;
    transform: translateY(-1px);
  }
  
  .remove-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .upload-icon, .remove-icon {
    width: 1rem;
    height: 1rem;
  }
  
  .upload-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .spinner-small {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #87CEEB;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles (run once)
if (typeof document !== 'undefined' && !document.getElementById('profile-upload-styles')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'profile-upload-styles';
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}

export default ProfilePictureUpload;