import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Layers,
  Sliders,
  Filter,
  Sparkles,
  ArrowRight,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  Brain,
  HelpCircle,
  Eye,
  RotateCcw,
  Maximize2,
  ChevronRight,
  Activity,
  GitCommit,
  Hash,
  Type,
  Calendar,
  Grid,
  Palette
} from 'lucide-react';
import { api } from '../services/api';

export default function VisualizationView({
  activeDataset,
  edaData,
  automlResult,
  onSwitchTab,
  targetColumn,
  setTargetColumn,
}) {
  // Navigation sub-tabs inside Visualization module: 'showcase' (Top 5 Gallery), 'studio', 'profiler', 'model'
  const [subTab, setSubTab] = useState('showcase');

  // Top 5 Curated Charts state
  const [topCharts, setTopCharts] = useState([]);
  const [loadingTopCharts, setLoadingTopCharts] = useState(false);
  const [topChartsError, setTopChartsError] = useState(null);

  // Studio Controls state
  const [chartType, setChartType] = useState('histogram'); // histogram, boxplot, scatter, correlation_heatmap, bar, stacked_bar, line
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [groupByCol, setGroupByCol] = useState('');
  const [aggregation, setAggregation] = useState('count'); // count, mean, median, sum
  const [corrMethod, setCorrMethod] = useState('pearson'); // pearson, spearman
  const [numFilterMin, setNumFilterMin] = useState('');
  const [numFilterMax, setNumFilterMax] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Chart data and loading states for studio
  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartError, setChartError] = useState(null);

  // Profiler state
  const [profilerCol, setProfilerCol] = useState('');

  // Tooltip state for SVG charts
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });
  const chartContainerRef = useRef(null);

  // Columns partitioned by type from edaData or activeDataset
  const { numericCols, categoricalCols, dateCols, allCols, colProfilesMap } = useMemo(() => {
    if (!edaData) return { numericCols: [], categoricalCols: [], dateCols: [], allCols: [], colProfilesMap: {} };

    const num = edaData.numeric_columns || [];
    const cat = edaData.categorical_columns || [];
    const dt = [];
    const map = {};

    (edaData.column_profiles || []).forEach((p) => {
      map[p.name] = p;
      if (p.type === 'datetime' || p.type === 'date') dt.push(p.name);
    });

    const all = Object.keys(map).length > 0 ? Object.keys(map) : [...num, ...cat];
    return {
      numericCols: num,
      categoricalCols: cat,
      dateCols: dt,
      allCols: all,
      colProfilesMap: map,
    };
  }, [edaData]);

  // Set smart default columns when edaData arrives
  useEffect(() => {
    if (numericCols.length > 0 && !xCol) {
      setXCol(numericCols[0]);
      if (numericCols.length > 1) {
        setYCol(numericCols[1]);
      }
      setProfilerCol(numericCols[0]);
    } else if (categoricalCols.length > 0 && !xCol) {
      setXCol(categoricalCols[0]);
      setChartType('bar');
      setProfilerCol(categoricalCols[0]);
    }
  }, [numericCols, categoricalCols]);

  // Load Top 5 Curated Charts on mount or dataset / targetColumn change
  useEffect(() => {
    if (!activeDataset) return;
    loadTopCharts();
  }, [activeDataset?.id, targetColumn]);

  const loadTopCharts = async () => {
    try {
      setLoadingTopCharts(true);
      setTopChartsError(null);
      const res = await api.getTopCharts(activeDataset.id, targetColumn || null);
      setTopCharts(res.charts || []);
    } catch (err) {
      console.error('Failed to load top curated charts:', err);
      setTopChartsError(err.message || 'Failed to curate visualizations');
    } finally {
      setLoadingTopCharts(false);
    }
  };

  // Fetch chart data for studio whenever controls change
  useEffect(() => {
    if (!activeDataset || !xCol || subTab !== 'studio') return;
    fetchChartData();
  }, [
    activeDataset?.id,
    subTab,
    chartType,
    xCol,
    yCol,
    groupByCol,
    targetColumn,
    aggregation,
    corrMethod,
    numFilterMin,
    numFilterMax,
    selectedCategories,
  ]);

  const fetchChartData = async () => {
    try {
      setLoadingChart(true);
      setChartError(null);

      // Validate suitability
      if (['scatter', 'line'].includes(chartType) && !yCol) {
        setChartError(`Please select a Y-axis variable for ${chartType.replace('_', ' ')}.`);
        setLoadingChart(false);
        return;
      }

      const filters = {};
      if (numFilterMin !== '' || numFilterMax !== '') {
        filters[xCol] = {
          min: numFilterMin !== '' ? Number(numFilterMin) : null,
          max: numFilterMax !== '' ? Number(numFilterMax) : null,
        };
      }
      if (selectedCategories.length > 0) {
        filters[xCol] = {
          values: selectedCategories,
        };
      }

      const req = {
        chart_type: chartType,
        x_col: xCol,
        y_col: yCol || null,
        group_by_col: groupByCol || null,
        target_col: targetColumn || null,
        correlation_method: corrMethod,
        aggregation: aggregation,
        sample_size: 800,
        filters: Object.keys(filters).length > 0 ? filters : null,
      };

      const res = await api.getChartData(activeDataset.id, req);
      setChartData(res);
    } catch (err) {
      console.error('Chart fetch error:', err);
      setChartError(err.message || 'Failed to generate chart data');
    } finally {
      setLoadingChart(false);
    }
  };

  // Helper: jump to studio and customize a specific chart
  const handleCustomizeChart = (cData) => {
    if (!cData) return;
    setSubTab('studio');
    setChartType(cData.chart_type || 'histogram');
    setXCol(cData.x_col || '');
    setYCol(cData.y_col || '');
    setGroupByCol(cData.group_by_col || '');
    setNumFilterMin('');
    setNumFilterMax('');
    setSelectedCategories([]);
  };

  // Reset all filters in studio
  const handleResetFilters = () => {
    setNumFilterMin('');
    setNumFilterMax('');
    setSelectedCategories([]);
    if (numericCols.length > 0) {
      setXCol(numericCols[0]);
      if (numericCols.length > 1) setYCol(numericCols[1]);
      setChartType('scatter');
    }
    setGroupByCol('');
  };

  // Handle SVG export for a given svg element or studio
  const handleExportChartSVG = (targetRef, filename = 'chart') => {
    const svgElem = targetRef?.querySelector('svg');
    if (!svgElem) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElem);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeDataset) {
    return (
      <div className="white-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <BarChart3 size={28} color="#64748b" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>No Active Dataset Selected</h3>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
          Select or upload a CSV, Excel, or JSON dataset to access dynamic visualizations, statistical distributions, and automated insights.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ========================================================
          1. HEADER WITH TARGET SELECTOR & SUB-NAVIGATION TABS
         ======================================================== */}
      <div className="white-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4f46e5', background: '#eef2ff', padding: '3px 8px', borderRadius: '4px' }}>
                Visualization & Insights
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Dataset: <strong>{activeDataset.name}</strong> ({activeDataset.row_count?.toLocaleString()} rows)
              </span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Visual Analytics & Top Statistical Insights
            </h1>
          </div>

          {/* Target column selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Target Column:</span>
            <select
              value={targetColumn || ''}
              onChange={(e) => setTargetColumn(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                color: targetColumn ? '#4f46e5' : '#64748b',
                background: targetColumn ? '#f5f3ff' : '#fff',
                outline: 'none',
                minWidth: '170px',
              }}
            >
              <option value="">-- Auto-Detected Target --</option>
              {allCols.map((c) => (
                <option key={c} value={c}>
                  {c} {numericCols.includes(c) ? '(Numeric)' : '(Categorical)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-navigation Pills */}
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', flexWrap: 'wrap' }}>
          {[
            { id: 'showcase', label: 'Top 5 Curated Visualizations', icon: Sparkles },
            { id: 'studio', label: 'Interactive Chart Studio', icon: BarChart3 },
            { id: 'profiler', label: 'Feature Distribution Profiler', icon: Sliders },
            { id: 'model', label: 'Model Explainability (ML)', icon: Brain },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#4f46e5' : '#64748b',
                  background: active ? '#eef2ff' : 'transparent',
                  border: active ? '1px solid #c7d2fe' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} color={active ? '#4f46e5' : '#64748b'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          SUB-TAB: TOP 5 CURATED VISUALIZATIONS SHOWCASE
         ======================================================== */}
      {subTab === 'showcase' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loadingTopCharts ? (
            <div className="white-card" style={{ padding: '80px 24px', textAlign: 'center' }}>
              <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Curating Top 5 Visualizations</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Computing empirical Pearson correlations, continuous distributions, group spreads, and feature relationships...
              </p>
            </div>
          ) : topChartsError ? (
            <div className="white-card" style={{ padding: '40px 24px', textAlign: 'center', color: '#ef4444' }}>
              <AlertTriangle size={36} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700 }}>{topChartsError}</div>
              <button onClick={loadTopCharts} className="action-btn" style={{ marginTop: '14px' }}>Retry</button>
            </div>
          ) : topCharts.length === 0 ? (
            <div className="white-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <p style={{ color: '#64748b' }}>No charts could be curated for this dataset format.</p>
            </div>
          ) : (
            <>
              {/* TOP ROW: 2 Primary Highlights (Scatter Trendline + Histogram KDE) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
                {topCharts.slice(0, 2).map((item) => (
                  <ShowcaseChartCard
                    key={item.id}
                    item={item}
                    onCustomize={() => handleCustomizeChart(item.chart_data)}
                    setTooltip={setTooltip}
                    onExport={(ref) => handleExportChartSVG(ref, item.headline)}
                  />
                ))}
              </div>

              {/* BOTTOM ROW: 3 Multi-dimensional Insights (Boxplot, Bar Chart, Heatmap) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                {topCharts.slice(2).map((item) => (
                  <ShowcaseChartCard
                    key={item.id}
                    item={item}
                    compact={true}
                    onCustomize={() => handleCustomizeChart(item.chart_data)}
                    setTooltip={setTooltip}
                    onExport={(ref) => handleExportChartSVG(ref, item.headline)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Global Tooltip for Showcase */}
          {tooltip.visible && (
            <div
              style={{
                position: 'fixed',
                left: `${tooltip.x + 15}px`,
                top: `${tooltip.y - 15}px`,
                background: 'rgba(15, 23, 42, 0.94)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                pointerEvents: 'none',
                zIndex: 9999,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                whiteSpace: 'pre-line',
                lineHeight: 1.4,
              }}
            >
              {tooltip.content}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB: INTERACTIVE CHART STUDIO
         ======================================================== */}
      {subTab === 'studio' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Controls Panel */}
          <div className="white-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                <Sliders size={16} color="#4f46e5" /> Chart Studio Controls
              </div>
              <button
                onClick={handleResetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Reset all selections"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            {/* Chart Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <optgroup label="Numerical Distributions">
                  <option value="histogram">Histogram (with Frequency Curve)</option>
                  <option value="boxplot">Box & Whisker Plot</option>
                </optgroup>
                <optgroup label="Feature Relationships">
                  <option value="scatter">Scatter Plot (with Linear Trendline)</option>
                  <option value="correlation_heatmap">Correlation Heatmap Matrix</option>
                  <option value="bar">Bar Chart / Category Frequencies</option>
                  <option value="stacked_bar">Stacked Bar Chart (Cross-tabulation)</option>
                  <option value="line">Line Chart (Ordered / Time Series)</option>
                </optgroup>
              </select>
            </div>

            {/* X-Axis Selector */}
            {chartType !== 'correlation_heatmap' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  X-Axis Variable {['histogram', 'boxplot'].includes(chartType) ? '(Numerical Feature)' : ''}
                </label>
                <select
                  value={xCol}
                  onChange={(e) => setXCol(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  {allCols.map((col) => {
                    const isNum = numericCols.includes(col);
                    return (
                      <option key={col} value={col}>
                        {col} [{isNum ? 'NUM' : 'CAT'}]
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Y-Axis Selector (Scatter, Line, Aggregated Bar) */}
            {['scatter', 'line', 'bar'].includes(chartType) && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Y-Axis Variable {chartType === 'bar' ? '(Optional Aggregation Target)' : '(Required Numeric Feature)'}
                </label>
                <select
                  value={yCol}
                  onChange={(e) => setYCol(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  <option value="">{chartType === 'bar' ? '-- None (Count Frequency) --' : '-- Select Y Variable --'}</option>
                  {numericCols.map((col) => (
                    <option key={col} value={col}>
                      {col} [NUM]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Color / Group-by Column (Scatter, Boxplot, Stacked Bar) */}
            {['scatter', 'boxplot', 'stacked_bar'].includes(chartType) && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Group / Color Variable (Categorical)
                </label>
                <select
                  value={groupByCol}
                  onChange={(e) => setGroupByCol(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  <option value="">-- None (Single Group) --</option>
                  {categoricalCols.map((col) => (
                    <option key={col} value={col}>
                      {col} [CAT]
                    </option>
                  ))}
                  {targetColumn && !categoricalCols.includes(targetColumn) && (
                    <option value={targetColumn}>{targetColumn} (Target)</option>
                  )}
                </select>
              </div>
            )}

            {/* Aggregation Selector (For Bar Charts with Y-axis) */}
            {chartType === 'bar' && yCol && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Aggregation Function
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {['count', 'mean', 'median', 'sum'].map((agg) => (
                    <button
                      key={agg}
                      onClick={() => setAggregation(agg)}
                      style={{
                        padding: '6px 4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: aggregation === agg ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                        background: aggregation === agg ? '#eef2ff' : '#fff',
                        color: aggregation === agg ? '#4f46e5' : '#64748b',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {agg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Correlation Heatmap Toggle (Pearson vs Spearman) */}
            {chartType === 'correlation_heatmap' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Correlation Method
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'pearson', label: 'Pearson (Linear)' },
                    { id: 'spearman', label: 'Spearman (Rank)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setCorrMethod(m.id)}
                      style={{
                        flex: 1,
                        padding: '7px 8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: corrMethod === m.id ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                        background: corrMethod === m.id ? '#eef2ff' : '#fff',
                        color: corrMethod === m.id ? '#4f46e5' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Range / Category Filtering */}
            {chartType !== 'correlation_heatmap' && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  <Filter size={13} /> Filter {xCol} Range
                </div>
                {numericCols.includes(xCol) ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Min"
                      value={numFilterMin}
                      onChange={(e) => setNumFilterMin(e.target.value)}
                      style={{ width: '50%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={numFilterMax}
                      onChange={(e) => setNumFilterMax(e.target.value)}
                      style={{ width: '50%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Showing top 15 categories for clean visual scannability.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chart Canvas Area */}
          <div className="white-card" style={{ padding: '24px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  {chartData?.title || 'Interactive Chart View'}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{chartData?.sampled ? 'Sampled up to 800 points for smooth interactivity' : `Total points: ${chartData?.total_points || 0}`}</span>
                  <span style={{ color: '#94a3b8' }}>•</span>
                  <span>Calculated from live dataset</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleExportChartSVG(chartContainerRef.current, chartData?.title)}
                  className="secondary-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                  title="Export Chart as SVG"
                >
                  <Download size={13} /> Export SVG
                </button>
              </div>
            </div>

            {/* Statistical summary bar */}
            {chartData && (
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                {chartType === 'scatter' && chartData.data?.trendline && (
                  <>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Equation:</span>
                      <strong style={{ fontSize: '13px', marginLeft: '6px', color: '#4f46e5' }}>{chartData.data.trendline.equation}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Pearson r:</span>
                      <strong style={{ fontSize: '13px', marginLeft: '6px', color: '#0f172a' }}>{chartData.data.trendline.pearson_r}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>R²:</span>
                      <strong style={{ fontSize: '13px', marginLeft: '6px', color: '#0f172a' }}>{chartData.data.trendline.r2}</strong>
                    </div>
                  </>
                )}

                {chartType === 'histogram' && chartData.data?.stats && (
                  <>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Mean:</span>
                      <strong style={{ fontSize: '13px', marginLeft: '6px' }}>{chartData.data.stats.mean}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Median:</span>
                      <strong style={{ fontSize: '13px', marginLeft: '6px' }}>{chartData.data.stats.median}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Range:</span>
                      <strong style={{ fontSize: '13px', marginLeft: '6px' }}>[{chartData.data.stats.min} – {chartData.data.stats.max}]</strong>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Chart Render Canvas */}
            <div
              ref={chartContainerRef}
              style={{
                flex: 1,
                position: 'relative',
                minHeight: '380px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loadingChart ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Calculating statistics & generating chart...</span>
                </div>
              ) : chartError ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#ef4444' }}>
                  <AlertTriangle size={32} style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 600 }}>{chartError}</div>
                </div>
              ) : chartData ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                  <RenderChartSVG
                    chartType={chartType}
                    chartData={chartData}
                    corrMethod={corrMethod}
                    setTooltip={setTooltip}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB: FEATURE DISTRIBUTION PROFILER
         ======================================================== */}
      {subTab === 'profiler' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="white-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                  Detailed Column Distribution Profiler
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Inspect exact statistical moments, quartiles, IQR outliers, and frequency breakdowns for any feature.
                </p>
              </div>

              {/* Column picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Select Feature:</span>
                <select
                  value={profilerCol}
                  onChange={(e) => setProfilerCol(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, background: '#fff' }}
                >
                  {allCols.map((c) => (
                    <option key={c} value={c}>
                      {c} {numericCols.includes(c) ? '(Numeric)' : '(Categorical)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {colProfilesMap[profilerCol] && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{profilerCol}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: numericCols.includes(profilerCol) ? '#e0e7ff' : '#f1f5f9', color: numericCols.includes(profilerCol) ? '#4338ca' : '#475569' }}>
                      {colProfilesMap[profilerCol].type.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Missing: <strong>{colProfilesMap[profilerCol].missing_count}</strong> ({colProfilesMap[profilerCol].missing_percentage}%) | Unique: <strong>{colProfilesMap[profilerCol].unique_count}</strong>
                  </div>
                </div>

                {numericCols.includes(profilerCol) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Mean', val: colProfilesMap[profilerCol].mean ?? 'N/A' },
                      { label: 'Median', val: colProfilesMap[profilerCol].median ?? 'N/A' },
                      { label: 'Std Dev', val: colProfilesMap[profilerCol].std ?? 'N/A' },
                      { label: 'Min', val: colProfilesMap[profilerCol].min ?? 'N/A' },
                      { label: 'Q1 (25%)', val: colProfilesMap[profilerCol].q1 ?? 'N/A' },
                      { label: 'Q3 (75%)', val: colProfilesMap[profilerCol].q3 ?? 'N/A' },
                      { label: 'Max', val: colProfilesMap[profilerCol].max ?? 'N/A' },
                      { label: 'Outliers (1.5x IQR)', val: colProfilesMap[profilerCol].outliers_count ?? 0 },
                    ].map((st, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>{st.label}</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{st.val}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setSubTab('studio');
                      setXCol(profilerCol);
                      setChartType(numericCols.includes(profilerCol) ? 'histogram' : 'bar');
                    }}
                    style={{
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    Open in Chart Studio <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB: MODEL EXPLAINABILITY & FEATURE IMPORTANCE
         ======================================================== */}
      {subTab === 'model' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="white-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Machine Learning Feature Importance & Explainability
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              Compares bivariate correlations with multi-variable model feature importance.
            </p>

            {automlResult ? (
              <div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Trained Model:</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#4f46e5' }}>{automlResult.best_model_name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Target Feature:</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{automlResult.target_column}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Evaluation Metric ({automlResult.metric_name}):</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>{automlResult.best_score}</div>
                  </div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
                    <strong>Correlation vs. Feature Importance vs. Causation:</strong>
                    <br />
                    Model feature importance reflects mathematical predictor weights across the multivariable feature space. Neither correlation nor feature importance proves causation.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                <Brain size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>No Trained AutoML Model in Current Session</h4>
                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '460px', margin: '0 auto 16px' }}>
                  The visualization engine operates dynamically on pure dataset statistics. To compare empirical correlations against multi-variable machine learning feature importance, train a model in the AutoML Studio.
                </p>
                {onSwitchTab && (
                  <button
                    onClick={() => onSwitchTab('train')}
                    style={{
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Go to AutoML Studio
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// SHOWCASE CHART CARD COMPONENT
// Beautifully frames an automated chart with its statistical takeaway
// =====================================================================
function ShowcaseChartCard({ item, compact = false, onCustomize, setTooltip, onExport }) {
  const cardRef = useRef(null);
  const chartData = item.chart_data;

  return (
    <div
      ref={cardRef}
      className="white-card"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
        background: '#ffffff',
      }}
    >
      <div>
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '12px',
              background: '#eef2ff',
              color: '#4338ca',
            }}
          >
            {item.badge}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={onCustomize}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Open and tweak in Chart Studio"
            >
              <Sliders size={12} /> Studio
            </button>
            <button
              onClick={() => onExport(cardRef.current)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
              }}
              title="Export as SVG"
            >
              <Download size={13} />
            </button>
          </div>
        </div>

        {/* Headline */}
        <h3 style={{ fontSize: compact ? '15px' : '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
          {item.headline}
        </h3>
      </div>

      {/* SVG Chart Render */}
      <div
        style={{
          width: '100%',
          minHeight: compact ? '260px' : '310px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid #f1f5f9',
        }}
      >
        <RenderChartSVG
          chartType={chartData.chart_type}
          chartData={chartData}
          corrMethod="pearson"
          setTooltip={setTooltip}
          responsiveWidth={compact ? 420 : 540}
          responsiveHeight={compact ? 240 : 280}
        />
      </div>
    </div>
  );
}

// =====================================================================
// PURE INTERACTIVE SVG CHART ENGINE
// Renders responsive, fast, zero-dependency SVG charts with hover tooltips
// =====================================================================
function RenderChartSVG({ chartType, chartData, corrMethod = 'pearson', setTooltip, responsiveWidth = 580, responsiveHeight = 320 }) {
  const width = responsiveWidth;
  const height = responsiveHeight;
  const margin = { top: 15, right: 25, bottom: 45, left: 55 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // 1. HISTOGRAM + KDE CURVE
  if (chartType === 'histogram') {
    const bins = chartData.data?.bins || [];
    const kde = chartData.data?.density_curve || [];
    if (bins.length === 0) return <div style={{ color: '#64748b' }}>No numeric data available to bin.</div>;

    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    const barW = innerW / bins.length;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = innerH * (1 - ratio);
            const val = Math.round(maxCount * ratio);
            return (
              <g key={ratio}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val}</text>
              </g>
            );
          })}

          {/* Histogram Bars */}
          {bins.map((b, i) => {
            const barH = (b.count / maxCount) * innerH;
            const x = i * barW;
            const y = innerH - barH;
            return (
              <rect
                key={i}
                x={x + 1}
                y={y}
                width={Math.max(barW - 2, 1)}
                height={barH}
                fill="#4f46e5"
                rx="2"
                style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
                onMouseEnter={(e) => {
                  e.currentTarget.setAttribute('fill', '#4338ca');
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    content: `Range: ${b.bin_label}\nCount: ${b.count}\nPercentage: ${b.percentage}%`,
                  });
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.setAttribute('fill', '#4f46e5');
                  setTooltip({ visible: false, x: 0, y: 0, content: null });
                }}
              />
            );
          })}

          {/* Density Curve if present */}
          {kde.length > 2 && (
            <path
              d={kde.reduce((acc, pt, idx) => {
                const xVal = ((pt.x - chartData.data.stats.min) / (chartData.data.stats.max - chartData.data.stats.min || 1)) * innerW;
                const maxDensity = Math.max(...kde.map((p) => p.y), 0.0001);
                const yVal = innerH - (pt.y / maxDensity) * (innerH * 0.85);
                return `${acc} ${idx === 0 ? 'M' : 'L'} ${xVal} ${yVal}`;
              }, '')}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
          )}

          {/* Axes */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />

          {/* X Axis Labels */}
          {[0, Math.floor(bins.length / 2), bins.length - 1].map((idx) => {
            if (!bins[idx]) return null;
            const x = idx * barW + barW / 2;
            return (
              <text key={idx} x={x} y={innerH + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                {bins[idx].bin_start}
              </text>
            );
          })}

          <text x={innerW / 2} y={innerH + 34} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            {chartData.x_label}
          </text>
          <text transform="rotate(-90)" x={-innerH / 2} y={-38} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            Frequency
          </text>
        </g>
      </svg>
    );
  }

  // 2. SCATTER PLOT WITH TRENDLINE
  if (chartType === 'scatter') {
    const points = chartData.data?.points || [];
    const trendline = chartData.data?.trendline;
    const xStats = chartData.data?.x_stats || { min: 0, max: 100 };
    const yStats = chartData.data?.y_stats || { min: 0, max: 100 };

    const xRange = xStats.max - xStats.min || 1;
    const yRange = yStats.max - yStats.min || 1;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((r) => {
            const y = innerH * (1 - r);
            const val = (yStats.min + yRange * r).toFixed(1);
            return (
              <g key={r}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val}</text>
              </g>
            );
          })}

          {/* Scatter Points */}
          {points.map((pt, i) => {
            const cx = ((pt.x - xStats.min) / xRange) * innerW;
            const cy = innerH - ((pt.y - yStats.min) / yRange) * innerH;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="3"
                fill="#4f46e5"
                fillOpacity="0.6"
                stroke="#fff"
                strokeWidth="0.5"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    content: `${chartData.x_label}: ${pt.x}\n${chartData.y_label}: ${pt.y}${pt.group ? `\nGroup: ${pt.group}` : ''}`,
                  });
                }}
                onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
              />
            );
          })}

          {/* Trendline */}
          {trendline && (
            <line
              x1={0}
              y1={innerH - (((trendline.slope * xStats.min + trendline.intercept) - yStats.min) / yRange) * innerH}
              x2={innerW}
              y2={innerH - (((trendline.slope * xStats.max + trendline.intercept) - yStats.min) / yRange) * innerH}
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
          )}

          {/* Axes */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />

          {/* X Ticks */}
          {[0, 0.5, 1].map((r) => {
            const x = innerW * r;
            const val = (xStats.min + xRange * r).toFixed(1);
            return (
              <text key={r} x={x} y={innerH + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                {val}
              </text>
            );
          })}

          <text x={innerW / 2} y={innerH + 34} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            {chartData.x_label}
          </text>
          <text transform="rotate(-90)" x={-innerH / 2} y={-38} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            {chartData.y_label}
          </text>
        </g>
      </svg>
    );
  }

  // 3. BOX PLOT
  if (chartType === 'boxplot') {
    const groups = chartData.data?.groups || [];
    if (groups.length === 0) return <div style={{ color: '#64748b' }}>No boxplot data available.</div>;

    const allMins = groups.map((g) => g.min);
    const allMaxs = groups.map((g) => g.max);
    const globalMin = Math.min(...allMins);
    const globalMax = Math.max(...allMaxs);
    const range = globalMax - globalMin || 1;

    const slotW = innerW / groups.length;
    const boxW = Math.min(42, slotW * 0.6);

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((r) => {
            const y = innerH * (1 - r);
            const val = (globalMin + range * r).toFixed(1);
            return (
              <g key={r}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val}</text>
              </g>
            );
          })}

          {/* Boxes */}
          {groups.map((g, idx) => {
            const cx = idx * slotW + slotW / 2;
            const yQ1 = innerH - ((g.q1 - globalMin) / range) * innerH;
            const yQ3 = innerH - ((g.q3 - globalMin) / range) * innerH;
            const yMed = innerH - ((g.median - globalMin) / range) * innerH;
            const yLow = innerH - ((g.whisker_low - globalMin) / range) * innerH;
            const yHigh = innerH - ((g.whisker_high - globalMin) / range) * innerH;

            return (
              <g
                key={idx}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    content: `Group: ${g.group}\nMedian: ${g.median}\nQ1: ${g.q1} | Q3: ${g.q3}\nWhiskers: [${g.whisker_low} – ${g.whisker_high}]\nCount: ${g.count}`,
                  });
                }}
                onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
              >
                {/* Whisker Line */}
                <line x1={cx} y1={yLow} x2={cx} y2={yHigh} stroke="#64748b" strokeWidth="1.5" />
                <line x1={cx - boxW / 4} y1={yLow} x2={cx + boxW / 4} y2={yLow} stroke="#64748b" strokeWidth="1.5" />
                <line x1={cx - boxW / 4} y1={yHigh} x2={cx + boxW / 4} y2={yHigh} stroke="#64748b" strokeWidth="1.5" />

                {/* Box Q1 - Q3 */}
                <rect
                  x={cx - boxW / 2}
                  y={yQ3}
                  width={boxW}
                  height={Math.max(1, yQ1 - yQ3)}
                  fill="#e0e7ff"
                  stroke="#4f46e5"
                  strokeWidth="1.5"
                  rx="3"
                />

                {/* Median Line */}
                <line x1={cx - boxW / 2} y1={yMed} x2={cx + boxW / 2} y2={yMed} stroke="#4338ca" strokeWidth="2.5" />

                {/* Outlier Dots */}
                {g.outliers?.slice(0, 15).map((outVal, oIdx) => {
                  const outY = innerH - ((outVal - globalMin) / range) * innerH;
                  return (
                    <circle key={oIdx} cx={cx} cy={outY} r="2.5" fill="#ef4444" fillOpacity="0.8" />
                  );
                })}

                {/* Group label */}
                <text x={cx} y={innerH + 16} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="600">
                  {g.group.length > 8 ? g.group.substring(0, 7) + '..' : g.group}
                </text>
              </g>
            );
          })}

          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />

          <text x={innerW / 2} y={innerH + 34} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            {chartData.x_label}
          </text>
        </g>
      </svg>
    );
  }

  // 4. CORRELATION HEATMAP MATRIX
  if (chartType === 'correlation_heatmap') {
    const cols = chartData.data?.columns || [];
    const matrix = corrMethod === 'spearman' ? chartData.data?.spearman_matrix : chartData.data?.pearson_matrix;
    if (!matrix || cols.length === 0) return <div style={{ color: '#64748b' }}>Heatmap data not available.</div>;

    const cellSize = Math.min(innerW / cols.length, innerH / cols.length, 30);

    const getCorrColor = (val) => {
      if (val > 0) {
        const alpha = Math.min(Math.abs(val), 1);
        return `rgba(79, 70, 229, ${alpha * 0.9 + 0.1})`;
      } else {
        const alpha = Math.min(Math.abs(val), 1);
        return `rgba(239, 68, 68, ${alpha * 0.9 + 0.1})`;
      }
    };

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <g transform={`translate(${margin.left + 10},${margin.top})`}>
          {matrix.map((row, rIdx) =>
            row.map((val, cIdx) => {
              const x = cIdx * cellSize;
              const y = rIdx * cellSize;
              const colA = cols[rIdx];
              const colB = cols[cIdx];
              return (
                <g
                  key={`${rIdx}-${cIdx}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    setTooltip({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      content: `${colA} & ${colB}\nPearson r: ${val > 0 ? `+${val}` : val}`,
                    });
                  }}
                  onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
                >
                  <rect
                    x={x}
                    y={y}
                    width={cellSize - 1}
                    height={cellSize - 1}
                    fill={getCorrColor(val)}
                    rx="2"
                  />
                  {cellSize > 20 && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 3}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="600"
                      fill={Math.abs(val) > 0.45 ? '#fff' : '#1e293b'}
                    >
                      {val.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Labels on Y axis */}
          {cols.map((col, idx) => (
            <text
              key={idx}
              x={-6}
              y={idx * cellSize + cellSize / 2 + 3.5}
              textAnchor="end"
              fontSize="9"
              fontWeight="500"
              fill="#475569"
            >
              {col.length > 8 ? col.substring(0, 7) + '..' : col}
            </text>
          ))}

          {/* Labels on X axis */}
          {cols.map((col, idx) => (
            <text
              key={idx}
              transform={`rotate(-45, ${idx * cellSize + cellSize / 2}, ${cols.length * cellSize + 8})`}
              x={idx * cellSize + cellSize / 2}
              y={cols.length * cellSize + 12}
              textAnchor="end"
              fontSize="9"
              fontWeight="500"
              fill="#475569"
            >
              {col.length > 8 ? col.substring(0, 7) + '..' : col}
            </text>
          ))}
        </g>
      </svg>
    );
  }

  // 5. BAR CHART / FREQUENCY
  if (chartType === 'bar' || chartType === 'count') {
    const cats = chartData.data?.categories || [];
    if (cats.length === 0) return <div style={{ color: '#64748b' }}>No category data available.</div>;

    const isAgg = chartData.data?.is_aggregated;
    const maxVal = Math.max(...cats.map((c) => (isAgg ? c.value : c.count)), 1);
    const barW = innerW / cats.length;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((r) => {
            const y = innerH * (1 - r);
            const val = Math.round(maxVal * r);
            return (
              <g key={r}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{val}</text>
              </g>
            );
          })}

          {cats.map((c, i) => {
            const metric = isAgg ? c.value : c.count;
            const barH = (metric / maxVal) * innerH;
            const x = i * barW;
            const y = innerH - barH;
            return (
              <rect
                key={i}
                x={x + 3}
                y={y}
                width={Math.max(barW - 6, 2)}
                height={barH}
                fill="#4f46e5"
                rx="3"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    content: `${c.label}\n${isAgg ? `Value: ${metric}` : `Count: ${metric} (${c.percentage}%)`}`,
                  });
                }}
                onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: null })}
              />
            );
          })}

          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Labels */}
          {cats.map((c, idx) => {
            const x = idx * barW + barW / 2;
            return (
              <text
                key={idx}
                x={x}
                y={innerH + 16}
                textAnchor="middle"
                fontSize="9.5"
                fill="#475569"
                fontWeight="500"
              >
                {c.label.length > 7 ? c.label.substring(0, 6) + '..' : c.label}
              </text>
            );
          })}

          <text x={innerW / 2} y={innerH + 34} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            {chartData.x_label}
          </text>
          <text transform="rotate(-90)" x={-innerH / 2} y={-38} textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            Count
          </text>
        </g>
      </svg>
    );
  }

  return <div style={{ color: '#64748b' }}>Select parameters to render chart.</div>;
}
