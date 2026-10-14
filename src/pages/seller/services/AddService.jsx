import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import ServiceOfferEditor from './ServiceOfferEditor';
import { useServiceI18n } from '../../../i18n/serviceI18n';

const AddService = () => {
  const navigate = useNavigate();
  const { t } = useServiceI18n();
  const [saving, setSaving] = useState(false);

  const createService = async (service) => {
    setSaving(true);
    try {
      const response = await api.post('/services', service);
      const serviceId = response.data.service?.id;
      toast.success(t('serviceLive'));
      navigate(serviceId ? `/seller/dashboard/services/${serviceId}/packages` : '/seller/dashboard/services');
    } catch (error) {
      toast.error(
        error.response?.data?.fields?.[0]?.message
        || error.response?.data?.error
        || t('publishFailed')
      );
    } finally {
      setSaving(false);
    }
  };

  return <ServiceOfferEditor onSubmit={createService} saving={saving} submitLabel={t('publishPackages')} />;
};

export default AddService;
