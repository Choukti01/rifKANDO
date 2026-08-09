import React, { useState } from 'react';
import useAuth from '../../../hooks/useAuth';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import ProfilePictureUpload from '../../../components/ProfilePictureUpload';

const getSettingsFormData = (user) => ({
  name: user?.name || '',
  phone: user?.phone || '',
  bio: user?.bio || '',
  city: user?.city || '',
  country: user?.country || 'Morocco'
});

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => getSettingsFormData(user));

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfilePictureUpdate = (newImageUrl) => {
    updateUser({ ...user, profilePicture: newImageUrl });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.patch('/users/update-me', formData);
      if (response.data.success) {
        updateUser(response.data.data.user);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h2>Profile Settings</h2>
      
      <div className="settings-section">
        <h3>Profile Picture</h3>
        <ProfilePictureUpload
          currentImage={user?.profilePicture}
          userName={user?.name}
          onUploadSuccess={handleProfilePictureUpdate}
        />
      </div>

      <div className="settings-section">
        <h3>Personal Information</h3>
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} className="form-input" rows="3" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} className="form-input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <style>{`
        .settings-page {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
        }
        .settings-page h2 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .settings-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .settings-section h3 {
          font-size: 1rem;
          margin-bottom: 1rem;
          color: #374151;
        }
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .btn-primary {
          background: #1a1a1a;
          color: white;
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          width: fit-content;
        }
      `}</style>
    </div>
  );
};

export default Settings;
