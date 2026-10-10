import React, { useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  PlayIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { uploadPublicMedia } from '../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUtils';
import { useTranslation } from 'react-i18next';

const EMPTY_MEDIA = [];
const MEDIA_RULES = {
  image: {
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'],
    maxBytes: 10 * 1024 * 1024,
    label: 'photo',
  },
  video: {
    // iPhones commonly label camera recordings as video/quicktime (.mov).
    // Keep the extension fallbacks too: some Android file pickers report an
    // empty or generic MIME type even for a valid MP4.
    accept: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', '.mp4', '.m4v', '.mov', '.webm'],
    extensions: ['mp4', 'm4v', 'mov', 'webm'],
    // Keep below Cloudflare's 100 MB request ceiling after multipart overhead.
    maxBytes: 90 * 1024 * 1024,
    label: 'video',
  },
};

const MediaUploader = ({
  onMediaUploaded,
  existingMedia = EMPTY_MEDIA,
  maxFiles = 10,
  allowedTypes = ['image'],
}) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);
  const mediaList = Array.isArray(existingMedia) ? existingMedia : EMPTY_MEDIA;
  const acceptedMimeTypes = allowedTypes
    .filter((type) => MEDIA_RULES[type])
    .flatMap((type) => MEDIA_RULES[type].accept);

  const mediaTypeForFile = (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.find((type) => {
      const rule = MEDIA_RULES[type];
      return rule?.accept.includes(file.type) || rule?.extensions?.includes(extension);
    });
  };

  const handleFileSelect = async (event) => {
    if (uploading) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (mediaList.length + files.length > maxFiles) {
      toast.error(t('mediaUploader.upTo', { count: maxFiles }));
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let nextMedia = [...mediaList];
    let uploadedCount = 0;
    for (const file of files) {
      const mediaType = mediaTypeForFile(file);
      if (!mediaType) {
        toast.error(t('mediaUploader.unsupported', { name: file.name }));
        continue;
      }
      const rule = MEDIA_RULES[mediaType];
      if (file.size > rule.maxBytes) {
        toast.error(t('mediaUploader.tooLarge', { name: file.name, size: rule.maxBytes / (1024 * 1024), type: rule.label }));
        continue;
      }

      const formData = new FormData();
      formData.append('media', file);
      try {
        // Do not set Content-Type ourselves. The browser must add the
        // multipart boundary for FormData; manually forcing this header can
        // leave Multer with an unreadable request on some browsers.
        const response = await uploadPublicMedia(formData, (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.min(100, Math.round((progressEvent.loaded / progressEvent.total) * 100)));
        });
        if (response.data.success) {
          const newMedia = { url: response.data.url, type: response.data.type };
          nextMedia = [...nextMedia, newMedia];
          onMediaUploaded(nextMedia);
          uploadedCount += 1;
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(error.response?.data?.error || t('mediaUploader.failed', { name: file.name }));
      }
    }
    if (uploadedCount) toast.success(t('mediaUploader.uploaded', { count: uploadedCount }));
    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index) => {
    const newList = mediaList.filter((_, i) => i !== index);
    onMediaUploaded(newList);
  };

  const moveMedia = (index, destination) => {
    if (destination < 0 || destination >= mediaList.length || destination === index) return;
    const newList = [...mediaList];
    const [selectedMedia] = newList.splice(index, 1);
    newList.splice(destination, 0, selectedMedia);
    onMediaUploaded(newList);
  };

  const makeCover = (index) => moveMedia(index, 0);

  return (
    <div className="media-uploader">
      <div className="media-grid">
        {mediaList.map((media, idx) => (
          <div key={`${media.url}-${idx}`} className={`media-item ${idx === 0 ? 'media-item-cover' : ''}`}>
            {media.type === 'image' ? (
              <img src={getImageUrl(media.url)} alt="upload" />
            ) : (
              <video src={getImageUrl(media.url)} muted playsInline preload="metadata" />
            )}
            {media.type === 'video' && <span className="video-indicator"><PlayIcon aria-hidden="true" /></span>}
            {idx === 0 && <span className="cover-indicator"><StarIcon aria-hidden="true" /> {t('mediaUploader.cover')}</span>}
            <button type="button" className="remove-media" onClick={() => removeMedia(idx)} aria-label={t('mediaUploader.remove', { count: idx + 1 })}>
              <XMarkIcon className="w-4 h-4" />
            </button>
            <div className="media-order-controls" aria-label={t('mediaUploader.controls', { count: idx + 1 })}>
              {idx > 0 && (
                <button type="button" onClick={() => makeCover(idx)} aria-label={t('mediaUploader.makeCover', { count: idx + 1 })} title={t('mediaUploader.cover')}>
                  <StarIcon aria-hidden="true" />
                </button>
              )}
              <button type="button" onClick={() => moveMedia(idx, idx - 1)} disabled={idx === 0} aria-label={t('mediaUploader.moveEarlier', { count: idx + 1 })} title={t('mediaUploader.moveEarlier', { count: idx + 1 })}>
                <ArrowLeftIcon aria-hidden="true" />
              </button>
              <button type="button" onClick={() => moveMedia(idx, idx + 1)} disabled={idx === mediaList.length - 1} aria-label={t('mediaUploader.moveLater', { count: idx + 1 })} title={t('mediaUploader.moveLater', { count: idx + 1 })}>
                <ArrowRightIcon aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        {mediaList.length < maxFiles && (
          <button type="button" className="upload-area" onClick={() => !uploading && fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <div className="spinner"></div> : <ArrowUpTrayIcon className="upload-icon" />}
            <span>{uploading ? t('mediaUploader.uploading', { progress: uploadProgress === null ? '…' : ` ${uploadProgress}%` }) : t('mediaUploader.upload')}</span>
          </button>
        )}
      </div>
      <div className="media-uploader__help"><PhotoIcon aria-hidden="true" /> <span>{t('mediaUploader.help', { count: maxFiles, kind: allowedTypes.includes('video') ? t('mediaUploader.photosVideos') : t('mediaUploader.photos') })}</span></div>
      <input ref={fileInputRef} type="file" accept={acceptedMimeTypes.join(',')} multiple onChange={handleFileSelect} disabled={uploading} style={{ display: 'none' }} />
      <style>{`
        .media-uploader { width: 100%; }
        .media-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
        .media-item { position: relative; width: 112px; height: 112px; border: 1px solid #dce8f2; border-radius: 0.65rem; overflow: hidden; background: #f3f4f6; }
        .media-item-cover { border: 2px solid var(--color-brand-blue, #168dd9); }
        .media-item img, .media-item video { width: 100%; height: 100%; object-fit: cover; }
        .video-indicator { position:absolute;inset-inline-start:.45rem;bottom:.45rem;display:grid;width:1.75rem;height:1.75rem;place-items:center;border-radius:999px;background:rgba(6,22,38,.78);color:#fff; }
        .video-indicator svg { width:1rem;height:1rem; }
        .remove-media { position: absolute; top: 0; inset-inline-end: 0; display:grid; width:32px; height:32px; place-items:center; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; border-radius: 0 0.5rem 0 0.5rem; padding: 4px; }
        .cover-indicator { position:absolute; inset-inline-start:.35rem; top:.35rem; display:inline-flex; align-items:center; gap:.2rem; border-radius:999px; background:rgba(6,22,38,.84); color:#fff; font-size:.63rem; font-weight:800; padding:.24rem .38rem; }
        .cover-indicator svg { width:.75rem; height:.75rem; color:#8ed9ff; }
        .media-order-controls { position:absolute; inset-inline-start:.35rem; inset-inline-end:.35rem; bottom:.35rem; display:flex; justify-content:center; gap:.25rem; }
        .media-order-controls button { display:grid; width:1.7rem; height:1.7rem; place-items:center; border:0; border-radius:.38rem; background:rgba(6,22,38,.8); color:#fff; cursor:pointer; }
        .media-order-controls button:hover:not(:disabled) { background:#168dd9; }
        .media-order-controls button:disabled { cursor:not-allowed; opacity:.4; }
        .media-order-controls svg { width:.9rem; height:.9rem; }
        .remove-media:focus-visible, .media-order-controls button:focus-visible, .upload-area:focus-visible { outline:3px solid rgba(22,141,217,.55); outline-offset:2px; }
        .upload-area { width: 100px; height: 100px; border: 2px dashed #b9cedf; border-radius: 0.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; background:#f8fbfe; color:#334e68; font:inherit; }
        .upload-area:hover { border-color: #87CEEB; background: #f0f9ff; }
        .upload-area:disabled { cursor:wait; opacity:.7; }
        .upload-icon { width: 2rem; height: 2rem; color: #9ca3af; }
        .spinner { width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top-color: #87CEEB; border-radius: 50%; animation: spin 1s linear infinite; }
        .media-uploader__help { display:flex;align-items:center;gap:.4rem;margin-top:.65rem;color:#60758b;font-size:.78rem;line-height:1.4; }
        .media-uploader__help svg { width:1rem;height:1rem;color:#168dd9;flex:0 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .media-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:.65rem; }
          .media-item, .upload-area { width:100%; height:auto; aspect-ratio:1; min-width:0; }
          .upload-area { min-height:0; }
          .remove-media { width:36px; height:36px; }
          .media-order-controls button { width:2rem; height:2rem; }
          .cover-indicator { max-width:calc(100% - .7rem); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        }
        @media (max-width: 360px) { .media-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
      `}</style>
    </div>
  );
};

export default MediaUploader;
