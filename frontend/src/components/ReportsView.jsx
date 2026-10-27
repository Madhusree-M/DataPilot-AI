import React, { useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Sparkles,
  Printer,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';

export default function ReportsView({ dataset, latestJobId }) {
  const [reportTitle, setReportTitle] = useState('DataPilot AI - Executive Data Science Audit');
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  if (!dataset) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Select a dataset to generate executive audit reports.</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await api.generateReport(dataset.id, reportTitle, latestJobId);
      setReport(res);
    } catch (err) {
      setError(err.message || 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%), var(--bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-cyan-glow)',
          }}>
            <FileText size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Executive Data Science Audit Reports</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Export boardroom-ready HTML and PDF audit summaries with health metrics, profiles, and AutoML leaderboards.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-primary"
          style={{ padding: '10px 22px' }}
        >
          {generating ? (
            <>
              <div className="animate-spin" style={{ width: '15px', height: '15px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
              Compiling Executive Audit...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Executive Report
            </>
          )}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fda4af',
        }}>
          {error}
        </div>
      )}

      {/* Configuration options */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
          Report Title:
        </label>
        <input
          type="text"
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          className="input-field"
          style={{ maxWidth: '500px' }}
        />
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
          Includes automated EDA data health scores, feature statistics, correlation matrix, and AutoML models {latestJobId ? `(from job ${latestJobId})` : '(run AutoML to embed model leaderboard)'}.
        </div>
      </div>

      {/* Generated Report Card & Viewer */}
      {report && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} color="#10b981" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Report Generated Successfully
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  File: <b>{report.filename}</b> &bull; Size: {(report.file_size_bytes / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={report.download_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '12.5px' }}
              >
                <ExternalLink size={14} />
                Open Fullscreen
              </a>
              <a
                href={`${report.download_url}?download=true`}
                download={report.filename}
                className="btn btn-cyan"
                style={{ fontSize: '12.5px' }}
              >
                <Download size={14} />
                Download HTML
              </a>
            </div>
          </div>

          {/* Embedded Preview Iframe */}
          <div style={{
            width: '100%',
            height: '650px',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            background: '#ffffff',
          }}>
            <iframe
              src={report.download_url}
              title="Report Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
