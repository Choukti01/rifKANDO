import React from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, EyeIcon, PencilIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

const ServicesDashboard = () => {
  const requests = [
    { id: 1, client: 'Mohammed A.', service: 'Website Development', date: '2024-03-15', status: 'pending', budget: 2500 },
    { id: 2, client: 'Fatima Z.', service: 'Logo Design', date: '2024-03-14', status: 'in-progress', budget: 800 },
    { id: 3, client: 'Youssef K.', service: 'SEO Consultation', date: '2024-03-13', status: 'completed', budget: 1200 },
  ]

  const stats = [
    { label: 'Active Services', value: '8', change: '+2' },
    { label: 'Pending Requests', value: '12', change: '+3' },
    { label: 'Completed', value: '45', change: '+15%' },
    { label: 'Total Earnings', value: '34,500 MAD', change: '+22%' },
  ]

  const getStatusColor = (status) => {
    const colors = { pending: '#f59e0b', 'in-progress': '#3b82f6', completed: '#10b981' }
    return colors[status] || '#6b7280'
  }

  return (
    <div>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-change">{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="requests-card">
        <div className="card-header">
          <h3>Service Requests</h3>
          <Link to="/seller/dashboard/services/add" className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            Add Service
          </Link>
        </div>
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-item">
              <div className="request-info">
                <h4>{request.service}</h4>
                <p>{request.client}</p>
              </div>
              <div className="request-details">
                <span>{request.date}</span>
                <span className="request-budget">{request.budget} MAD</span>
                <span className="status-badge" style={{ background: `${getStatusColor(request.status)}20`, color: getStatusColor(request.status) }}>
                  {request.status}
                </span>
                <button className="action-btn"><ChatBubbleLeftRightIcon className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .requests-list {
          padding: 0.5rem;
        }
        .request-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .request-info h4 {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .request-info p {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0;
        }
        .request-details {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
        }
        .request-budget {
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}

export default ServicesDashboard