import React, { useState } from 'react';
import { Upload, FileImage, AlertCircle, RefreshCw } from 'lucide-react';
import { uploadVisionImage } from '../services/api';

export default function ImageUploader({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    // Check size & extension
    if (!file.type.startsWith('image/')) {
      setError('Unsupported file type. Please upload an image (JPG, PNG).');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await uploadVisionImage(formData);
      if (res.success) {
        onUploadSuccess(res.filePath, res.fileUrl);
      } else {
        setError(res.error || 'Failed to upload image.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error occurred while uploading the file.');
    } finally {
      setLoading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <label
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: dragActive ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-light)',
          background: dragActive ? 'rgba(6, 182, 212, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          padding: '40px 20px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s ease',
          textAlign: 'center',
          minHeight: '200px'
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={loading}
          style={{ display: 'none' }}
        />

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw className="spinner" size={32} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Uploading leaf sample to AgroGuide server...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)'
            }}>
              <Upload size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff', display: 'block', marginBottom: '4px' }}>
                Drag & Drop Plant Leaf Photo
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                or click to browse local files (PNG, JPG, JPEG)
              </span>
            </div>
          </div>
        )}
      </label>

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
