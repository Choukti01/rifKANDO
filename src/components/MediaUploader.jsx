import React, { useRef, useState } from 'react';
import { ArrowUpTrayIcon, PhotoIcon, PlayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUtils';

const EMPTY_MEDIA = [];
const MEDIA_RULES = {
  image: {
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxBytes: 10 * 1024 * 1024,
    label: 'photo',
  },
  video: {
    accept: ['video/mp4', 'video/webm'],
    maxBytes: 40 * 1024 * 1024,
    label: 'video',
  },
};

const MediaUploader = ({
  onMediaUploaded,
  existingMedia = EMPTY_MEDIA,
  maxFiles = 10,
  allowedTypes = ['image'],
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const mediaList = Array.isArray(existingMedia) ? existingMedia : EMPTY_MEDIA;
  const acceptedMimeTypes = allowedTypes
    .filter((type) => MEDIA_RULES[type])
    .flatMap((type) => MEDIA_RULES[type].accept);

  const handleFileSelect = async (event) => {
    if (uploading) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (mediaList.length + files.length > maxFiles) {
      toast.error(`You can add up to ${maxFiles} files. Remove an item before adding more.`);
      event.target.value = '';
      return;
    }

    setUploading(true);
    let nextMedia = [...mediaList];
    let uploadedCount = 0;
    for (const file of files) {
      const mediaType = allowedTypes.find((type) => MEDIA_RULES[type]?.accept.includes(file.type));
      if (!mediaType) {
        toast.error(`${file.name} is not a supported photo or video.`);
        continue;
      }
      const rule = MEDIA_RULES[mediaType];
      if (file.size > rule.maxBytes) {
        toast.error(`${file.name} exceeds the ${rule.maxBytes / (1024 * 1024)} MB ${rule.label} limit.`);
        continue;
      }

      const formData = new FormData();
      formData.append('media', file);
      try {
        const response = await api.post('/upload-media', formData);
        if (response.data.success) {
          const newMedia = { url: response.data.url, type: response.data.type };
          nextMedia = [...nextMedia, newMedia];
          onMediaUploaded(nextMedia);
          uploadedCount += 1;
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(error.response?.data?.error || `Failed to upload ${file.name}`);
      }
    }
    if (uploadedCount) toast.success(`${uploadedCount} ${uploadedCount === 1 ? 'file' : 'files'} uploaded.`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index) => {
    const newList = mediaList.filter((_, i) => i !== index);
    onMediaUploaded(newList);
  };

  return (
    <div className="media-uploader">
      <div className="media-grid">
        {mediaList.map((media, idx) => (
          <div key={idx} className="media-item">
            {media.type === 'image' ? (
              <img src={getImageUrl(media.url)} alt="upload" />
            ) : (
              <video src={getImageUrl(media.url)} muted playsInline preload="metadata" />
            )}
            {media.type === 'video' && <span className="video-indicator"><PlayIcon aria-hidden="true" /></span>}
            <button type="button" className="remove-media" onClick={() => removeMedia(idx)} aria-label={`Remove media ${idx + 1}`}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        {mediaList.length < maxFiles && (
          <button type="button" className="upload-area" onClick={() => !uploading && fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <div className="spinner"></div> : <ArrowUpTrayIcon className="upload-icon" />}
            <span>{uploading ? 'Uploading…' : 'Add media'}</span>
          </button>
        )}
      </div>
      <div className="media-uploader__help"><PhotoIcon aria-hidden="true" /> <span>First item is your cover. Add up to {maxFiles} {allowedTypes.includes('video') ? 'photos or videos' : 'photos'}.</span></div>
      <input ref={fileInputRef} type="file" accept={acceptedMimeTypes.join(',')} multiple onChange={handleFileSelect} disabled={uploading} style={{ display: 'none' }} />
      <style>{`
        .media-uploader { width: 100%; }
        .media-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
        .media-item { position: relative; width: 100px; height: 100px; border-radius: 0.5rem; overflow: hidden; background: #f3f4f6; }
        .media-item img, .media-item video { width: 100%; height: 100%; object-fit: cover; }
        .video-indicator { position:absolute;left:.45rem;bottom:.45rem;display:grid;width:1.75rem;height:1.75rem;place-items:center;border-radius:999px;background:rgba(6,22,38,.78);color:#fff; }
        .video-indicator svg { width:1rem;height:1rem; }
        .remove-media { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; border-radius: 0 0.5rem 0 0.5rem; padding: 4px; }
        .upload-area { width: 100px; height: 100px; border: 2px dashed #b9cedf; border-radius: 0.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; background:#f8fbfe; color:#334e68; font:inherit; }
        .upload-area:hover { border-color: #87CEEB; background: #f0f9ff; }
        .upload-area:disabled { cursor:wait; opacity:.7; }
        .upload-icon { width: 2rem; height: 2rem; color: #9ca3af; }
        .spinner { width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top-color: #87CEEB; border-radius: 50%; animation: spin 1s linear infinite; }
        .media-uploader__help { display:flex;align-items:center;gap:.4rem;margin-top:.65rem;color:#60758b;font-size:.78rem;line-height:1.4; }
        .media-uploader__help svg { width:1rem;height:1rem;color:#168dd9;flex:0 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MediaUploader;
