import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, KeyIcon, BellIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    city: '',
    country: 'Morocco'
  });
  const [stats, setStats] = useState({
    productsCount: 0,
    ordersCount: 0,
    favoritesCount: 0,
    memberSince: ''
  });
  const hasRefreshed = useRef(false); // Prevents infinite loop

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        city: user.city || '',
        country: user.country || 'Morocco'
      });
      fetchUserStats();
    }
  }, [user]);

  // Refresh user data once to get sellerType from server
  useEffect(() => {
    const refreshUser = async () => {
      if (!user || hasRefreshed.current) return;
      try {
        const response = await api.get('/auth/me');
        const freshUser = response.data.data?.user || response.data.user;
        if (freshUser && freshUser.sellerType !== user?.sellerType) {
          updateUser(freshUser);
        }
        hasRefreshed.current = true;
      } catch (err) {
        console.error('Failed to refresh user:', err);
      }
    };
    refreshUser();
  }, [user, updateUser]);

  const fetchUserStats = async () => {
    try {
      try {
        const productsRes = await api.get('/my-products');
        setStats(prev => ({ ...prev, productsCount: productsRes.data.products?.length || 0 }));
      } catch (e) {}
      try {
        const ordersRes = await api.get('/orders');
        setStats(prev => ({ ...prev, ordersCount: ordersRes.data.orders?.length || 0 }));
      } catch (e) {}
      try {
        const favRes = await api.get('/favorites');
        setStats(prev => ({ ...prev, favoritesCount: favRes.data.favorites?.length || 0 }));
      } catch (e) {}
      if (user?.createdAt) {
        setStats(prev => ({ ...prev, memberSince: new Date(user.createdAt).toLocaleDateString() }));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.patch('/users/update-me', formData);
      if (response.data.success) {
        updateUser(response.data.data.user);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpdate = (newImageUrl) => {
    updateUser({ ...user, profilePicture: newImageUrl });
  };

  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: UserIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
  ];

  if (!user) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-grid">
          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar-section">
              <ProfilePictureUpload 
                currentImage={user.profilePicture}
                userName={user.name}
                onUploadSuccess={handleProfilePictureUpdate}
              />
              <h3>{user.name}</h3>
              <p className="profile-email">{user.email}</p>
              <div className="profile-badge">
                {user?.sellerType && user.sellerType !== null && user.sellerType !== '' ? (
                  <span className="badge-seller">
                    {user.sellerType === 'product' ? '🛍️ Product Seller' :
                     user.sellerType === 'course' ? '📚 Course Instructor' :
                     user.sellerType === 'service' ? '🛠️ Service Provider' :
                     user.sellerType === 'digital' ? '💻 Digital Creator' :
                     user.sellerType === 'booking' ? '📅 Booking Pro' : 'Seller'}
                  </span>
                ) : (
                  <button onClick={() => navigate('/choose-seller-type')} className="become-seller-btn">
                    Become a Seller
                  </button>
                )}
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-value">{stats.productsCount}</div>
                <div className="stat-label">Products</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.ordersCount}</div>
                <div className="stat-label">Orders</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.favoritesCount}</div>
                <div className="stat-label">Favorites</div>
              </div>
            </div>

            <div className="profile-tabs">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <Icon className="tab-icon" />
                    {tab.name}
                  </button>
                );
              })}
            </div>

            <div className="profile-info">
              <p className="member-since">Member since {stats.memberSince || '2024'}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="profile-content">
            {activeTab === 'profile' && (
              <div className="profile-card">
                <div className="card-header">
                  <h2>Profile Information</h2>
                  {!isEditing ? (
                    <button className="edit-btn" onClick={() => setIsEditing(true)}>
                      <PencilIcon className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button className="save-btn" onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="profile-form">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" disabled />
                      <small>Email cannot be changed</small>
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-input" />
                    </div>
                    <div className="form-group">
                      <label>Bio</label>
                      <textarea name="bio" value={formData.bio} onChange={handleChange} className="form-input" rows="4" placeholder="Tell us about yourself..." />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-input" placeholder="Casablanca" />
                      </div>
                      <div className="form-group">
                        <label>Country</label>
                        <input type="text" name="country" value={formData.country} onChange={handleChange} className="form-input" placeholder="Morocco" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="profile-info-display">
                    <div className="info-row">
                      <div className="info-label"><UserIcon className="info-icon" />Full Name</div>
                      <div className="info-value">{user.name}</div>
                    </div>
                    <div className="info-row">
                      <div className="info-label"><EnvelopeIcon className="info-icon" />Email</div>
                      <div className="info-value">{user.email}</div>
                    </div>
                    <div className="info-row">
                      <div className="info-label"><PhoneIcon className="info-icon" />Phone</div>
                      <div className="info-value">{user.phone || 'Not provided'}</div>
                    </div>
                    <div className="info-row">
                      <div className="info-label"><MapPinIcon className="info-icon" />Location</div>
                      <div className="info-value">{user.city ? `${user.city}, ${user.country || 'Morocco'}` : 'Not provided'}</div>
                    </div>
                    <div className="info-row bio-row">
                      <div className="info-label">Bio</div>
                      <div className="info-value">{user.bio || 'No bio yet'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="profile-card">
                <h2>Security Settings</h2>
                <form className="profile-form" onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target;
                  const currentPassword = form.currentPassword.value;
                  const newPassword = form.newPassword.value;
                  const confirmPassword = form.confirmPassword.value;
                  if (newPassword !== confirmPassword) {
                    toast.error('New passwords do not match');
                    return;
                  }
                  if (newPassword.length < 6) {
                    toast.error('Password must be at least 6 characters');
                    return;
                  }
                  try {
                    await api.patch('/users/update-password', { currentPassword, newPassword });
                    toast.success('Password updated successfully!');
                    form.reset();
                  } catch (error) {
                    toast.error(error.response?.data?.error || 'Failed to update password');
                  }
                }}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input type="password" name="currentPassword" className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input type="password" name="newPassword" className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" name="confirmPassword" className="form-input" required />
                  </div>
                  <button type="submit" className="btn btn-primary">Update Password</button>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="profile-card">
                <h2>Notification Preferences</h2>
                <div className="notification-settings">
                  <label className="notification-item"><input type="checkbox" defaultChecked /><span>Email Notifications</span></label>
                  <label className="notification-item"><input type="checkbox" defaultChecked /><span>Order Updates</span></label>
                  <label className="notification-item"><input type="checkbox" /><span>Promotional Offers</span></label>
                  <label className="notification-item"><input type="checkbox" defaultChecked /><span>New Messages</span></label>
                  <button className="btn btn-primary mt-4">Save Preferences</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-page { padding: 2rem 0; min-height: calc(100vh - 80px); background: #f9fafb; }
        .profile-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; }
        @media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } }
        .profile-sidebar { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: sticky; top: 100px; }
        .profile-avatar-section { text-align: center; margin-bottom: 1.5rem; }
        .profile-avatar-section h3 { font-size: 1.125rem; margin-bottom: 0.25rem; margin-top: 0.75rem; }
        .profile-email { font-size: 0.75rem; color: #6b7280; margin-bottom: 0.75rem; }
        .profile-badge { display: inline-block; }
        .badge-seller, .badge-buyer { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 2rem; font-size: 0.7rem; font-weight: 500; }
        .badge-seller { background: #d1fae5; color: #065f46; }
        .become-seller-btn { background: #87CEEB; color: #1a1a1a; border: none; padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .become-seller-btn:hover { background: #6bb5d4; transform: translateY(-1px); }
        .badge-buyer { background: #e0e7ff; color: #3730a3; }
        .profile-stats { display: flex; justify-content: space-around; padding: 1rem 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 1.25rem; font-weight: bold; }
        .stat-label { font-size: 0.7rem; color: #6b7280; }
        .profile-tabs { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .tab-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border: none; background: none; border-radius: 0.75rem; cursor: pointer; font-size: 0.875rem; width: 100%; text-align: left; transition: all 0.2s; }
        .tab-btn:hover { background: #f3f4f6; }
        .tab-btn.active { background: #87CEEB; color: #1a1a1a; }
        .tab-icon { width: 1.25rem; height: 1.25rem; }
        .member-since { font-size: 0.7rem; color: #9ca3af; text-align: center; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
        .profile-card { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
        .card-header h2 { font-size: 1.25rem; margin: 0; }
        .edit-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem; }
        .edit-actions { display: flex; gap: 0.5rem; }
        .save-btn, .cancel-btn { padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem; }
        .save-btn { background: #1a1a1a; color: white; border: none; }
        .cancel-btn { background: #e5e7eb; color: #374151; border: none; }
        .profile-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
        .form-group label { font-size: 0.875rem; font-weight: 500; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .form-input:focus { outline: none; border-color: #87CEEB; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .profile-info-display { display: flex; flex-direction: column; gap: 1rem; }
        .info-row { display: flex; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { width: 120px; display: flex; align-items: center; gap: 0.5rem; font-weight: 500; color: #374151; }
        .info-icon { width: 1rem; height: 1rem; color: #87CEEB; }
        .info-value { flex: 1; color: #6b7280; }
        .bio-row { flex-direction: column; }
        .bio-row .info-label { margin-bottom: 0.5rem; }
        .notification-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0; cursor: pointer; }
        .btn-primary { background: #1a1a1a; color: white; padding: 0.625rem 1.25rem; border: none; border-radius: 0.5rem; cursor: pointer; }
        small { font-size: 0.7rem; color: #9ca3af; }
      `}</style>
    </div>
  );
};

export default ProfilePage;