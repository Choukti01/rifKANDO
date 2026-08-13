import React, { useRef, useState } from 'react';
import { ArrowUpTrayIcon, CheckCircleIcon, DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { uploadDigitalFile } from '../../services/api';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'epub', 'zip', 'mobi', 'mp3', 'mp4', 'jpg', 'jpeg', 'png', 'webp']);
const ACCEPTED_FILES = '.pdf,.epub,.zip,.mobi,.mp3,.mp4,.jpg,.jpeg,.png,.webp';

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / (1024 ** index);
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
};

const DigitalFileUploader = ({ value, onChange, existingFile }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      toast.error('Choose a PDF, EPUB, ZIP, MOBI, MP3, MP4, JPG, PNG, or WebP file.');
      return;
    }
    if (file.size < 1 || file.size > MAX_FILE_SIZE) {
      toast.error('Digital files must be between 1 byte and 25 MB.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setProgress(0);
    try {
      const response = await uploadDigitalFile(formData, (event) => {
        if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
      });
      const data = response.data;
      onChange({
        storageReference: data.storageReference,
        name: data.fileName,
        size: data.fileSize,
        contentType: data.contentType,
        sha256: data.sha256,
        uploadReceipt: data.uploadReceipt,
        uploadReceiptExpiresAt: data.uploadReceiptExpiresAt,
      });
      toast.success('File validated and ready to publish.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'The file could not be uploaded.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const selectedFile = value || existingFile;

  return (
    <div className="digital-file-uploader">
      <input ref={inputRef} type="file" accept={ACCEPTED_FILES} onChange={(event) => upload(event.target.files?.[0])} className="digital-file-input" />
      <button
        type="button"
        className={`digital-dropzone ${dragging ? 'is-dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); upload(event.dataTransfer.files?.[0]); }}
        disabled={uploading}
      >
        {uploading ? <ArrowUpTrayIcon className="digital-upload-icon spin" /> : <DocumentArrowUpIcon className="digital-upload-icon" />}
        <span className="digital-dropzone-title">{uploading ? `Uploading ${progress}%` : 'Drop your delivery file here or choose a file'}</span>
        <span className="digital-dropzone-copy">PDF, EPUB, ZIP, MOBI, MP3, MP4, JPG, PNG, or WebP up to 25 MB</span>
        {uploading && <span className="digital-upload-progress"><span style={{ width: `${progress}%` }} /></span>}
      </button>
      {selectedFile && (
        <div className="digital-file-summary">
          <CheckCircleIcon className="digital-file-check" />
          <div>
            <strong>{selectedFile.name || selectedFile.file_name}</strong>
            <span>{formatBytes(selectedFile.size ?? selectedFile.file_size_bytes)}{selectedFile.contentType || selectedFile.file_content_type ? ` · ${selectedFile.contentType || selectedFile.file_content_type}` : ''}</span>
            {value && <small>Validated by rifKANDO. Publish within 24 hours or upload it again.</small>}
            {!value && <small>This is the current delivery file. Replacing it preserves earlier buyer downloads.</small>}
          </div>
          {value && <button type="button" className="digital-file-clear" onClick={() => onChange(null)} aria-label="Remove selected delivery file"><XMarkIcon /></button>}
        </div>
      )}
      <p className="digital-file-note">Your delivery file stays private. It is only sent as a download attachment after access is granted.</p>
      <style>{`
        .digital-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
        .digital-dropzone { width: 100%; min-height: 152px; border: 1.5px dashed #77aebd; border-radius: 14px; background: #f4fafb; color: #17313a; display: grid; justify-items: center; align-content: center; gap: 6px; padding: 20px; cursor: pointer; transition: border-color .2s, background .2s, transform .2s; }
        .digital-dropzone:hover, .digital-dropzone.is-dragging { border-color: #216275; background: #e7f4f7; transform: translateY(-1px); }
        .digital-dropzone:disabled { cursor: progress; opacity: .75; }
        .digital-upload-icon { width: 29px; height: 29px; color: #216275; }
        .digital-upload-icon.spin { animation: digital-upload-spin 1s linear infinite; }
        .digital-dropzone-title { font-size: .94rem; font-weight: 700; text-align: center; }
        .digital-dropzone-copy, .digital-file-note { color: #5b7178; font-size: .79rem; text-align: center; line-height: 1.45; }
        .digital-upload-progress { width: min(280px, 90%); height: 5px; border-radius: 999px; background: #d7e8ec; overflow: hidden; margin-top: 6px; }
        .digital-upload-progress span { display: block; height: 100%; border-radius: inherit; background: #216275; transition: width .15s linear; }
        .digital-file-summary { margin-top: 10px; display: flex; align-items: flex-start; gap: 10px; border: 1px solid #cce3e8; border-radius: 12px; padding: 12px; background: #f6fbfc; }
        .digital-file-summary > div { min-width: 0; display: grid; gap: 2px; flex: 1; }
        .digital-file-summary strong { overflow-wrap: anywhere; color: #163740; font-size: .9rem; }
        .digital-file-summary span, .digital-file-summary small { color: #60747a; font-size: .76rem; line-height: 1.4; }
        .digital-file-check { width: 20px; height: 20px; flex: 0 0 auto; color: #216275; }
        .digital-file-clear { width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 8px; background: transparent; color: #57717a; cursor: pointer; }
        .digital-file-clear:hover { color: #122d35; background: #e4f0f2; }
        .digital-file-clear svg { width: 18px; height: 18px; }
        .digital-file-note { margin: 9px 0 0; text-align: left; }
        @keyframes digital-upload-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DigitalFileUploader;
