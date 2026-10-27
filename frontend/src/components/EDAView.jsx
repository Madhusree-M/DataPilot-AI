import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Layers,
  Database,
  Search,
  Filter,
  BarChart2,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function EDAView({ edaData, loading, onSwitchTab }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, numeric, categorical
  const [expandedCol, setExpandedCol] = useState(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '16px' }}>
        <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
        <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Calculating exploratory data profiles and statistics...</div>
      </div>
    );
  }

  if (!edaData) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Select a dataset to begin exploratory analysis.</p>
      </div>
    );
  }

  const {
    health_score,
    row_count,
    col_count,
    duplicate_rows_count,
    memory_usage_mb,
    warnings,
    column_profiles,
    top_correlations,
    missing_matrix,
  } = edaData;

  // Filter column profiles
  const filteredColumns = column_profiles.filter((col) => {
    const matchesSearch = col.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'numeric') return col.inferred_type === 'numeric';
    if (filterType === 'categorical') return ['categorical', 'boolean', 'text'].includes(col.inferred_type);
    return true;
  });

  // Health Score Color
  const getHealthColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#f43f5e';
  };

  const healthColor = getHealthColor(health_score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {/* Health Score Card */}
        <div className="glass-panel" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${healthColor}30`,
          background: `radial-gradient(circle at top right, ${healthColor}15, transparent 65%), var(--bg-card)`,
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Data Health Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '38px', fontWeight: 800, color: healthColor, letterSpacing: '-0.03em' }}>
              {health_score}
            </span>
            <span style={{ fontSize: '16px', color: 'var(--text-dim)', fontWeight: 600 }}>/100</span>
          </div>
          <div className="badge" style={{
            background: `${healthColor}20`,
            color: healthColor,
            border: `1px solid ${healthColor}40`,
            marginTop: '6px',
            fontSize: '11px',
          }}>
            {health_score >= 80 ? 'Production Ready' : health_score >= 60 ? 'Needs Cleaning' : 'Critical Issues'}
          </div>
        </div>

        {/* Rows */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Database size={15} color="var(--accent-cyan)" />
            Total Rows
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
            {row_count.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sample observations
          </div>
        </div>

        {/* Columns */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Layers size={15} color="var(--accent-primary)" />
            Features / Cols
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
            {col_count}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {edaData.numeric_columns.length} numeric, {edaData.categorical_columns.length} categorical
          </div>
        </div>

        {/* Missing Cells */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <AlertTriangle size={15} color={(edaData.missing_cells_count || 0) > 0 ? '#f59e0b' : '#10b981'} />
            Missing / Nulls
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: (edaData.missing_cells_count || 0) > 0 ? '#f59e0b' : '#10b981', marginTop: '8px' }}>
            {(edaData.missing_cells_count !== undefined ? edaData.missing_cells_count : 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {(edaData.missing_cells_count || 0) === 0 ? 'Zero missing cells' : `${edaData.missing_cells_percentage || 0}% across ${edaData.columns_with_missing_count || 0} cols`}
          </div>
        </div>

        {/* Duplicate Rows */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <CheckCircle2 size={15} color={duplicate_rows_count > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'} />
            Duplicate Rows
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: duplicate_rows_count > 0 ? '#f59e0b' : '#10b981', marginTop: '8px' }}>
            {duplicate_rows_count.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {duplicate_rows_count === 0 ? 'Zero redundancy detected' : `${((duplicate_rows_count/row_count)*100).toFixed(1)}% duplicate rows`}
          </div>
        </div>

        {/* Memory */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <TrendingUp size={15} color="var(--accent-purple)" />
            Memory Footprint
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
            {memory_usage_mb} <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>MB</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            In-memory cache footprint
          </div>
        </div>
      </div>

      {/* Warnings & AI Recommendations Section */}
      {warnings && warnings.length > 0 ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertTriangle size={18} color="#f59e0b" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Autonomous AI Health Audit ({warnings.length} Findings)</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Identified anomalies, missing data, and cardinality warnings with recommended remediation.
                </p>
              </div>
            </div>
            {onSwitchTab && (
              <button
                onClick={() => onSwitchTab('cleaning')}
                className="btn btn-primary"
                style={{ fontSize: '12.5px', padding: '6px 14px' }}
              >
                Go to Smart Clean &rarr;
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {warnings.map((w, idx) => {
              const isHigh = w.severity === 'high';
              const isMed = w.severity === 'medium';
              const color = isHigh ? '#f43f5e' : isMed ? '#f59e0b' : '#38bdf8';
              return (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${color}35`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {w.column ? `Column: ${w.column}` : 'Dataset Structure'}
                    </span>
                    <span className="badge" style={{ background: `${color}15`, color: color, fontSize: '10px' }}>
                      {w.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{w.message}</div>
                  <div style={{ fontSize: '11.5px', color: color, marginTop: '2px', fontWeight: 500 }}>
                    💡 {w.recommendation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}>
          <ShieldCheck size={20} color="#10b981" />
          <span style={{ fontSize: '13.5px', color: '#6ee7b7', fontWeight: 600 }}>
            Clean Dataset: No severe missing values, duplicate rows, or extreme anomalies found.
          </span>
        </div>
      )}

      {/* Feature Profiling Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Feature Profiling & Statistical Distributions</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              In-depth summary statistics, null ratios, uniqueness, and distribution histograms.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
              <input
                type="text"
                placeholder="Search column..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '30px', fontSize: '12.5px', height: '34px' }}
              />
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
              {['all', 'numeric', 'categorical'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    border: 'none',
                    background: filterType === type ? 'var(--accent-primary)' : 'transparent',
                    color: filterType === type ? 'white' : 'var(--text-muted)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column Profiling Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Feature</th>
                <th style={{ padding: '10px 12px' }}>Type</th>
                <th style={{ padding: '10px 12px' }}>Missing</th>
                <th style={{ padding: '10px 12px' }}>Unique</th>
                <th style={{ padding: '10px 12px' }}>Mean / Mode</th>
                <th style={{ padding: '10px 12px' }}>Median / Top</th>
                <th style={{ padding: '10px 12px' }}>Std Dev</th>
                <th style={{ padding: '10px 12px' }}>Outliers</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {filteredColumns.map((col) => {
                const isExpanded = expandedCol === col.name;
                const isNumeric = col.inferred_type === 'numeric';

                return (
                  <React.Fragment key={col.name}>
                    <tr
                      onClick={() => setExpandedCol(isExpanded ? null : col.name)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => !isExpanded && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => !isExpanded && (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isExpanded ? <ChevronUp size={14} color="var(--accent-primary)" /> : <ChevronDown size={14} color="var(--text-dim)" />}
                          {col.name}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`badge ${isNumeric ? 'badge-cyan' : 'badge-indigo'}`} style={{ fontSize: '10.5px' }}>
                          {col.inferred_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: col.missing_count > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {col.missing_count} ({col.missing_percentage}%)
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                        {col.unique_count.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: isNumeric ? 'var(--font-mono)' : 'var(--font-sans)', color: 'var(--text-main)' }}>
                        {isNumeric ? (col.mean !== null ? col.mean : '-') : (col.top_values && col.top_values[0] ? col.top_values[0].value : '-')}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: isNumeric ? 'var(--font-mono)' : 'var(--font-sans)', color: 'var(--text-muted)' }}>
                        {isNumeric ? (col.median !== null ? col.median : '-') : (col.top_values && col.top_values[1] ? col.top_values[1].value : '-')}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {col.std !== null ? col.std : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: col.outlier_count > 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                        {col.outlier_count !== null ? col.outlier_count : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {/* Mini Inline Histogram */}
                        {col.histogram && col.histogram.counts ? (
                          <div style={{ display: 'inline-flex', alignItems: 'flex-end', height: '20px', gap: '2px' }}>
                            {col.histogram.counts.map((cnt, i) => {
                              const maxCnt = Math.max(...col.histogram.counts) || 1;
                              const heightPct = Math.max((cnt / maxCnt) * 100, 10);
                              return (
                                <div
                                  key={i}
                                  title={`${col.histogram.bins[i]} - ${col.histogram.bins[i+1]}: ${cnt}`}
                                  style={{
                                    width: '4px',
                                    height: `${heightPct}%`,
                                    background: 'var(--accent-primary)',
                                    borderRadius: '1px',
                                    opacity: 0.85,
                                  }}
                                />
                              );
                            })}
                          </div>
                        ) : col.top_values ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {col.top_values.length} classes
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(99, 102, 241, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <td colSpan={9} style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: isNumeric ? 'repeat(auto-fit, minmax(130px, 1fr))' : '1fr', gap: '12px' }}>
                            {isNumeric ? (
                              <>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Min Value</div>
                                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{col.min}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Q25 (25th %)</div>
                                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{col.q25}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Median (Q50)</div>
                                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{col.median}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Q75 (75th %)</div>
                                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{col.q75}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Max Value</div>
                                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{col.max}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Skewness</div>
                                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{col.skewness ?? '-'}</div>
                                </div>
                              </>
                            ) : (
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                  Top Frequent Categories in `{col.name}`:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {col.top_values && col.top_values.map((v, i) => (
                                    <div key={i} style={{
                                      background: 'rgba(255, 255, 255, 0.04)',
                                      border: '1px solid var(--border-subtle)',
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      fontSize: '12px',
                                    }}>
                                      <b>{v.value}</b>: <span style={{ color: 'var(--accent-cyan)' }}>{v.count}</span> ({v.percentage}%)
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Correlated Pairs */}
      {top_correlations && top_correlations.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Top Feature Correlations (Pearson)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Strongest positive and negative interactions between numerical features.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {top_correlations.slice(0, 6).map((corr, idx) => {
              const isPos = corr.correlation > 0;
              const absVal = Math.abs(corr.correlation);
              const color = isPos ? '#06b6d4' : '#ec4899';

              return (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {corr.feature_a} <span style={{ color: 'var(--text-dim)' }}>&harr;</span> {corr.feature_b}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>
                      {corr.correlation > 0 ? `+${corr.correlation}` : corr.correlation}
                    </span>
                  </div>

                  {/* Progress / Magnitude bar */}
                  <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${absVal * 100}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '3px',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
