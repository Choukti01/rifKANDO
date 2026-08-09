import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MediaUploader from '../../../components/MediaUploader';

const EditBooking = () => {
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
    category: 'consultation',
    duration: '60',
    location_type: 'online',
    location: '',
    max_participants: '1',
    image: ''
  });

  useEffect(() => {
    let isCurrent = true;

    const loadBooking = async () => {
      try {
        const response = await api.get(`/bookings/${id}`);
        if (!isCurrent) return;

        const booking = response.data.booking;
        setFormData({
          title: booking.title || '',
          description: booking.description || '',
          price: booking.price || '',
          old_price: booking.old_price || '',
          category: booking.category || 'consultation',
          duration: booking.duration || '60',
          location_type: booking.location_type || 'online',
          location: booking.location || '',
          max_participants: booking.max_participants || '1',
          image: booking.image || ''
        });
        setMedia(booking.media?.map(m => ({ url: m.media_url, type: m.media_type })) || []);
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching booking:', error);
          toast.error('Failed to load booking data');
          navigate('/seller/dashboard/bookings');
        }
      } finally {
        if (isCurrent) setFetching(false);
      }
    };

    void loadBooking();

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
      const bookingData = {
        ...formData,
        price: parseFloat(formData.price),
        old_price: formData.old_price ? parseFloat(formData.old_price) : null,
        duration: parseInt(formData.duration),
        max_participants: parseInt(formData.max_participants),
        media: media.map((m, idx) => ({ ...m, order: idx, isPrimary: idx === 0 }))
      };
      
      await api.put(`/bookings/${id}`, bookingData);
      
      toast.success('Booking service updated successfully!');
      navigate('/seller/dashboard/bookings');
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error(error.response?.data?.error || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="text-center py-16">
        <div className="spinner"></div>
        <p>Loading booking data...</p>
      </div>
    );
  }

  return (
    <div className="edit-booking">
      <h2>Edit Booking Service</h2>
      <form onSubmit={handleSubmit} className="booking-form">
        <div className="form-group">
          <label>Service Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
        </div>

        <div className="form-group">
          <label>Description *</label>
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
            <label>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} className="form-input" required>
              <option value="consultation">Consultation</option>
              <option value="training">Training</option>
              <option value="classes">Classes</option>
              <option value="events">Events</option>
            </select>
          </div>
          <div className="form-group">
            <label>Duration (minutes) *</label>
            <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="form-input" required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Location Type *</label>
            <select name="location_type" value={formData.location_type} onChange={handleChange} className="form-input">
              <option value="online">Online (Video Call)</option>
              <option value="in_person">In Person</option>
            </select>
          </div>
          {formData.location_type === 'in_person' && (
            <div className="form-group">
              <label>Location Address</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="form-input" />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Max Participants</label>
            <input type="number" name="max_participants" value={formData.max_participants} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label>Service Icon</label>
            <input type="text" name="image" value={formData.image} onChange={handleChange} className="form-input" placeholder="📅" />
          </div>
        </div>

        <div className="form-group">
          <label>Service Images & Videos (max 10)</label>
          <MediaUploader onMediaUploaded={setMedia} existingMedia={media} maxFiles={10} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Update Service'}
          </button>
          <button type="button" onClick={() => navigate('/seller/dashboard/bookings')} className="btn btn-outline">Cancel</button>
        </div>
      </form>

      <style>{`
        .edit-booking { max-width: 800px; margin: 0 auto; }
        .edit-booking h2 { font-size: 1.25rem; margin-bottom: 1.5rem; }
        .booking-form { background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
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

export default EditBooking;
