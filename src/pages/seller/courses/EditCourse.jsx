import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [media, setMedia] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    old_price: '',
    level: 'beginner',
    category: 'programming',
    duration: '',
    what_you_learn: ''
  });

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/courses/${id}`);
      const course = response.data.course;
      setFormData({
        title: course.title || '',
        description: course.description || '',
        price: course.price || '',
        old_price: course.old_price || '',
        level: course.level || 'beginner',
        category: course.category || 'programming',
        duration: course.duration || '',
        what_you_learn: course.what_you_learn ? JSON.parse(course.what_you_learn).join('\n') : ''
      });
      if (course.media && course.media.length) {
        setMedia(course.media.map(m => ({ url: m.media_url, type: m.media_type })));
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course data');
      navigate('/seller/dashboard/courses');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const whatYouLearnArray = formData.what_you_learn
        .split('\n')
        .filter(item => item.trim())
        .map(item => item.trim());
      
      const courseData = {
        ...formData,
        price: parseFloat(formData.price),
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
        duration: parseInt(formData.duration) || 0,
        what_you_learn: JSON.stringify(whatYouLearnArray),
        media: media.map((m, idx) => ({ ...m, order: idx, isPrimary: idx === 0 }))
      };
      
      await api.put(`/courses/${id}`, courseData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Course updated successfully!');
      navigate('/seller/dashboard/courses');
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error(error.response?.data?.error || 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading course data...</p>
      </div>
    );
  }

  return (
    <div className="edit-course">
      <h2>Edit Course</h2>
      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-group">
          <label>Course Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
        </div>

        <div className="form-group">
          <label>Course Description *</label>
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
            <label>Level *</label>
            <select name="level" value={formData.level} onChange={handleChange} className="form-input" required>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} className="form-input" required>
              <option value="programming">Programming</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="business">Business</option>
              <option value="languages">Languages</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Duration (hours) *</label>
            <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="form-input" required />
          </div>
          <div className="form-group">
            <label>What You'll Learn (one per line)</label>
            <textarea name="what_you_learn" value={formData.what_you_learn} onChange={handleChange} className="form-input" rows="4" />
          </div>
        </div>

        <div className="form-group">
          <label>Course Images & Videos (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Update Course'}
          </button>
          <button type="button" onClick={() => navigate('/seller/dashboard/courses')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .edit-course { max-width: 800px; margin: 0 auto; }
        .edit-course h2 { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .course-form { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
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

export default EditCourse;