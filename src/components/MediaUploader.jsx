import React, { useState, useRef } from 'react';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../services/api';  // <-- USE YOUR API INSTANCE
import toast from 'react-hot-toast';

const MediaUploader = ({ onMediaUploaded, existingMedia = [], maxFiles = 10 }) => {
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState(existingMedia);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (mediaList.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        toast.error(`${file.name} is not an image or video`);
        continue;
      }
      if (isVideo && file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 100MB`);
        continue;
      }
      if (isImage && file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB`);
        continue;
      }

      const formData = new FormData();
      formData.append('media', file);
      try {
        // USE THE AXIOS API INSTANCE (automatically adds token and correct baseURL)
        const response = await api.post('/upload-media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data.success) {
          const newMedia = { url: response.data.url, type: response.data.type };
          const updatedList = [...mediaList, newMedia];
          setMediaList(updatedList);
          onMediaUploaded(updatedList);
          toast.success(`${file.name} uploaded`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    fileInputRef.current.value = '';
  };

  const removeMedia = (index) => {
    const newList = mediaList.filter((_, i) => i !== index);
    setMediaList(newList);
    onMediaUploaded(newList);
  };

  return (
    <div className="media-uploader">
      <div className="media-grid">
        {mediaList.map((media, idx) => (
          <div key={idx} className="media-item">
            {media.type === 'image' ? (
              <img src={`http://localhost:5000${media.url}`} alt="upload" />
            ) : (
              <video src={`http://localhost:5000${media.url}`} />
            )}
            <button className="remove-media" onClick={() => removeMedia(idx)}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        {mediaList.length < maxFiles && (
          <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
            {uploading ? <div className="spinner"></div> : <ArrowUpTrayIcon className="upload-icon" />}
            <p>{uploading ? 'Uploading...' : 'Upload Image/Video'}</p>
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
      <style>{`
        .media-uploader { width: 100%; }
        .media-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
        .media-item { position: relative; width: 100px; height: 100px; border-radius: 0.5rem; overflow: hidden; background: #f3f4f6; }
        .media-item img, .media-item video { width: 100%; height: 100%; object-fit: cover; }
        .remove-media { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; border-radius: 0 0.5rem 0 0.5rem; padding: 4px; }
        .upload-area { width: 100px; height: 100px; border: 2px dashed #d1d5db; border-radius: 0.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .upload-area:hover { border-color: #87CEEB; background: #f0f9ff; }
        .upload-icon { width: 2rem; height: 2rem; color: #9ca3af; }
        .spinner { width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top-color: #87CEEB; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MediaUploader;