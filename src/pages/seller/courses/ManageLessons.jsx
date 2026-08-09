import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const ManageLessons = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    order: '',
    is_preview: false
  });

  useEffect(() => {
    let isCurrent = true;

    const loadCourseAndLessons = async () => {
      try {
        const response = await api.get(`/courses/${courseId}`);
        if (!isCurrent) return;

        setCourse(response.data.course);
        setLessons(response.data.course.lessons || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Failed to fetch course:', error);
          toast.error('Failed to load course');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadCourseAndLessons();

    return () => {
      isCurrent = false;
    };
  }, [courseId]);

  const fetchCourseAndLessons = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${courseId}`);
      setCourse(response.data.course);
      setLessons(response.data.course.lessons || []);
    } catch (error) {
      console.error('Failed to fetch course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${courseId}/lessons`, formData);
      toast.success('Lesson added successfully');
      setShowForm(false);
      setFormData({ title: '', description: '', duration: '', order: '', is_preview: false });
      fetchCourseAndLessons();
    } catch {
      toast.error('Failed to add lesson');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm('Delete this lesson?')) {
      try {
        await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
        toast.success('Lesson deleted');
        fetchCourseAndLessons();
      } catch {
        toast.error('Failed to delete lesson');
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="manage-lessons">
      <div className="header">
        <button onClick={() => navigate('/seller/dashboard/courses')} className="back-btn">
          ← Back to Courses
        </button>
        <h2>Manage Lessons: {course?.title}</h2>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <PlusIcon className="w-4 h-4" />
          Add Lesson
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Lesson</h3>
            <form onSubmit={handleAddLesson}>
              <div className="form-group">
                <label>Lesson Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className="form-input"
                    placeholder="1, 2, 3..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={formData.is_preview}
                    onChange={(e) => setFormData({ ...formData, is_preview: e.target.checked })}
                  />
                  Free Preview (students can watch without enrolling)
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">Save Lesson</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="lessons-list">
        <h3>Course Lessons ({lessons.length})</h3>
        {lessons.length === 0 ? (
          <p className="empty-text">No lessons yet. Click "Add Lesson" to get started.</p>
        ) : (
          lessons.map((lesson, index) => (
            <div key={lesson.id} className="lesson-item">
              <div className="lesson-order">{lesson.order || index + 1}</div>
              <div className="lesson-info">
                <h4>{lesson.title}</h4>
                <p>{lesson.description}</p>
                {lesson.is_preview && <span className="preview-badge">Free Preview</span>}
              </div>
              <div className="lesson-duration">{lesson.duration || 0} min</div>
              <button onClick={() => handleDeleteLesson(lesson.id)} className="delete-btn">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <style>{`
        .manage-lessons {
          max-width: 900px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .back-btn {
          background: none;
          border: none;
          color: #87CEEB;
          cursor: pointer;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          width: 500px;
          max-width: 90%;
        }
        .modal h3 {
          margin-bottom: 1rem;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .lessons-list {
          background: white;
          border-radius: 1rem;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .lesson-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .lesson-order {
          width: 32px;
          height: 32px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .lesson-info {
          flex: 1;
        }
        .lesson-info h4 {
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
        .lesson-info p {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .preview-badge {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          background: #87CEEB20;
          color: #87CEEB;
          border-radius: 9999px;
          font-size: 0.7rem;
        }
        .lesson-duration {
          font-size: 0.75rem;
          color: #6b7280;
        }
        .delete-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #ef4444;
        }
        .checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ManageLessons;
