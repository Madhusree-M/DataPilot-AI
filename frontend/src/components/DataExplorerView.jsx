import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Table, Database, ArrowUpDown } from 'lucide-react';
import { api } from '../services/api';

export default function DataExplorerView({ dataset }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPreview = async () => {
    if (!dataset) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDatasetPreview(dataset.id, page, pageSize, searchTerm);
      setPreviewData(res);
    } catch (err) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [dataset?.id, searchTerm, pageSize]);

  useEffect(() => {
    fetchPreview();
  }, [dataset?.id, page, pageSize, searchTerm]);

  if (!dataset) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Select a dataset to explore raw observations.</p>
      </div>
    );
  }

  const totalPages = previewData ? Math.ceil(previewData.total_rows / pageSize) : 1;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Header & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Table size={18} color="var(--accent-cyan)" />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Data Explorer & Table Viewer</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Viewing records from <b>{dataset.name}</b> &bull; Total: {previewData?.total_rows?.toLocaleString() || dataset.row_count} rows
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search across rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '30px', fontSize: '12.5px', height: '34px' }}
            />
          </div>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="select-field"
            style={{ width: '110px', height: '34px', fontSize: '12px' }}
          >
            <option value={15}>15 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fda4af', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Table Content */}
      <div style={{
        overflowX: 'auto',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        background: 'rgba(0, 0, 0, 0.2)',
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="animate-spin" style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto 10px auto' }} />
            Loading observations...
          </div>
        ) : previewData && previewData.rows.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>
                  #
                </th>
                {previewData.columns.map((col) => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.rows.map((row, rIdx) => (
                <tr
                  key={row._index ?? rIdx}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {row._index ?? (page - 1) * pageSize + rIdx + 1}
                  </td>
                  {previewData.columns.map((col) => {
                    const val = row[col];
                    const isNull = val === null || val === undefined;
                    return (
                      <td key={col} style={{ padding: '10px 14px', color: isNull ? '#f43f5e' : 'var(--text-main)', fontStyle: isNull ? 'italic' : 'normal' }}>
                        {isNull ? 'null' : String(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No records match your search filter.
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {previewData && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, previewData.total_rows)} of {previewData.total_rows.toLocaleString()} entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '0 4px' }}>
              Page <b>{page}</b> of <b>{totalPages || 1}</b>
            </span>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
