import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import ServiceOfferEditor from './ServiceOfferEditor';
import { useServiceI18n } from '../../../i18n/serviceI18n';

const EditService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useServiceI18n();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/services/${id}`);
      setService(response.data.service);
    } catch (error) {
      toast.error(error.response?.data?.error || t('loadOfferFailed'));
      navigate('/seller/dashboard/services');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  useEffect(() => {
    const requestTimer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(requestTimer);
  }, [load]);

  const updateService = async (payload) => {
    setSaving(true);
    try {
      await api.put(`/services/${id}`, payload);
      toast.success(t('updated'));
      navigate('/seller/dashboard/services');
    } catch (error) {
      toast.error(
        error.response?.data?.fields?.[0]?.message
        || error.response?.data?.error
        || t('updateFailed')
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="service-editor-loading">{t('loadingOffer')}</div>;
  }

  return <ServiceOfferEditor key={service.id} service={service} onSubmit={updateService} saving={saving} submitLabel={t('saveChanges')} />;
};

export default EditService;
