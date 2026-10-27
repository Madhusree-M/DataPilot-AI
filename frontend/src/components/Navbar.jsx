import React from 'react';
import { Database, Upload, Sparkles, Activity, FileSpreadsheet } from 'lucide-react';

export default function Navbar({
  datasets,
  activeDatasetId,
  onSelectDataset,
  onOpenUpload,
  backendOnline,
}) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      background: 'rgba(13, 18, 31, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)',
        }}>
          <Sparkles size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DataPilot AI
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '10px' }}>
              v1.0 Pro
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>
            Autonomous AI Data Scientist
          </div>
        </div>
      </div>

      {/* Center Controls: Dataset Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '4px 10px',
        }}>
          <Database size={15} color="var(--accent-cyan)" />
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Active Dataset:</span>
          <select
            value={activeDatasetId || ''}
            onChange={(e) => onSelectDataset(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              paddingRight: '6px',
            }}
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id} style={{ background: '#0d121f', color: '#f8fafc' }}>
                {d.name} ({d.row_count} rows, {d.col_count} cols)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenUpload}
          className="btn btn-secondary"
          style={{ padding: '7px 13px', fontSize: '12.5px' }}
        >
          <Upload size={14} />
          Upload Dataset
        </button>
      </div>

      {/* Right Controls: Backend Status & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: backendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
          padding: '4px 10px',
          borderRadius: '9999px',
        }}>
          <div style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: backendOnline ? '#10b981' : '#f43f5e',
            boxShadow: backendOnline ? '0 0 8px #10b981' : 'none',
          }} />
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: backendOnline ? '#6ee7b7' : '#fda4af',
          }}>
            {backendOnline ? 'AI Engine Ready' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
}
