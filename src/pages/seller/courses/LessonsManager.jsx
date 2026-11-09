import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon, 
  VideoCameraIcon, DocumentIcon,
  ChevronUpIcon, ChevronDownIcon, PlayIcon
} from '@heroicons/react/24/outline';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const LessonsManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const initialDelivery = new URLSearchParams(location.search).get('delivery');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    video_url: '',
    delivery_type: ['youtube', 'zoom', 'telegram'].includes(initialDelivery) ? initialDelivery : 'youtube',
    is_preview: false
  });

  useEffect(() => {
    let isCurrent = true;

    const loadCourseAndLessons = async () => {
      try {
        const response = await api.get(`/courses/${id}`);
        if (!isCurrent) return;

        setCourse(response.data.course);
        setLessons(response.data.course.lessons || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching course:', error);
          toast.error(t('courseLessons.loadFailed'));
          navigate('/seller/dashboard/courses');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadCourseAndLessons();

    return () => {
      isCurrent = false;
    };
  }, [id, navigate, t]);

  const fetchCourseAndLessons = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${id}`);
      setCourse(response.data.course);
      setLessons(response.data.course.lessons || []);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error(t('courseLessons.loadFailed'));
      navigate('/seller/dashboard/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error(t('courseLessons.titleRequired'));
      return;
    }
    setSaving(true);
    try {
      const lessonData = {
        title: formData.title,
        description: formData.description,
        duration: parseInt(formData.duration) || 0,
        video_url: formData.video_url,
        delivery_type: formData.delivery_type,
        is_preview: Boolean(formData.is_preview),
        order: editingLesson ? editingLesson.order : lessons.length
      };

      if (editingLesson) {
        await api.put(`/courses/${id}/lessons/${editingLesson.id}`, lessonData);
        toast.success(t('courseLessons.updated'));
      } else {
        await api.post(`/courses/${id}/lessons`, lessonData);
        toast.success(t('courseLessons.added'));
      }
      setShowModal(false);
      fetchCourseAndLessons();
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error(error.response?.data?.error || t('courseLessons.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm(t('courseLessons.deleteConfirm'))) return;
    try {
      await api.delete(`/courses/${id}/lessons/${lessonId}`);
      toast.success(t('courseLessons.deleted'));
      fetchCourseAndLessons();
    } catch {
      toast.error(t('courseLessons.deleteFailed'));
    }
  };

  const moveLesson = async (lessonId, direction) => {
    const currentIndex = lessons.findIndex(l => l.id === lessonId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= lessons.length) return;

    const newLessons = [...lessons];
    [newLessons[currentIndex], newLessons[newIndex]] = [newLessons[newIndex], newLessons[currentIndex]];
    const updatedLessons = newLessons.map((lesson, idx) => ({ id: lesson.id, order: idx }));
    setLessons(newLessons);
    
    try {
      await api.patch(`/courses/${id}/lessons/reorder`, { lessons: updatedLessons });
      toast.success(t('courseLessons.reordered'));
    } catch {
      toast.error(t('courseLessons.reorderFailed'));
      fetchCourseAndLessons();
    }
  };

  const openModal = (lesson = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        title: lesson.title || '',
        description: lesson.description || '',
        duration: lesson.duration || '',
        video_url: lesson.video_url || '',
        delivery_type: lesson.delivery_type || 'youtube',
        is_preview: lesson.is_preview === 1
      });
    } else {
      setEditingLesson(null);
      setFormData({
        title: '',
        description: '',
        duration: '',
        video_url: '',
        delivery_type: ['youtube', 'zoom', 'telegram'].includes(initialDelivery) ? initialDelivery : 'youtube',
        is_preview: false
      });
    }
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>{t('courseLessons.loading')}</p>
      </div>
    );
  }

  return (
    <div className="lessons-manager">
      <div className="lessons-header">
        <div>
          <h2>{t('courseLessons.curriculum')}</h2>
          <p className="course-title">{course?.title}</p>
          <div className="course-stats">{t('courseLessons.lessonCount', { count: lessons.length })}</div>
        </div>
        <button onClick={() => openModal()} className="btn-add">
          <PlusIcon className="w-4 h-4" /> {t('courseLessons.add')}
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <h3>{t('courseLessons.emptyTitle')}</h3>
          <button onClick={() => openModal()} className="btn-primary">{t('courseLessons.addFirst')}</button>
        </div>
      ) : (
        <div className="lessons-list">
          {lessons.map((lesson, index) => (
            <div key={lesson.id} className="lesson-card">
              <div className="lesson-order">
                <span className="lesson-number">{index + 1}</span>
                <div className="order-arrows">
                  <button onClick={() => moveLesson(lesson.id, 'up')} disabled={index === 0} className="arrow-btn">↑</button>
                  <button onClick={() => moveLesson(lesson.id, 'down')} disabled={index === lessons.length - 1} className="arrow-btn">↓</button>
                </div>
              </div>
              <div className="lesson-icon">
                {lesson.video_url ? <VideoCameraIcon className="w-5 h-5" /> : <DocumentIcon className="w-5 h-5" />}
              </div>
              <div className="lesson-content">
                <h3>{lesson.title}</h3>
                <div className="lesson-meta">
                  {lesson.duration > 0 && <span>{t('courseLessons.minutes', { count: lesson.duration })}</span>}
                  {(lesson.is_preview === true || lesson.is_preview === 1) && <span className="preview-badge">{t('courseLessons.preview')}</span>}
                </div>
                {lesson.video_url && <p>{lesson.delivery_type === 'zoom' ? t('courseLessons.zoomLink') : lesson.delivery_type === 'telegram' ? t('courseLessons.telegramLink') : t('courseLessons.youtubeLink')}</p>}
              </div>
              <div className="lesson-actions">
                <button onClick={() => openModal(lesson)} className="icon-btn edit">✏️</button>
                <button onClick={() => handleDelete(lesson.id)} className="icon-btn delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLesson ? t('courseLessons.edit') : t('courseLessons.addNew')}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('courseLessons.titleLabel')}</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
              </div>
              <div className="form-group">
                <label>{t('courseLessons.descriptionLabel')}</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="form-input" rows="3" />
              </div>
                <div className="form-row">
                <div className="form-group">
                  <label>{t('courseLessons.durationLabel')}</label>
                  <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="form-input" />
                </div>
                {formData.delivery_type === 'youtube' && <div className="form-group checkbox">
                  <label>
                    <input type="checkbox" name="is_preview" checked={formData.is_preview} onChange={handleChange} />
                    <span>{t('courseLessons.preview')}</span>
                  </label>
                </div>}
              </div>

              <div className="form-group">
                <label htmlFor="lesson-delivery-type">{t('courseLessons.deliveryLabel')}</label>
                <select id="lesson-delivery-type" name="delivery_type" value={formData.delivery_type} onChange={handleChange} className="form-input">
                  <option value="youtube">{t('courseLessons.deliveryYoutube')}</option>
                  <option value="zoom">{t('courseLessons.deliveryZoom')}</option>
                  <option value="telegram">{t('courseLessons.deliveryTelegram')}</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="course-content-link">{formData.delivery_type === 'zoom' ? t('courseLessons.zoomLinkLabel') : formData.delivery_type === 'telegram' ? t('courseLessons.telegramLinkLabel') : t('courseLessons.youtubeLinkLabel')}</label>
                <input id="course-content-link" type="url" name="video_url" value={formData.video_url} onChange={handleChange} className="form-input" placeholder={formData.delivery_type === 'zoom' ? 'https://*.zoom.us/j/...' : formData.delivery_type === 'telegram' ? 'https://t.me/...' : 'https://youtu.be/...'} />
                <p>{formData.delivery_type === 'youtube' ? t('courseLessons.youtubeHelp') : t('courseLessons.privateLinkHelp')}</p>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">{t('courseLessons.cancel')}</button>
                <button type="submit" disabled={saving} className="btn-save">
                  {saving ? t('courseLessons.saving') : (editingLesson ? t('courseLessons.update') : t('courseLessons.add'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .lessons-manager { max-width: 1000px; margin: 0 auto; padding: 1rem; }
        .lessons-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .lessons-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
        .course-title { color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem; }
        .course-stats { font-size: 0.75rem; color: #6b7280; }
        .btn-add { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .empty-state { text-align: center; padding: 4rem 2rem; background: white; border-radius: 1rem; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
        .lessons-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .lesson-card { display: flex; align-items: flex-start; padding: 1rem; background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); gap: 1rem; }
        .lesson-order { display: flex; flex-direction: column; align-items: center; min-width: 50px; }
        .lesson-number { font-weight: 600; color: #9ca3af; font-size: 0.875rem; }
        .order-arrows { display: flex; gap: 0.25rem; margin-top: 0.25rem; }
        .arrow-btn { background: none; border: none; cursor: pointer; color: #9ca3af; padding: 2px 4px; border-radius: 0.25rem; }
        .arrow-btn:hover:not(:disabled) { background: #e0f2fe; color: #87CEEB; }
        .arrow-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .lesson-icon { width: 40px; height: 40px; background: #e0f2fe; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: #87CEEB; }
        .lesson-content { flex: 1; }
        .lesson-content h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .lesson-meta { display: flex; gap: 0.75rem; font-size: 0.7rem; color: #6b7280; margin-bottom: 0.5rem; }
        .preview-badge { background: #e0f2fe; color: #0284c7; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
        .video-preview { margin-top: 0.5rem; }
        .preview-video { max-width: 200px; max-height: 120px; border-radius: 0.5rem; }
        .lesson-actions { display: flex; gap: 0.5rem; }
        .icon-btn { padding: 0.375rem; background: none; border: none; cursor: pointer; font-size: 1rem; border-radius: 0.375rem; }
        .icon-btn:hover { background: #f3f4f6; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-container { background: white; border-radius: 1rem; padding: 1.5rem; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .modal-header h3 { font-size: 1.25rem; font-weight: 600; }
        .close-btn { background: none; border: none; cursor: pointer; font-size: 1.25rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
        .form-input { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; }
        .form-input:focus { outline: none; border-color: #87CEEB; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: center; }
        .checkbox label { display: flex; align-items: center; gap: 0.5rem; font-weight: normal; cursor: pointer; }
        .video-upload-area { border: 2px dashed #e5e7eb; border-radius: 0.75rem; padding: 1rem; text-align: center; }
        .video-input { margin-top: 0.5rem; }
        .upload-progress { margin-top: 0.5rem; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
        .progress-bar { height: 100%; background: #87CEEB; transition: width 0.3s; }
        .uploaded-success { margin-top: 0.5rem; padding: 0.5rem; background: #d1fae5; border-radius: 0.5rem; color: #065f46; font-size: 0.875rem; }
        .uploaded-video-preview { margin-top: 0.5rem; max-width: 100%; max-height: 150px; border-radius: 0.5rem; }
        .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
        .btn-cancel { padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-save { padding: 0.5rem 1rem; background: #1a1a1a; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary { background: #1a1a1a; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; }
        @media (max-width: 640px) {
          .lessons-manager { padding: 0; }
          .lessons-header { align-items: stretch; margin-bottom: 1.25rem; }
          .btn-add, .btn-primary { justify-content: center; min-height: 44px; width: 100%; }
          .lesson-card { align-items: flex-start; display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: .75rem; }
          .lesson-order { min-width: 2rem; }
          .order-arrows { flex-direction: column; }
          .lesson-actions { flex-direction: column; }
          .icon-btn, .arrow-btn { min-height: 36px; min-width: 36px; }
          .modal-overlay { align-items: flex-end; padding: .75rem; }
          .modal-container { border-radius: 1rem; max-height: min(88dvh, 46rem); padding: 1.15rem; width: 100%; }
          .form-row { grid-template-columns: 1fr; gap: 0; }
          .modal-actions { flex-direction: column-reverse; }
          .modal-actions button { min-height: 44px; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LessonsManager;
