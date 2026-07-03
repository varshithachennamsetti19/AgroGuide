import React, { useState } from 'react';
import ImageUploader from '../components/ImageUploader';
import CameraCapture from '../components/CameraCapture';
import DiseaseReport from '../components/DiseaseReport';
import { analyzeVisionImage } from '../services/api';
import { Camera, Image, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DiseaseDetection() {
  const [uploadMode, setUploadMode] = useState('browse'); // 'browse' or 'camera'
  const [imageInfo, setImageInfo] = useState(null); // { filePath, fileUrl }
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null); // { success, analysis, explanation, weatherWarning, insuranceScheme }

  const handleUploadSuccess = async (filePath, fileUrl) => {
    setImageInfo({ filePath, fileUrl });
    setAnalyzing(true);
    setError(null);
    setReport(null);

    try {
      console.log(`Analyzing image on backend path: ${filePath}`);
      const res = await analyzeVisionImage(filePath);
      
      if (res.success) {
        setReport(res);
      } else {
        // Image validation failure or low confidence (Part 3, 4)
        setError(res.error || 'Failed to complete disease diagnosis.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while executing classification pipeline.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImageInfo(null);
    setReport(null);
    setError(null);
    setAnalyzing(false);
  };

  return (
    <div className="dashboard-scroll-container" style={{ padding: '20px', overflowY: 'auto', height: 'calc(100vh - 120px)' }}>
      {/* Back button if report/analyzing is loaded */}
      {(imageInfo || error) && (
        <button
          onClick={handleReset}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          <span>Start new leaf diagnosis</span>
        </button>
      )}

      {/* Title */}
      {!imageInfo && !error && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>
            🩺 Multimodal Disease Diagnostic Center
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Upload or capture leaf photos to automatically detect plant diseases, check weather-aware remedies, and access government insurance schemes.
          </p>
        </div>
      )}

      {/* Select Upload Method */}
      {!imageInfo && !error && !analyzing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Toggles */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-light)',
            padding: '4px',
            borderRadius: '8px',
            alignSelf: 'flex-start'
          }}>
            <button
              onClick={() => setUploadMode('browse')}
              style={{
                background: uploadMode === 'browse' ? 'var(--bg-panel-solid)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Image size={14} />
              <span>Upload Photo</span>
            </button>
            <button
              onClick={() => setUploadMode('camera')}
              style={{
                background: uploadMode === 'camera' ? 'var(--bg-panel-solid)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Camera size={14} />
              <span>Use Camera</span>
            </button>
          </div>

          {/* Upload workspaces */}
          <div style={{ maxWidth: '480px', width: '100%' }}>
            {uploadMode === 'browse' ? (
              <ImageUploader onUploadSuccess={handleUploadSuccess} />
            ) : (
              <CameraCapture onUploadSuccess={handleUploadSuccess} onClose={() => setUploadMode('browse')} />
            )}
          </div>
        </div>
      )}

      {/* Analyzing Loader screen */}
      {analyzing && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          color: 'var(--text-muted)'
        }}>
          <RefreshCw className="spinner" size={32} style={{ color: 'var(--accent-cyan)', marginBottom: '16px' }} />
          <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>Executing Multimodal Diagnostic Pipeline</span>
          <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>Querying YOLO model, checking weather alerts, and generating treatment...</span>
        </div>
      )}

      {/* Rejection/Validation Errors */}
      {error && (
        <div className="weather-card" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '24px 20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 'bold', margin: '0 0 6px 0', fontSize: '0.95rem' }}>
              Diagnosis Pipeline Warning
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
              {error}
            </p>
          </div>
          <button
            onClick={handleReset}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#fff',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Try another leaf photo
          </button>
        </div>
      )}

      {/* Diagnosis Report Details Screen */}
      {report && (
        <div style={{ maxWidth: '640px', width: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#10b981',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            marginBottom: '16px'
          }}>
            <CheckCircle size={16} />
            <span>AI Diagnostic Classification Completed!</span>
          </div>
          
          <DiseaseReport
            analysis={report.analysis}
            explanation={report.explanation}
            weatherWarning={report.weatherWarning}
            insuranceScheme={report.insuranceScheme}
            imageUrl={imageInfo?.fileUrl}
          />
        </div>
      )}
    </div>
  );
}
