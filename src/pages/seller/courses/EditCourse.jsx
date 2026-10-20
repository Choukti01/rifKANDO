import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
    let isCurrent = true;

    const loadCourse = async () => {
      try {
        const response = await api.get(`/courses/${id}`);
        if (!isCurrent) return;

        const course = response.data.course;
        setFormData({
          title: course.title || '',
          description: course.description || '',
          price: course.price ?? '',
          old_price: course.old_price ?? '',
          level: course.level || 'beginner',
          category: course.category || 'programming',
          duration: course.duration ?? '',
          what_you_learn: course.what_you_learn ? JSON.parse(course.what_you_learn).join('\n') : ''
        });
        setMedia(course.media?.map(m => ({ url: m.media_url, type: m.media_type })) || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching course:', error);
          toast.error('Failed to load course data');
          navigate('/seller/dashboard/courses');
        }
      } finally {
        if (isCurrent) setFetching(false);
      }
    };

    void loadCourse();

    return () => {
      isCurrent = false;
    };
  }, [id, navigate]);

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
        
         media: media.map((m, idx) => ({ 
                    ...m, 
                   url: m.url,
                   order: idx, 
                   isPrimary: idx === 0 
                                         }))      };
      
      await api.put(`/courses/${id}`, courseData);
      
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
      <Link to="/seller/dashboard/courses" className="edit-course-back">← Your courses</Link>
      <header className="edit-course-hero"><span>INSTRUCTOR STUDIO</span><h2>Shape your course</h2><p>Update your course details and learning outcomes, then continue building your curriculum.</p><Link to={`/seller/dashboard/courses/${id}/lessons`}>Manage curriculum →</Link></header>
      <form onSubmit={handleSubmit} className="course-form">
        <div className="edit-course-heading"><strong>Course overview</strong><p>Help learners understand what your course offers.</p></div>
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
              <option value="other">Other</option>
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
          <label>Course images (max 10)</label>
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
        .edit-course { max-width: 960px; margin: 0 auto; }
        .edit-course-back { display:inline-block; margin-bottom:1rem; color:#285d80; font-weight:600; }
        .edit-course-hero { padding:clamp(1.3rem,3vw,2.3rem); border:1px solid #d9e8f2; border-radius:1.3rem; background:linear-gradient(120deg,#f7fcff,#e8f6ff); margin-bottom:1.2rem; }
        .edit-course-hero span { font-size:.72rem; font-weight:800; color:#2872a1; letter-spacing:.1em; }
        .edit-course-hero h2 { font-size:clamp(1.5rem,3vw,2rem); margin:.35rem 0; color:#102a40; }
        .edit-course-hero p, .edit-course-heading p { color:#52677a; line-height:1.5; }
        .edit-course-hero a { color:#285d80; font-weight:700; }
        .course-form { background: white; border:1px solid #e4edf3; border-radius: 1rem; padding: clamp(1rem,3vw,1.6rem); }
        .edit-course-heading { margin-bottom:1.5rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .edit-course .btn-primary { background:var(--color-brand-blue); color:#102a40; }
        @media (max-width:640px) { .edit-course .form-row { grid-template-columns:1fr; } .edit-course .form-actions { flex-wrap:wrap; } }
      `}</style>
    </div>
  );
};

export default EditCourse;
