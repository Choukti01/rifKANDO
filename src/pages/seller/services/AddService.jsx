import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import ServiceOfferEditor from './ServiceOfferEditor';

const AddService = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const createService = async (service) => {
    setSaving(true);
    try {
      const response = await api.post('/services', service);
      const serviceId = response.data.service?.id;
      toast.success('Your service is live. Add packages to complete the offer.');
      navigate(serviceId ? `/seller/dashboard/services/${serviceId}/packages` : '/seller/dashboard/services');
    } catch (error) {
      toast.error(
        error.response?.data?.fields?.[0]?.message
        || error.response?.data?.error
        || 'Your service could not be published.'
      );
    } finally {
      setSaving(false);
    }
  };

  return <ServiceOfferEditor onSubmit={createService} saving={saving} submitLabel="Publish service and add packages" />;
};

export default AddService;
