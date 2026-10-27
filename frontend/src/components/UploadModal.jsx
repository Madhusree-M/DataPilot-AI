import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const result = await api.uploadDataset(file);
      onUploadSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '520px',
        padding: '28px',
        position: 'relative',
        background: '#0d1322',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Upload size={18} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Upload New Dataset</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Upload any CSV, Excel (.xlsx, .xls), or JSON file to run auto-EDA, clean missing data, and train models.
        </p>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#fda4af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '36px 20px',
              textAlign: 'center',
              background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '20px',
            }}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}>
              <FileText size={22} color="var(--accent-primary)" />
            </div>
            {file ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB — Ready to analyze
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>
                  Click to browse or drag and drop file here
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Supports CSV, XLSX, XLS, and JSON (up to 100 MB)
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Processing...
                </>
              ) : (
                'Import Dataset'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
