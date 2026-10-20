import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const AddCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState([]);
  const [deliveryType, setDeliveryType] = useState('youtube');
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.old_price && Number(formData.old_price) < Number(formData.price)) {
      toast.error('Original price cannot be lower than the course price');
      return;
    }
    const outcomes = formData.what_you_learn.split('\n').map(item => item.trim()).filter(Boolean);
    if (outcomes.length > 50 || outcomes.some(item => item.length > 300)) {
      toast.error('Use up to 50 learning outcomes, with at most 300 characters each');
      return;
    }
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
      
      const response = await api.post('/courses', courseData);
      
      toast.success('Course created. Add your lessons next.');
      const courseId = response.data.course?.id;
      navigate(courseId ? `/seller/dashboard/courses/${courseId}/lessons?delivery=${deliveryType}` : '/seller/dashboard/courses');
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error(error.response?.data?.error || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-course">
      <Link to="/seller/dashboard/courses" className="course-back">← Your courses</Link>
      <header className="course-hero">
        <div><span className="course-eyebrow">INSTRUCTOR STUDIO</span><h2>Create a learning experience</h2><p>Introduce your course, share what learners will achieve, and build your curriculum.</p></div>
        <div className="course-steps"><span>01 · Course details</span><span>02 · Add lessons</span><span>03 · Welcome learners</span></div>
      </header>
      <form onSubmit={handleSubmit} className="course-form">
        <section className="course-section"><div className="course-section-heading"><span>01</span><div><h3>Course overview</h3><p>Tell learners what makes this course valuable.</p></div></div>
        <div className="form-group">
          <label>Course Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" minLength="2" maxLength="160" placeholder="e.g. Learn portrait photography from the ground up" required />
        </div>

        <div className="form-group">
          <label>Course Description *</label>
          <textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows="5" minLength="10" maxLength="5000" placeholder="Who is this course for, and what will learners be able to do?" required />
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

        </section>
        <section className="course-section"><div className="course-section-heading"><span>02</span><div><h3>Learning outcomes</h3><p>Describe the knowledge and practical skills learners will gain.</p></div></div>
        <div className="form-row">
          <div className="form-group">
            <label>Duration (hours) *</label>
            <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="form-input" min="0" max="10000" step="1" required />
          </div>
          <div className="form-group">
            <label>What You'll Learn (one per line)</label>
            <textarea name="what_you_learn" value={formData.what_you_learn} onChange={handleChange} className="form-input" rows="4" placeholder="Build React apps&#10;Master Hooks" />
          </div>
        </div>

        </section>
        <section className="course-section"><div className="course-section-heading"><span>03</span><div><h3>How will learners attend?</h3><p>Choose the primary lesson format. You can use a different format for each lesson later.</p></div></div>
          <div className="course-delivery-options" role="radiogroup" aria-label="Primary lesson format">
            <button type="button" onClick={() => setDeliveryType('youtube')} className={deliveryType === 'youtube' ? 'delivery-option selected' : 'delivery-option'}><strong>On-demand video</strong><span>Private YouTube links for recorded lessons</span></button>
            <button type="button" onClick={() => setDeliveryType('zoom')} className={deliveryType === 'zoom' ? 'delivery-option selected' : 'delivery-option'}><strong>Live sessions</strong><span>Zoom links for scheduled classes</span></button>
            <button type="button" onClick={() => setDeliveryType('telegram')} className={deliveryType === 'telegram' ? 'delivery-option selected' : 'delivery-option'}><strong>Resource channel</strong><span>Telegram links for files and community access</span></button>
          </div>
          <p className="delivery-note">Access links remain hidden until rifKANDO verifies the learner’s payment.</p>
        </section>
        <section className="course-section"><div className="course-section-heading"><span>04</span><div><h3>Course cover</h3><p>Choose images that represent your course. The first image is the cover.</p></div></div>
        <div className="form-group">
          <label>Course images (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} />
        </div>
        </section>
        <section className="course-section"><div className="course-section-heading"><span>05</span><div><h3>Course price</h3><p>Set your price in Moroccan dirhams.</p></div></div>
          <div className="form-row"><div className="form-group"><label>Price (MAD) *</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="form-input" min="0.01" step="0.01" required /></div><div className="form-group"><label>Original price (optional)</label><input type="number" name="old_price" value={formData.old_price} onChange={handleChange} className="form-input" min="0.01" step="0.01" /></div></div>
        </section>
        <aside className="course-next"><strong>Next: build your curriculum</strong><p>After creating your course, add lessons with YouTube, Zoom, or Telegram access. rifKANDO keeps every access link private until payment verification. Your course becomes visible when created, so add your lessons promptly.</p></aside>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create course and add lessons'}</button>
          <button type="button" onClick={() => navigate('/seller/dashboard/courses')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .add-course { max-width: 960px; margin: 0 auto; }
        .course-back { display:inline-block; margin-bottom:1rem; color:#285d80; font-weight:600; }
        .course-hero { display:flex; justify-content:space-between; align-items:center; gap:1.5rem; padding:clamp(1.3rem,3vw,2.3rem); border:1px solid #d9e8f2; border-radius:1.3rem; background:linear-gradient(120deg,#f7fcff,#e8f6ff); margin-bottom:1.2rem; }
        .course-hero h2 { font-size:clamp(1.5rem,3vw,2rem); margin:.35rem 0; color:#102a40; }
        .course-hero p, .course-section-heading p { color:#52677a; margin:0; line-height:1.5; }
        .course-eyebrow { font-size:.72rem; font-weight:800; color:#2872a1; letter-spacing:.1em; }
        .course-steps { display:grid; gap:.5rem; min-width:170px; color:#285d80; font-size:.8rem; font-weight:600; }
        .course-form { display:grid; gap:1rem; }
        .course-section { background:white; border:1px solid #e4edf3; border-radius:1rem; padding:clamp(1rem,3vw,1.6rem); }
        .course-section-heading { display:flex; align-items:flex-start; gap:.9rem; margin-bottom:1.4rem; }
        .course-section-heading > span { display:grid; place-items:center; width:2.3rem; height:2.3rem; flex:none; border-radius:.7rem; background:#e6f5ff; color:#2675a7; font-weight:700; }
        .course-section-heading h3 { margin:0 0 .25rem; font-size:1.05rem; color:#102a40; }
        .course-next { background:#f1f9fe; color:#25465c; border-radius:1rem; padding:1.2rem; line-height:1.5; }
        .course-next p { margin:.4rem 0 0; }
        .course-delivery-options { display:grid; grid-template-columns:repeat(3,1fr); gap:.75rem; }
        .delivery-option { text-align:left; display:grid; gap:.3rem; min-height:100px; padding:1rem; border:1px solid #dbe8ef; background:#fff; border-radius:.85rem; cursor:pointer; color:#25465c; }
        .delivery-option:hover, .delivery-option.selected { border-color:var(--color-brand-blue); background:#f1f9fe; box-shadow:0 0 0 2px rgba(99,184,243,.18); }
        .delivery-option strong { color:#102a40; }.delivery-option span,.delivery-note { font-size:.8rem; color:#52677a; line-height:1.4; }.delivery-note{margin:.85rem 0 0;}
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .add-course .btn-primary { background:var(--color-brand-blue); color:#102a40; }
        @media (max-width:640px) { .course-hero { flex-direction:column; align-items:flex-start; } .form-row, .course-delivery-options { grid-template-columns:1fr; } .form-actions { flex-wrap:wrap; } }
      `}</style>
    </div>
  );
};

export default AddCourse;
