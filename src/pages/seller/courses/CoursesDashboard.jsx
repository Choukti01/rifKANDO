import React from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, EyeIcon, PencilIcon, UserGroupIcon } from '@heroicons/react/24/outline'

const CoursesDashboard = () => {
  const courses = [
    { id: 1, title: 'Complete React.js Course', students: 234, revenue: 87650, rating: 4.8, status: 'published' },
    { id: 2, title: 'Web Development Bootcamp', students: 156, revenue: 62340, rating: 4.6, status: 'draft' },
  ]

  const stats = [
    { label: 'Total Courses', value: '5', change: '+2' },
    { label: 'Total Students', value: '890', change: '+23%' },
    { label: 'Total Revenue', value: '149,990 MAD', change: '+18%' },
    { label: 'Avg Rating', value: '4.8', change: '+0.2' },
  ]

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

      <div className="courses-card">
        <div className="card-header">
          <h3>Your Courses</h3>
          <Link to="/seller/dashboard/courses/add" className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4" />
            New Course
          </Link>
        </div>
        <div className="courses-list">
          {courses.map(course => (
            <div key={course.id} className="course-item">
              <div className="course-info">
                <h4>{course.title}</h4>
                <div className="course-stats">
                  <span><UserGroupIcon className="stat-icon" /> {course.students} students</span>
                  <span>★ {course.rating}</span>
                </div>
              </div>
              <div className="course-meta">
                <div className="course-revenue">{course.revenue} MAD</div>
                <span className={`status-badge ${course.status}`}>{course.status}</span>
                <div className="course-actions">
                  <button className="action-btn"><EyeIcon className="w-4 h-4" /></button>
                  <button className="action-btn"><PencilIcon className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .courses-list {
          padding: 0.5rem;
        }
        .course-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .course-info h4 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .course-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .stat-icon {
          width: 0.875rem;
          height: 0.875rem;
          margin-right: 0.25rem;
        }
        .course-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .course-revenue {
          font-weight: 600;
        }
        .status-badge.draft {
          background: #fef3c7;
          color: #92400e;
        }
        .status-badge.published {
          background: #d1fae5;
          color: #065f46;
        }
      `}</style>
    </div>
  )
}

export default CoursesDashboard