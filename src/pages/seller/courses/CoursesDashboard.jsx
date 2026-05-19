import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, XMarkIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { getMyCourses, deleteCourse } from '../../../services/api';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const CoursesDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    avgRating: 0
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getMyCourses();
      const coursesData = response.data.courses || [];
      setCourses(coursesData);
      
      const totalStudents = coursesData.reduce((sum, c) => sum + (c.students_count || 0), 0);
      const totalRevenue = coursesData.reduce((sum, c) => sum + ((c.price || 0) * (c.students_count || 0)), 0);
      const avgRating = coursesData.length > 0 
        ? coursesData.reduce((sum, c) => sum + (c.rating || 0), 0) / coursesData.length 
        : 0;
      
      setStats({
        totalCourses: coursesData.length,
        totalStudents,
        totalRevenue,
        avgRating: avgRating.toFixed(1)
      });
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEndItem = async (id, type) => {
    if (window.confirm('Mark this course as ended? It will no longer appear in marketplace listings.')) {
      try {
        await api.patch(`/${type}/${id}/status`, { status: 'ended' });
        toast.success('Course marked as ended');
        fetchCourses();
      } catch (error) {
        toast.error('Failed to update status');
      }
    }
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(courseId);
        toast.success('Course deleted successfully');
        fetchCourses();
      } catch (error) {
        toast.error('Failed to delete course');
      }
    }
  };

  const handleAddNew = () => {
    navigate('/seller/dashboard/courses/add');
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading courses...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total Courses</div><div className="stat-value">{stats.totalCourses}</div><div className="stat-change">{stats.totalCourses > 0 ? '+ recently' : 'Add your first course'}</div></div>
        <div className="stat-card"><div className="stat-label">Total Students</div><div className="stat-value">{stats.totalStudents}</div><div className="stat-change">Enrolled learners</div></div>
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value">{stats.totalRevenue.toLocaleString()} MAD</div><div className="stat-change">From course sales</div></div>
        <div className="stat-card"><div className="stat-label">Average Rating</div><div className="stat-value">{stats.avgRating} ★</div><div className="stat-change">Student satisfaction</div></div>
      </div>

      <div className="courses-card">
        <div className="card-header">
          <h3>Your Courses</h3>
          <button onClick={handleAddNew} className="btn btn-primary btn-sm"><PlusIcon className="w-4 h-4" />New Course</button>
        </div>

        {courses.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"></div><p>No courses yet</p><button onClick={handleAddNew} className="btn btn-primary">Create Your First Course</button></div>
        ) : (
          <div className="courses-list">
            {courses.map(course => {
              const primaryImage = course.media?.find(m => m.is_primary) || course.media?.[0];
              return (
                <div key={course.id} className="course-item">
                  <div className="course-info">
                    <div className="course-image-placeholder">
                      {primaryImage ? (
                        <img src={`http://localhost:5000${primaryImage.media_url}`} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} />
                      ) : (
                        course.image || ''
                      )}
                    </div>
                    <div className="course-details">
                      <h4>{course.title}</h4>
                      <div className="course-stats">
                        <span><UserGroupIcon className="stat-icon" />{course.students_count || 0} students</span>
                        <span><ChartBarIcon className="stat-icon" />{course.rating || 0} ★</span>
                        <span>{course.price} MAD</span>
                      </div>
                      <div className="course-status">
                        <span className={`status-badge ${course.status === 'published' ? 'published' : 'ended'}`}>
                          {course.status === 'published' ? 'Active' : 'Ended'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="course-actions">
                    <Link to={`/course/${course.id}`} className="action-btn view" title="View Course" target="_blank"><EyeIcon className="w-4 h-4" /></Link>
                    <Link to={`/seller/dashboard/courses/${course.id}/edit`} className="action-btn edit" title="Edit Course"><PencilIcon className="w-4 h-4" /></Link>
                    <Link to={`/seller/dashboard/courses/${course.id}/lessons`} className="action-btn manage" title="Manage Lessons">Manage Lessons</Link>
                    {course.status !== 'ended' && (
                      <button onClick={() => handleEndItem(course.id, 'courses')} className="action-btn end" title="Mark as Ended">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(course.id)} className="action-btn delete" title="Delete Permanently">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { background: white; border-radius: 1rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .stat-label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
        .stat-value { font-size: 1.75rem; font-weight: bold; margin-bottom: 0.25rem; }
        .stat-change { font-size: 0.75rem; color: #10b981; }
        .courses-card { background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e5e7eb; }
        .card-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }
        .empty-state { text-align: center; padding: 3rem; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
        .courses-list { padding: 0.5rem; }
        .course-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; gap: 1rem; }
        .course-info { display: flex; align-items: center; gap: 1rem; flex: 1; }
        .course-image-placeholder { width: 60px; height: 60px; background: #f3f4f6; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; overflow: hidden; }
        .course-details h4 { font-size: 1rem; margin-bottom: 0.5rem; }
        .course-stats { display: flex; gap: 1rem; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; flex-wrap: wrap; }
        .stat-icon { width: 0.875rem; height: 0.875rem; margin-right: 0.25rem; }
        .status-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
        .status-badge.published { background: #d1fae5; color: #065f46; }
        .status-badge.ended { background: #fee2e2; color: #991b1b; }
        .course-actions { display: flex; gap: 0.5rem; align-items: center; }

        /* ========== MODERN ACTION BUTTONS ========== */
        .action-buttons, .product-actions, .course-actions, .service-actions, .digital-actions, .booking-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .action-btn {
          position: relative;
          padding: 0;
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .action-btn svg {
          width: 18px;
          height: 18px;
          transition: transform 0.2s ease;
          position: relative;
          z-index: 2;
        }

        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #f1f5f9;
          border-radius: 12px;
          transform: scale(0.8);
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 1;
        }

        .action-btn:hover::before {
          transform: scale(1);
          opacity: 1;
        }

        .action-btn:hover svg {
          transform: translateY(-2px);
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        /* View button (eye) - Sky Blue */
        .action-btn.view {
          color: #0ea5e9;
        }

        .action-btn.view::before {
          background: #e0f2fe;
        }

        /* Edit button (pencil) - Amber */
        .action-btn.edit {
          color: #f59e0b;
        }

        .action-btn.edit::before {
          background: #fef3c7;
        }

        /* End button (X) - Orange */
        .action-btn.end {
          color: #ea580c;
        }

        .action-btn.end::before {
          background: #ffedd5;
        }

        /* Delete button (trash) - Rose/Red */
        .action-btn.delete {
          color: #e11d48;
        }

        .action-btn.delete::before {
          background: #ffe4e6;
        }

        /* Manage button (for courses/services) - Teal */
        .action-btn.manage {
          color: #0d9488;
          background: #ccfbf1;
          padding: 0.25rem 0.75rem;
          width: auto;
          font-size: 0.75rem;
          font-weight: 500;
          gap: 0.25rem;
        }

        .action-btn.manage svg {
          width: 14px;
          height: 14px;
        }

        .action-btn.manage::before {
          display: none;
        }

        .action-btn.manage:hover {
          background: #99f6e4;
          transform: translateY(-2px);
        }

        /* Tooltip on hover */
        .action-btn {
          position: relative;
        }

        .action-btn::after {
          content: attr(title);
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s;
          pointer-events: none;
          z-index: 10;
        }

        .action-btn:hover::after {
          opacity: 1;
          visibility: visible;
          bottom: -28px;
        }

        .btn-sm { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-primary { background: #1a1a1a; color: white; }
      `}</style>
    </div>
  );
};

export default CoursesDashboard;