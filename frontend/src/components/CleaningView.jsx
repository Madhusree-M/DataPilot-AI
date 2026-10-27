import React, { useState } from 'react';
import {
  Wand2,
  CheckCircle2,
  Trash2,
  Sliders,
  Sparkles,
  ArrowRight,
  Database,
  RefreshCw,
  AlertCircle,
  Download,
} from 'lucide-react';
import { api } from '../services/api';

export default function CleaningView({ dataset, onDatasetCleaned }) {
  const [imputeNumeric, setImputeNumeric] = useState('median');
  const [imputeCategorical, setImputeCategorical] = useState('mode');
  const [dropDuplicates, setDropDuplicates] = useState(true);
  const [outlierStrategy, setOutlierStrategy] = useState('clip');
  const [scaleNumeric, setScaleNumeric] = useState('none');
  const [encodeCategorical, setEncodeCategorical] = useState('none');
  const [selectedDropCols, setSelectedDropCols] = useState([]);

  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!dataset) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Select a dataset to configure data cleaning pipeline.</p>
      </div>
    );
  }

  const handleToggleCol = (col) => {
    setSelectedDropCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleRunCleaning = async (isAuto = false) => {
    setCleaning(true);
    setError(null);
    setResult(null);

    const config = isAuto
      ? {
          dataset_id: dataset.id,
          impute_numeric: 'median',
          impute_categorical: 'mode',
          drop_duplicates: true,
          outlier_strategy: 'clip',
          drop_columns: dataset.columns.filter((c) => c.toLowerCase().includes('id')),
          scale_numeric: 'none',
          encode_categorical: 'none',
        }
      : {
          dataset_id: dataset.id,
          impute_numeric: imputeNumeric,
          impute_categorical: imputeCategorical,
          drop_duplicates: dropDuplicates,
          outlier_strategy: outlierStrategy,
          drop_columns: selectedDropCols,
          scale_numeric: scaleNumeric,
          encode_categorical: encodeCategorical,
        };

    try {
      const res = await api.cleanDataset(config);
      setResult(res);
      if (onDatasetCleaned) {
        onDatasetCleaned(res.cleaned_dataset_id);
      }
    } catch (err) {
      setError(err.message || 'Data cleaning pipeline failed');
    } finally {
      setCleaning(false);
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
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%), var(--bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Wand2 size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Smart Data Cleaning & Preprocessing Studio</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Remediate missing values, remove duplicates, clip outliers, and encode features for machine learning.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleRunCleaning(true)}
            disabled={cleaning}
            className="btn btn-cyan"
            style={{ padding: '9px 18px' }}
          >
            <Sparkles size={16} />
            1-Click Smart Auto-Clean
          </button>
          <button
            onClick={() => handleRunCleaning(false)}
            disabled={cleaning}
            className="btn btn-primary"
            style={{ padding: '9px 18px' }}
          >
            {cleaning ? (
              <>
                <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                Transforming...
              </>
            ) : (
              <>
                <Sliders size={16} />
                Apply Custom Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fda4af',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Cleaning Result Report */}
      {result && (
        <div className="glass-panel" style={{
          padding: '24px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.1), transparent 60%), var(--bg-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={22} color="#10b981" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#6ee7b7' }}>Pipeline Executed Successfully</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Cleaned dataset created: <b>`{result.cleaned_filename}`</b>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <a
                href={api.getDatasetDownloadUrl(result.cleaned_dataset_id || result.cleaned_filename)}
                download={result.cleaned_filename}
                className="btn btn-emerald"
                style={{ padding: '7px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} /> Download Cleaned CSV
              </a>
              <div className="badge badge-emerald">Ready for AutoML</div>
            </div>
          </div>

          {/* Before & After KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Dataset Dimensions</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {result.original_shape[0]} &times; {result.original_shape[1]} &rarr; <span style={{ color: '#10b981' }}>{result.cleaned_shape[0]} &times; {result.cleaned_shape[1]}</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Missing Cells</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {result.missing_before} &rarr; <span style={{ color: '#10b981' }}>{result.missing_after}</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Duplicates Removed</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                {result.duplicates_removed} rows
              </div>
            </div>
          </div>

          {/* Action Log */}
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Transformation Audit Log ({result.actions_performed.length} Operations)
            </div>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {result.actions_performed.map((act, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>&bull;</span> {act}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Pipeline Configuration Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Missing Values Card */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Missing Values Treatment
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Numeric Missing Strategy:
              </label>
              <select
                value={imputeNumeric}
                onChange={(e) => setImputeNumeric(e.target.value)}
                className="select-field"
              >
                <option value="median">Impute with Median (Recommended for skewed features)</option>
                <option value="mean">Impute with Mean (Standard average)</option>
                <option value="zero">Fill with Zero (0)</option>
                <option value="drop">Drop Rows with Missing Values</option>
                <option value="none">Leave Untouched</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Categorical Missing Strategy:
              </label>
              <select
                value={imputeCategorical}
                onChange={(e) => setImputeCategorical(e.target.value)}
                className="select-field"
              >
                <option value="mode">Impute with Mode (Most Frequent Value)</option>
                <option value="missing">Fill with 'Missing' Token</option>
                <option value="drop">Drop Rows with Missing Values</option>
                <option value="none">Leave Untouched</option>
              </select>
            </div>
          </div>
        </div>

        {/* Outliers & Redundancy */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Outliers & Redundancy
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Outlier Handling (IQR 1.5x):
              </label>
              <select
                value={outlierStrategy}
                onChange={(e) => setOutlierStrategy(e.target.value)}
                className="select-field"
              >
                <option value="clip">Winsorize / Clip to IQR Bounds (Recommended)</option>
                <option value="drop">Drop Outlier Observations</option>
                <option value="none">Keep All Outliers Untouched</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px' }}>
              <input
                id="drop-dups"
                type="checkbox"
                checked={dropDuplicates}
                onChange={(e) => setDropDuplicates(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <label htmlFor="drop-dups" style={{ fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                Remove Duplicate Observations
              </label>
            </div>
          </div>
        </div>

        {/* Feature Transformations */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Feature Transformation & Scaling
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Feature Scaling:
              </label>
              <select
                value={scaleNumeric}
                onChange={(e) => setScaleNumeric(e.target.value)}
                className="select-field"
              >
                <option value="none">No Scaling (Preserve raw units)</option>
                <option value="standard">StandardScaler (Zero mean, unit variance)</option>
                <option value="minmax">MinMaxScaler (Normalized between 0 and 1)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Categorical Encoding:
              </label>
              <select
                value={encodeCategorical}
                onChange={(e) => setEncodeCategorical(e.target.value)}
                className="select-field"
              >
                <option value="none">No Encoding (Raw strings)</option>
                <option value="onehot">One-Hot Encoding (Dummies)</option>
                <option value="label">Label Encoding (Ordinal integer mapping)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Drop Columns Selector */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
            Drop Irrelevant Features
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Exclude non-predictive columns such as IDs, hashes, or text tokens.
          </p>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            maxHeight: '140px',
            overflowY: 'auto',
            padding: '6px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-md)',
          }}>
            {dataset.columns.map((col) => {
              const isSelected = selectedDropCols.includes(col);
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleToggleCol(col)}
                  style={{
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-rose)' : 'var(--border-subtle)',
                    background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? '#fda4af' : 'var(--text-muted)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {col} {isSelected && '&times;'}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
