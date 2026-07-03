import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, X, AlertCircle } from 'lucide-react';
import { uploadVisionImage } from '../services/api';

export default function CameraCapture({ onUploadSuccess, onClose }) {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Direct webcam stream failed. Falling back to native capture.", err.message);
      setError("Webcam permission denied or unavailable. Please use the Mobile Camera selector below.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', file);

      const res = await uploadVisionImage(formData);
      if (res.success) {
        stopCamera();
        onUploadSuccess(res.filePath, res.fileUrl);
      } else {
        setError(res.error || 'Failed to analyze captured image.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to capture and upload image.');
    } finally {
      setLoading(false);
    }
  };

  // Mobile Native Capture Fallback Handler
  const handleNativeCapture = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      setError(null);
      try {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('image', file);
        
        const res = await uploadVisionImage(formData);
        if (res.success) {
          onUploadSuccess(res.filePath, res.fileUrl);
        } else {
          setError(res.error || 'Failed to upload photo.');
        }
      } catch (err) {
        console.error(err);
        setError('Error uploading photo.');
      } finally {
        setLoading(false);
      }
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div style={{
      background: 'rgba(20, 30, 45, 0.98)',
      borderRadius: '16px',
      border: '1px solid var(--border-light)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      position: 'relative',
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer'
        }}
      >
        <X size={20} />
      </button>

      <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Camera size={18} style={{ color: 'var(--accent-cyan)' }} />
        <span>Mobile Crop Camera Capture</span>
      </h3>

      {/* Video Feed Window */}
      <div style={{
        width: '100%',
        height: '280px',
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-light)'
      }}>
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {error ? 'Webcam feed offline.' : 'Starting camera feed...'}
          </div>
        )}

        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.85rem',
            gap: '8px'
          }}>
            <RefreshCw className="spinner" size={20} />
            <span>Analyzing Leaf...</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        {stream && (
          <button
            onClick={handleCapture}
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--accent-gradient)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Capture leaf Photo
          </button>
        )}

        {/* File selector fallback for devices without standard Webcams (or permission blocks) */}
        <label
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.85rem',
            textAlign: 'center',
            display: 'block'
          }}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeCapture}
            style={{ display: 'none' }}
            disabled={loading}
          />
          <span>Use Phone Camera</span>
        </label>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '0.75rem',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
