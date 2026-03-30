import React, { useState } from 'react'
import { UserIcon, EnvelopeIcon, PhoneIcon, KeyIcon, BellIcon } from '@heroicons/react/24/outline'

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: UserIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
  ]

  const orders = [
    { id: 'ORD-001', date: '2024-03-20', total: 9500, status: 'delivered' },
    { id: 'ORD-002', date: '2024-03-15', total: 890, status: 'shipped' },
  ]

  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="profile-title">My Profile</h1>

        <div className="profile-grid">
          <div className="profile-sidebar">
            <div className="profile-avatar">
              <div className="avatar-circle">A</div>
              <h3>Ahmed Benjelloun</h3>
              <p>ahmed@example.com</p>
            </div>
            <div className="profile-tabs">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <Icon className="tab-icon" />
                    {tab.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="profile-content">
            {activeTab === 'profile' && (
              <div className="profile-form">
                <h2>Profile Information</h2>
                <div className="form-field">
                  <label>Full Name</label>
                  <input type="text" defaultValue="Ahmed Benjelloun" />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" defaultValue="ahmed@example.com" />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input type="tel" defaultValue="0612345678" />
                </div>
                <div className="form-field">
                  <label>Location</label>
                  <input type="text" placeholder="Casablanca, Morocco" />
                </div>
                <button className="save-btn">Save Changes</button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="profile-form">
                <h2>Security Settings</h2>
                <div className="form-field">
                  <label>Current Password</label>
                  <input type="password" />
                </div>
                <div className="form-field">
                  <label>New Password</label>
                  <input type="password" />
                </div>
                <div className="form-field">
                  <label>Confirm New Password</label>
                  <input type="password" />
                </div>
                <button className="save-btn">Update Password</button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="profile-form">
                <h2>Notification Preferences</h2>
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span>Email Notifications</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span>Order Updates</span>
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>Promotional Offers</span>
                </label>
                <button className="save-btn">Save Preferences</button>
              </div>
            )}

            <div className="recent-orders">
              <h3>Recent Orders</h3>
              {orders.map(order => (
                <div key={order.id} className="order-item">
                  <div>
                    <p className="order-id">{order.id}</p>
                    <p className="order-date">{order.date}</p>
                  </div>
                  <div className="order-right">
                    <p className="order-total">{order.total} MAD</p>
                    <p className="order-status">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .profile-title {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 2rem;
        }
        .profile-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
        }
        .profile-sidebar {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: sticky;
          top: 100px;
        }
        .profile-avatar {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .avatar-circle {
          width: 80px;
          height: 80px;
          background: #87CEEB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          margin: 0 auto 1rem;
        }
        .profile-avatar h3 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .profile-avatar p {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .profile-tabs {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: none;
          background: none;
          border-radius: 0.75rem;
          cursor: pointer;
          font-size: 0.875rem;
          width: 100%;
          text-align: left;
        }
        .tab-btn:hover {
          background: #f3f4f6;
        }
        .tab-btn.active {
          background: #87CEEB;
          color: #1a1a1a;
        }
        .tab-icon {
          width: 1.25rem;
          height: 1.25rem;
        }
        .profile-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .profile-form {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .profile-form h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
        }
        .form-field {
          margin-bottom: 1rem;
        }
        .form-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #374151;
        }
        .form-field input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }
        .save-btn {
          padding: 0.625rem 1.5rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0;
          cursor: pointer;
        }
        .recent-orders {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .recent-orders h3 {
          font-size: 1rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .order-id {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .order-date {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .order-right {
          text-align: right;
        }
        .order-total {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .order-status {
          font-size: 0.75rem;
          color: #10b981;
        }
      `}</style>
    </div>
  )
}

export default ProfilePage