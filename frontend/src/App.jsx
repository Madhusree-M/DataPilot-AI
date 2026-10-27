import React, { useState, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  BarChart3,
  Wand2,
  Brain,
  MessageSquare,
  FileText,
  Table,
  CheckCircle2,
  Check,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
  Send,
  Download,
  ExternalLink,
  Home,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sliders,
  TrendingUp,
  Bookmark,
  Layers,
  X,
  PieChart,
  Settings,
} from 'lucide-react';
import { api } from './services/api';
import ToyMascot from './components/ToyMascot';
import DataPilotLogo from './components/DataPilotLogo';
import VisualizationView from './components/VisualizationView';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function App() {
  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);
  const [activeTab, setActiveTab] = useState('insights'); // 'insights', 'clean', 'train', 'report', 'table'

  // Global loading states
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Insights / EDA state
  const [edaData, setEdaData] = useState(null);
  const [loadingEDA, setLoadingEDA] = useState(false);
  const [selectedProfileCol, setSelectedProfileCol] = useState(null);

  // Cleaning state
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState(null);
  const [cleanedSuccess, setCleanedSuccess] = useState(false);

  // AutoML Training & Live Predict
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState('classification'); // 'classification' or 'regression'
  const [selectedModels, setSelectedModels] = useState(['rf', 'gb', 'lr', 'dt', 'et', 'knn']);
  const [training, setTraining] = useState(false);
  const [automlResult, setAutomlResult] = useState(null);
  const [predictInputs, setPredictInputs] = useState({});
  const [predicting, setPredicting] = useState(false);
  const [predictionOutput, setPredictionOutput] = useState(null);

  // Floating AI Chat state (bottom right widget)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  // Table state
  const [previewData, setPreviewData] = useState(null);
  const [tablePage, setTablePage] = useState(1);

  // 1. Fetch available datasets
  const loadDatasets = async (autoSelectId = null) => {
    try {
      setLoadingDatasets(true);
      const list = await api.getDatasets();
      setDatasets(list);
      if (autoSelectId) {
        const found = list.find((d) => d.id === autoSelectId);
        if (found) selectDataset(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // 2. Select active dataset
  const selectDataset = async (dataset) => {
    setActiveDataset(dataset);
    setActiveTab('insights');
    setCleanResult(null);
    setAutomlResult(null);
    setPredictionOutput(null);
    setReportResult(null);
    setTablePage(1);
    setSelectedProfileCol(null);

    // Reset targetColumn so user explicitly chooses their label
    setTargetColumn('');

    setChatMessages([
      {
        role: 'assistant',
        content: `I've loaded **${dataset.name}** (${dataset.row_count} rows, ${dataset.col_count} columns). Ask me anything about distributions, missing values, or feature relationships!`,
      },
    ]);

    // Fetch EDA
    try {
      setLoadingEDA(true);
      const eda = await api.getEDA(dataset.id);
      setEdaData(eda);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEDA(false);
    }

    // Fetch initial table preview
    try {
      const prev = await api.getDatasetPreview(dataset.id, 1, 20);
      setPreviewData(prev);
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Upload File
  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const newDataset = await api.uploadDataset(file);
      await loadDatasets();
      selectDataset(newDataset);
    } catch (err) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  // 4. One-Click Clean
  const handleAutoClean = async () => {
    if (!activeDataset) return;
    setCleaning(true);
    try {
      const res = await api.cleanDataset({
        dataset_id: activeDataset.id,
        impute_numeric: 'median',
        impute_categorical: 'mode',
        drop_duplicates: true,
        outlier_strategy: 'clip',
        drop_columns: [],
        scale_numeric: 'none',
        encode_categorical: 'none',
      });
      setCleanResult(res);
      await loadDatasets(res.cleaned_dataset_id);
      setCleanedSuccess(true);
      setTimeout(() => {
        setCleanedSuccess(false);
        setActiveTab('insights');
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  // 5. Model Selection Definitions & Handlers
  const classificationModels = [
    { id: 'rf', name: 'Random Forest', tag: 'Ensemble Bagging' },
    { id: 'gb', name: 'Gradient Boosting', tag: 'Sequential Boosting' },
    { id: 'lr', name: 'Logistic Regression', tag: 'Linear Regularized' },
    { id: 'et', name: 'Extra Trees', tag: 'Randomized Ensemble' },
    { id: 'dt', name: 'Decision Tree', tag: 'Rule-Based Partition' },
    { id: 'knn', name: 'K-Nearest Neighbors', tag: 'Distance-Based' },
  ];

  const regressionModels = [
    { id: 'linear', name: 'Linear Regression', tag: 'Ordinary Least Squares' },
    { id: 'ridge', name: 'Ridge Regression', tag: 'L2 Linear Regularized' },
    { id: 'gb', name: 'Gradient Boosting Regressor', tag: 'Sequential Boosting' },
    { id: 'rf', name: 'Random Forest Regressor', tag: 'Ensemble Bagging' },
    { id: 'dt', name: 'Decision Tree Regressor', tag: 'Rule-Based Partition' },
    { id: 'knn', name: 'K-Neighbors Regressor', tag: 'Distance-Based' },
  ];

  const handleTargetColumnChange = (col) => {
    setTargetColumn(col);
    setAutomlResult(null);
    setPredictionOutput(null);
    if (!col) return;

    if (edaData && edaData.column_profiles) {
      const profile = edaData.column_profiles.find((p) => p.name === col);
      if (profile) {
        if (profile.data_type === 'numeric' && profile.unique_count > 10) {
          setTaskType('regression');
          setSelectedModels(['linear', 'ridge', 'gb', 'rf', 'dt', 'knn']);
        } else {
          setTaskType('classification');
          setSelectedModels(['rf', 'gb', 'lr', 'et', 'dt', 'knn']);
        }
      }
    }
  };

  const handleSelectTaskType = (type) => {
    setTaskType(type);
    if (type === 'classification') {
      setSelectedModels(['rf', 'gb', 'lr', 'et', 'dt', 'knn']);
    } else {
      setSelectedModels(['linear', 'ridge', 'gb', 'rf', 'dt', 'knn']);
    }
    setAutomlResult(null);
  };

  const handleToggleModel = (modelId) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((m) => m !== modelId) : [...prev, modelId]
    );
  };

  const handleSelectAllModels = () => {
    if (taskType === 'classification') {
      setSelectedModels(['rf', 'gb', 'lr', 'et', 'dt', 'knn']);
    } else {
      setSelectedModels(['linear', 'ridge', 'gb', 'rf', 'dt', 'knn']);
    }
  };

  const handleClearModels = () => {
    setSelectedModels([]);
  };

  // 6. Train AutoML Models
  const handleTrainModels = async () => {
    if (!activeDataset || !targetColumn) return;
    if (selectedModels.length === 0) {
      alert('Please select at least one algorithm to train.');
      return;
    }
    setTraining(true);
    setPredictionOutput(null);
    try {
      const res = await api.trainAutoML({
        dataset_id: activeDataset.id,
        target_column: targetColumn,
        task_type: taskType,
        selected_models: selectedModels,
        test_size: 0.2,
      });
      setAutomlResult(res);

      // Pre-fill predictInputs with real training data sample from dataset
      const initialInputs = {};
      if (res.sample_record && Object.keys(res.sample_record).length > 0) {
        Object.assign(initialInputs, res.sample_record);
      } else if (previewData && previewData.rows && previewData.rows.length > 0) {
        const row0 = previewData.rows[0];
        res.features.forEach((feat) => {
          initialInputs[feat] = row0[feat] !== undefined && row0[feat] !== null ? String(row0[feat]) : '';
        });
      } else {
        res.features.forEach((feat) => {
          initialInputs[feat] = '';
        });
      }
      setPredictInputs(initialInputs);
    } catch (err) {
      console.error(err);
      alert(err.message || 'AutoML training failed');
    } finally {
      setTraining(false);
    }
  };

  // 7. Live Prediction
  const handleRunPredict = async (e) => {
    e.preventDefault();
    if (!automlResult) return;
    setPredicting(true);
    try {
      const res = await api.predict(automlResult.job_id, predictInputs);
      setPredictionOutput(res);
    } catch (err) {
      console.error(err);
    } finally {
      setPredicting(false);
    }
  };

  // 8. Chat
  const handleSendChat = async (prompt) => {
    const text = (prompt || chatInput).trim();
    if (!text || !activeDataset || chatLoading) return;
    setChatInput('');

    const newMsgs = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMsgs);
    setChatLoading(true);

    try {
      const res = await api.queryChat(activeDataset.id, text);
      setChatMessages([...newMsgs, { role: 'assistant', content: res.reply, chart: res.chart_suggestion }]);
    } catch (err) {
      setChatMessages([...newMsgs, { role: 'assistant', content: 'Unable to process question. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // 9. Generate Report
  const handleGenerateReport = async () => {
    if (!activeDataset) return;
    setGeneratingReport(true);
    try {
      const res = await api.generateReport(activeDataset.id, `Executive Audit - ${activeDataset.name}`, automlResult?.job_id);
      setReportResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Auto-generate report when entering Report tab if not already generated
  useEffect(() => {
    if (activeTab === 'report' && activeDataset && !reportResult && !generatingReport) {
      handleGenerateReport();
    }
  }, [activeTab, activeDataset, reportResult, generatingReport]);

  // 10. Table Page Change
  const handleTablePageChange = async (newPage) => {
    setTablePage(newPage);
    try {
      const prev = await api.getDatasetPreview(activeDataset.id, newPage, 20);
      setPreviewData(prev);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // VIEW 1: CLEAN WHITE UPLOAD LANDING SCREEN
  // ==========================================
  if (!activeDataset) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
          }
        }}
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 20px 60px 20px',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Animated Ambient Glowing Orbs */}
        <div className="landing-ambient-bg">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />
        </div>

        {/* Landing Page Header Navbar */}
        <div style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          position: 'relative',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DataPilotLogo size={36} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontWeight: 800, fontSize: '20px', color: '#0f172a', letterSpacing: '-0.02em' }}>DataPilot</span>
              <span style={{ fontWeight: 800, fontSize: '20px', color: '#4f46e5' }}>AI</span>
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                document.getElementById('about-datapilot')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn btn-secondary"
              style={{
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <HelpCircle size={15} color="#4f46e5" />
              Understand DataPilot AI
            </button>
          </div>
        </div>

        <div id="upload-section" style={{ maxWidth: '680px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 5, marginTop: '0px' }}>
          {/* Animated Toy Mascot asking for dataset */}
          <ToyMascot isDragging={isDragging} uploading={uploading} />

          {/* Title & Prompt */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#0f172a',
              marginBottom: '8px',
              lineHeight: 1.25,
            }}
          >
            {isDragging ? 'Drop it right here! 🎉' : 'Feed me a dataset to get started'}
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#64748b',
              marginBottom: '26px',
              maxWidth: '520px',
              marginInline: 'auto',
            }}
          >
            {isDragging
              ? 'Release to upload and unlock instant analysis, AutoML, and What-If simulations!'
              : 'Drop your CSV, Excel, or JSON file. I will clean it, find patterns, and train models automatically!'}
          </p>

          {uploadError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#991b1b',
                padding: '12px 18px',
                borderRadius: '12px',
                fontSize: '13.5px',
                marginBottom: '20px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
              }}
            >
              <AlertCircle size={18} color="#dc2626" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Interactive Playful Dropzone */}
          <div
            className={`playful-dropzone ${isDragging ? 'dragging' : ''}`}
            onClick={() => document.getElementById('file-upload-input').click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {/* Upload Icon & Spinner */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: isDragging ? '#4f46e5' : '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                transition: 'all 0.25s ease',
                boxShadow: isDragging
                  ? '0 8px 24px rgba(79, 70, 229, 0.35)'
                  : '0 4px 12px rgba(79, 70, 229, 0.1)',
              }}
            >
              {uploading ? (
                <div
                  className="animate-spin"
                  style={{
                    width: '26px',
                    height: '26px',
                    border: '3px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                <Upload
                  size={28}
                  color={isDragging ? '#ffffff' : '#4f46e5'}
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: isDragging ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                  }}
                />
              )}
            </div>

            <div
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '6px',
              }}
            >
              {uploading
                ? 'Crunching numbers and profiling dataset...'
                : isDragging
                  ? 'Release to feed DataPilot!'
                  : 'Click to browse or drop your dataset here'}
            </div>

            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '16px' }}>
              Drag and drop any tabular data file directly onto the screen
            </p>

            {/* File format badges */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                color: '#475569',
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#059669' }}>● CSV</span>
              <span>&bull;</span>
              <span style={{ color: '#2563eb' }}>● Excel (.xlsx, .xls)</span>
              <span>&bull;</span>
              <span style={{ color: '#d97706' }}>● JSON</span>
            </div>
          </div>

          {/* Sample Datasets: Quick Snacks */}
          {datasets.length > 0 && (
            <div style={{ marginTop: '4px', marginBottom: '32px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={13} color="#6366f1" /> Or feed me a sample dataset:
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: '10px',
                }}
              >
                {datasets.slice(0, 4).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDataset(d)}
                    className="snack-card"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#0f172a',
                          fontSize: '13px',
                          lineHeight: 1.3,
                          marginBottom: '4px',
                        }}
                      >
                        {d.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {d.row_count} rows &bull; {d.col_count} cols
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <span>Load data</span>
                      <ArrowRight size={11} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* =========================================
            ABOUT & HOW IT WORKS (WIDER & LARGER TYPOGRAPHY)
           ========================================= */}
        <div
          id="about-datapilot"
          style={{
            marginTop: '40px',
            marginBottom: '40px',
            width: '100%',
            maxWidth: '1200px',
            backgroundColor: '#090d16',
            borderRadius: '24px',
            border: '1px solid #1e293b',
            padding: '44px 40px',
            color: '#ffffff',
            boxShadow: '0 25px 60px -15px rgba(2, 6, 23, 0.5), 0 0 0 1px rgba(255,255,255,0.06)',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
            zIndex: 5,
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* About DataPilot Card */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '18px',
              padding: '30px 34px',
              marginBottom: '32px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <DataPilotLogo size={36} />
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>
                About DataPilot AI
              </h2>
            </div>
            <p style={{
              fontSize: '16px',
              color: '#cbd5e1',
              lineHeight: '1.8',
              margin: 0,
            }}>
              DataPilot AI is your go-to solution for seamless data preprocessing, automated exploratory data analysis, and supervised machine learning. Our tool automatically cleans and preprocesses your datasets, eliminating null variables and inconsistencies, ensuring your data is ready for exploratory data analysis (EDA) and model building. By simplifying the data preparation process, we empower users to focus on deriving insights and creating robust machine learning models without the hassle of manual data cleaning.
            </p>
          </div>

          {/* How It Works Section */}
          <div
            id="how-it-works"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '18px',
              padding: '32px 30px',
              textAlign: 'center',
            }}
          >
            <h3 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '32px',
              letterSpacing: '-0.01em',
            }}>
              How It Works
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '24px',
            }}>
              {/* Step 1 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Upload size={26} color="#38bdf8" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '17px', color: '#ffffff', marginBottom: '8px' }}>
                  Upload Your Data
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '240px' }}>
                  Easily upload your dataset or document in one click.
                </div>
              </div>

              {/* Step 2 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(52, 211, 153, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Settings size={26} color="#34d399" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '17px', color: '#ffffff', marginBottom: '8px' }}>
                  Automated Analysis
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '240px' }}>
                  Our model processes and analyzes your input automatically.
                </div>
              </div>

              {/* Step 3 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(167, 139, 250, 0.12)',
                  border: '1px solid rgba(167, 139, 250, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <BarChart3 size={26} color="#a78bfa" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '17px', color: '#ffffff', marginBottom: '8px' }}>
                  View Insights
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '240px' }}>
                  Get instant insights, visualizations, or predictions.
                </div>
              </div>

              {/* Step 4 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px',
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Download size={26} color="#fbbf24" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '17px', color: '#ffffff', marginBottom: '8px' }}>
                  Download Results
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '240px' }}>
                  Export your results for further use.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // VIEW 2: WHITE-BASED HUMAN-CRAFTED WORKSPACE
  // ==========================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar with Increased Height */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 32px',
        minHeight: '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
      }}>
        {/* Brand: Show only project name with unique DataPilotLogo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DataPilotLogo size={38} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 800, fontSize: '22px', color: '#0f172a', letterSpacing: '-0.02em' }}>DataPilot</span>
            <span style={{ fontWeight: 800, fontSize: '22px', color: '#4f46e5' }}>AI</span>
          </div>
        </div>

        {/* Dataset Meta & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '13px',
            maxWidth: '520px',
          }}>
            <Database size={15} color="#4f46e5" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activeDataset.name}>
              {activeDataset.name}
            </span>
            <span style={{ color: '#64748b', flexShrink: 0 }}>({activeDataset.row_count} rows, {activeDataset.col_count} columns)</span>
          </div>

          <a
            href={api.getDatasetDownloadUrl(activeDataset.id)}
            download={activeDataset.filename}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            Export CSV
          </a>

          <button
            onClick={() => setActiveDataset(null)}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Home size={14} />
            Home
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main style={{
        maxWidth: '1240px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 24px 60px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Simple Horizontal Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '2px',
        }}>
          {[
            { id: 'insights', label: 'Overview', icon: BarChart3 },
            { id: 'visualize', label: 'Visualizations', icon: PieChart },
            { id: 'clean', label: 'Clean Data', icon: Wand2 },
            { id: 'train', label: 'AutoML Models', icon: Brain },
            { id: 'report', label: 'Executive PDF Report', icon: FileText },
            { id: 'table', label: 'Spreadsheet Table', icon: Table },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-item ${isActive ? 'active' : ''}`}
                style={{
                  borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
                  borderRadius: '6px 6px 0 0',
                  padding: '10px 16px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Icon size={16} color={isActive ? '#4f46e5' : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* =========================================
            TAB 1: OVERVIEW & INSIGHTS
           ========================================= */}
        {activeTab === 'insights' && (
          <div className="white-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Data Health & Statistical Overview</h2>
              </div>
            </div>

            {loadingEDA ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
                <div className="animate-spin" style={{ width: '26px', height: '26px', border: '3px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', margin: '0 auto 10px auto' }} />
                Analyzing data characteristics...
              </div>
            ) : edaData ? (
              <div>
                {/* 5 Clean Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Data Health Score</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: edaData.health_score >= 80 ? '#059669' : '#d97706', marginTop: '4px' }}>
                      {edaData.health_score} / 100
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Records</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                      {edaData.row_count.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Features</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                      {edaData.col_count}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Missing / Null Cells</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: (edaData.missing_cells_count || 0) > 0 ? '#d97706' : '#059669', marginTop: '4px' }}>
                      {(edaData.missing_cells_count !== undefined ? edaData.missing_cells_count : 0).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: 'var(--shadow-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Duplicate Rows</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: edaData.duplicate_rows_count > 0 ? '#d97706' : '#059669', marginTop: '4px' }}>
                      {edaData.duplicate_rows_count}
                    </div>
                  </div>
                </div>

                {/* Visualizations Section: Missing Data, Feature Composition, and Correlation Engine */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {/* Visual 1: Missing & Null Distribution */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: 'var(--shadow-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} color="#d97706" />
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Missing & Null Values by Feature</span>
                      </div>
                      <span className="badge-tag tag-gray" style={{ fontSize: '11px' }}>
                        {edaData.columns_with_missing_count} of {edaData.col_count} columns
                      </span>
                    </div>

                    {edaData.columns_with_missing_count === 0 ? (
                      <div style={{ padding: '20px 16px', textAlign: 'center', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <CheckCircle2 size={24} color="#059669" style={{ margin: '0 auto 6px auto' }} />
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#065f46' }}>100% Complete Dataset</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {edaData.column_profiles.filter((c) => c.missing_count > 0).slice(0, 5).map((col) => (
                          <div key={col.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                              <span style={{ fontWeight: 600, color: '#334155' }}>{col.name}</span>
                              <span style={{ color: col.missing_percentage > 20 ? '#dc2626' : '#d97706', fontWeight: 700 }}>
                                {col.missing_count} ({col.missing_percentage}%)
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(col.missing_percentage, 100)}%`,
                                height: '100%',
                                backgroundColor: col.missing_percentage > 20 ? '#ef4444' : '#f59e0b',
                                borderRadius: '9999px',
                              }} />
                            </div>
                          </div>
                        ))}
                        {edaData.column_profiles.filter((c) => c.missing_count > 0).length > 5 && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>
                            Top 5 of {edaData.columns_with_missing_count} columns shown
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visual 2: Data Types & Feature Composition with SVG Pie Chart */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: 'var(--shadow-subtle)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PieChart size={16} color="#4f46e5" />
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Feature Type Composition</span>
                      </div>
                      <span className="badge-tag tag-indigo" style={{ fontSize: '11px' }}>
                        {edaData.col_count} Total Columns
                      </span>
                    </div>

                    {(() => {
                      const numCount = edaData.numeric_columns.length;
                      const catCount = edaData.categorical_columns.length;
                      const totalCount = edaData.col_count || (numCount + catCount) || 1;
                      const numPct = Math.round((numCount / totalCount) * 100);
                      const catPct = 100 - numPct;
                      const circ = 238.76; // 2 * PI * 38
                      const numStroke = (numCount / totalCount) * circ;
                      const catStroke = (catCount / totalCount) * circ;

                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flex: 1, padding: '4px 0' }}>
                          {/* SVG Donut / Pie */}
                          <div style={{ position: 'relative', width: '118px', height: '118px', flexShrink: 0, margin: '0 auto' }}>
                            <svg width="118" height="118" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="15" />
                              {numCount > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="transparent"
                                  stroke="#4f46e5"
                                  strokeWidth="15"
                                  strokeDasharray={`${numStroke} ${circ}`}
                                  strokeDashoffset="0"
                                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                />
                              )}
                              {catCount > 0 && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="transparent"
                                  stroke="#06b6d4"
                                  strokeWidth="15"
                                  strokeDasharray={`${catStroke} ${circ}`}
                                  strokeDashoffset={`${-numStroke}`}
                                  style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                                />
                              )}
                            </svg>
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'none',
                            }}>
                              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{edaData.col_count}</span>
                              <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>Columns</span>
                            </div>
                          </div>

                          {/* Legend Cards */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '130px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              borderLeft: '3px solid #4f46e5'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4f46e5', display: 'inline-block' }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Numeric</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#4f46e5' }}>{numCount}</span>
                                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>({numPct}%)</span>
                              </div>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              borderLeft: '3px solid #06b6d4'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4', display: 'inline-block' }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Categorical</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0891b2' }}>{catCount}</span>
                                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>({catPct}%)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Visual 3: Correlation Visualizer */}
                {edaData.top_correlations && edaData.top_correlations.length > 0 && (
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', marginBottom: '24px', boxShadow: 'var(--shadow-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={16} color="#4f46e5" />
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Top Feature Correlation Strengths (Pearson Engine)</span>
                      </div>
                      <span className="badge-tag tag-gray" style={{ fontSize: '11px' }}>Top Interactions</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                      {edaData.top_correlations.slice(0, 6).map((pair, idx) => {
                        const isPositive = pair.correlation >= 0;
                        const pct = Math.abs(pair.correlation) * 100;
                        return (
                          <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                                {pair.feature_a} <span style={{ color: '#94a3b8' }}>&harr;</span> {pair.feature_b}
                              </span>
                              <span style={{
                                fontSize: '11.5px',
                                fontWeight: 800,
                                color: isPositive ? '#4338ca' : '#0284c7',
                              }}>
                                {isPositive ? '+' : ''}{pair.correlation}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                backgroundColor: isPositive ? '#6366f1' : '#0ea5e9',
                                borderRadius: '9999px',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interactive Feature Deep Dive Visual Inspector */}
                {selectedProfileCol && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #4f46e5',
                    borderRadius: '10px',
                    padding: '18px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={16} color="#4f46e5" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          Visual Distribution Inspector: <code style={{ backgroundColor: '#eef2ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px' }}>{selectedProfileCol.name}</code>
                        </span>
                        <span className="badge-tag tag-indigo">{selectedProfileCol.inferred_type}</span>
                      </div>
                      <button
                        onClick={() => setSelectedProfileCol(null)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Numeric Histogram visualizer */}
                    {selectedProfileCol.histogram && selectedProfileCol.histogram.counts && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Histogram Distribution:</div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {selectedProfileCol.histogram.counts.map((cnt, hIdx) => {
                            const maxCount = Math.max(...selectedProfileCol.histogram.counts) || 1;
                            const barHeight = Math.max((cnt / maxCount) * 100, 6);
                            return (
                              <div
                                key={hIdx}
                                title={`Bin count: ${cnt}`}
                                style={{
                                  flex: 1,
                                  height: `${barHeight}%`,
                                  backgroundColor: '#6366f1',
                                  borderRadius: '2px',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top Values for categorical */}
                    {selectedProfileCol.top_values && selectedProfileCol.top_values.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Top Category Frequencies:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedProfileCol.top_values.slice(0, 4).map((tv, tvIdx) => (
                            <div key={tvIdx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '2px' }}>
                                <span style={{ color: '#334155', fontWeight: 600 }}>{String(tv.value)}</span>
                                <span style={{ color: '#64748b' }}>{tv.count} rows ({tv.percent}%)</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${tv.percent}%`, height: '100%', backgroundColor: '#06b6d4' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Column Table */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Column Profiles (Click any row to inspect distribution)</h3>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '10px 14px' }}>Column</th>
                        <th style={{ padding: '10px 14px' }}>Type</th>
                        <th style={{ padding: '10px 14px' }}>Missing</th>
                        <th style={{ padding: '10px 14px' }}>Unique</th>
                        <th style={{ padding: '10px 14px' }}>Mean / Mode</th>
                        <th style={{ padding: '10px 14px' }}>Outliers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {edaData.column_profiles.map((col) => {
                        const isSelected = selectedProfileCol?.name === col.name;
                        return (
                          <tr
                            key={col.name}
                            onClick={() => setSelectedProfileCol(isSelected ? null : col)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: isSelected ? '#4338ca' : '#0f172a' }}>
                              {col.name}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span className="badge-tag tag-gray">{col.inferred_type}</span>
                            </td>
                            <td style={{ padding: '10px 14px', color: col.missing_count > 0 ? '#d97706' : '#64748b' }}>
                              {col.missing_count} ({col.missing_percentage}%)
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{col.unique_count}</td>
                            <td style={{ padding: '10px 14px', color: '#0f172a' }}>
                              {col.mean !== null ? col.mean : (col.top_values?.[0]?.value ?? '-')}
                            </td>
                            <td style={{ padding: '10px 14px', color: col.outlier_count > 0 ? '#e11d48' : '#64748b' }}>
                              {col.outlier_count !== null ? col.outlier_count : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* =========================================
            TAB: VISUALIZATIONS & INSIGHTS STUDIO
           ========================================= */}
        {activeTab === 'visualize' && (
          <VisualizationView
            activeDataset={activeDataset}
            edaData={edaData}
            automlResult={automlResult}
            onSwitchTab={setActiveTab}
            targetColumn={targetColumn}
            setTargetColumn={setTargetColumn}
          />
        )}

        {/* =========================================
            TAB 2: CLEAN DATA
           ========================================= */}
        {activeTab === 'clean' && (
          <div className="white-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>1-Click Data Cleaning Studio</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Automatically fills empty values with medians and modes, and removes duplicate rows.
            </p>

            {cleanedSuccess ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: '#ecfdf5',
                border: '2px solid #10b981',
                borderRadius: '9999px',
                padding: '11px 26px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}>
                  <Check size={18} strokeWidth={3} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#065f46' }}>
                  Cleaned
                </span>
              </div>
            ) : (
              <button
                onClick={handleAutoClean}
                disabled={cleaning}
                className="btn btn-emerald"
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                {cleaning ? (
                  <>
                    <div className="animate-spin" style={{ width: '15px', height: '15px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                    Cleaning Dataset...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Auto-Clean Missing Values & Duplicates
                  </>
                )}
              </button>
            )}

            {cleanResult && (
              <div style={{
                marginTop: '24px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #10b981',
                borderRadius: '12px',
                padding: '22px',
                boxShadow: '0 4px 20px -2px rgba(16, 185, 129, 0.12)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#ecfdf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #a7f3d0'
                    }}>
                      <CheckCircle2 size={22} color="#059669" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#065f46', fontSize: '16px' }}>
                        Dataset Cleaned & Ready for Export
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        File: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>{cleanResult.cleaned_filename}</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Primary Download Button */}
                    <a
                      href={api.getDatasetDownloadUrl(cleanResult.cleaned_filename)}
                      download={cleanResult.cleaned_filename}
                      className="btn"
                      style={{
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        padding: '10px 18px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                      }}
                    >
                      <Download size={16} />
                      Download Cleaned Dataset (.CSV)
                    </a>

                    <button
                      onClick={() => loadDatasets(cleanResult.cleaned_filename)}
                      className="btn btn-secondary"
                      style={{ fontSize: '13px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ArrowRight size={14} /> Switch to Cleaned Dataset
                    </button>
                  </div>
                </div>

                {/* 3 Quick Clean KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Missing Values</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {cleanResult.missing_before} &rarr; <span style={{ color: '#059669' }}>{cleanResult.missing_after}</span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Duplicates Removed</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                      {cleanResult.duplicates_removed} rows
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dimensions</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {cleanResult.original_shape[0]} &times; {cleanResult.original_shape[1]} &rarr; <span style={{ color: '#059669' }}>{cleanResult.cleaned_shape[0]} &times; {cleanResult.cleaned_shape[1]}</span>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Applied Cleaning Transformations ({cleanResult.actions_performed.length}):
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '13px', color: '#047857', margin: 0 }}>
                    {cleanResult.actions_performed.map((act, i) => (
                      <li key={i} style={{ marginBottom: '3px' }}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 3: AUTOML MODELS
           ========================================= */}
        {activeTab === 'train' && (
          <div className="white-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '20px' }}>Supervised Machine Learning Studio</h2>

            {/* 1. Task Type Selection: Classification vs Regression */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Select Machine Learning Task Type:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* Classification Card */}
                <div
                  onClick={() => handleSelectTaskType('classification')}
                  style={{
                    cursor: 'pointer',
                    border: taskType === 'classification' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    backgroundColor: taskType === 'classification' ? '#eef2ff' : '#ffffff',
                    borderRadius: '10px',
                    padding: '16px',
                    transition: 'all 0.15s ease',
                    boxShadow: taskType === 'classification' ? '0 4px 14px rgba(79, 70, 229, 0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🏷️</span>
                      <span style={{ fontWeight: 800, color: taskType === 'classification' ? '#4338ca' : '#0f172a', fontSize: '15px' }}>
                        Classification
                      </span>
                    </div>
                    <span className="badge-tag" style={{ backgroundColor: taskType === 'classification' ? '#4f46e5' : '#e2e8f0', color: taskType === 'classification' ? '#ffffff' : '#475569', fontSize: '11px', fontWeight: 700 }}>
                      Categorize Into Groups
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '10px', lineHeight: 1.4 }}>
                    Predicts a <strong>choice, label, or category</strong> rather than a numerical measurement.
                  </div>
                  <div style={{ backgroundColor: taskType === 'classification' ? '#ffffff' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#334155' }}>
                    <span style={{ fontWeight: 700, color: '#4f46e5', display: 'block', marginBottom: '4px' }}>Example:</span>
                    <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.55 }}>
                      <li><strong>Spam vs. Not Spam</strong> (Email filter)</li>
                    </ul>
                  </div>
                </div>

                {/* Regression Card */}
                <div
                  onClick={() => handleSelectTaskType('regression')}
                  style={{
                    cursor: 'pointer',
                    border: taskType === 'regression' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    backgroundColor: taskType === 'regression' ? '#eef2ff' : '#ffffff',
                    borderRadius: '10px',
                    padding: '16px',
                    transition: 'all 0.15s ease',
                    boxShadow: taskType === 'regression' ? '0 4px 14px rgba(79, 70, 229, 0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>📈</span>
                      <span style={{ fontWeight: 800, color: taskType === 'regression' ? '#4338ca' : '#0f172a', fontSize: '15px' }}>
                        Regression
                      </span>
                    </div>
                    <span className="badge-tag" style={{ backgroundColor: taskType === 'regression' ? '#4f46e5' : '#e2e8f0', color: taskType === 'regression' ? '#ffffff' : '#475569', fontSize: '11px', fontWeight: 700 }}>
                      Predict Numbers & Quantities
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '10px', lineHeight: 1.4 }}>
                    Predicts a <strong>continuous numerical quantity, score, or dollar amount</strong>.
                  </div>
                  <div style={{ backgroundColor: taskType === 'regression' ? '#ffffff' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#334155' }}>
                    <span style={{ fontWeight: 700, color: '#4f46e5', display: 'block', marginBottom: '4px' }}>Example:</span>
                    <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.55 }}>
                      <li><strong>House Prices</strong> (e.g., $350,000 based on area & bedrooms)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Target Label Dropdown (No suggested target) */}
            <div style={{ maxWidth: '460px', marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Select Target Column (Label to Predict):
              </label>
              <select
                value={targetColumn}
                onChange={(e) => handleTargetColumnChange(e.target.value)}
                className="clean-select"
              >
                <option value="">-- Choose Target (Label) Column --</option>
                {activeDataset.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {targetColumn && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: taskType === 'regression' ? '#4338ca' : '#047857',
                  backgroundColor: taskType === 'regression' ? '#eef2ff' : '#ecfdf5',
                  border: `1px solid ${taskType === 'regression' ? '#c7d2fe' : '#a7f3d0'}`,
                  borderRadius: '6px',
                  padding: '7px 11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>{taskType === 'regression' ? '📈' : '🏷️'}</span>
                  <span>
                    {taskType === 'regression'
                      ? `"${targetColumn}" is a continuous numeric score (${edaData?.column_profiles?.find(p => p.name === targetColumn)?.unique_count || 'multiple'} values). Using Regression for dynamic numerical predictions.`
                      : `"${targetColumn}" has categorical classes. Using Classification to predict discrete categories.`}
                  </span>
                </div>
              )}
            </div>

            {/* 3. Model Selection Checkboxes */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Select Candidate Algorithms to Train & Benchmark ({selectedModels.length} selected):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSelectAllModels}
                    style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: '#cbd5e1' }}>&bull;</span>
                  <button
                    type="button"
                    onClick={handleClearModels}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {(taskType === 'classification' ? classificationModels : regressionModels).map((model) => {
                  const isChecked = selectedModels.includes(model.id);
                  return (
                    <label
                      key={model.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        border: isChecked ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                        backgroundColor: isChecked ? '#f5f3ff' : '#ffffff',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleModel(model.id)}
                        style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? '#1e1b4b' : '#334155' }}>
                          {model.name}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleTrainModels}
              disabled={training || !targetColumn}
              className="btn btn-primary"
              style={{ padding: '11px 22px' }}
            >
              {training ? (
                <>
                  <div className="animate-spin" style={{ width: '15px', height: '15px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Benchmarking Models...
                </>
              ) : (
                <>
                  <Brain size={16} />
                  Train & Compare Models
                </>
              )}
            </button>

            {automlResult && (
              <div style={{ marginTop: '24px' }}>
                {/* Winner Card & AI Model Rationale */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #4f46e5',
                  borderRadius: '12px',
                  padding: '22px',
                  boxShadow: '0 4px 20px -2px rgba(79, 70, 229, 0.12)',
                  marginBottom: '24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ★ Top Performing Model Selected
                        </span>
                        {automlResult.recommendation_rationale?.score_margin && (
                          <span style={{ backgroundColor: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                            {automlResult.recommendation_rationale.score_margin}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                        {automlResult.best_model_name}
                      </div>
                    </div>
                    <div className="badge-tag tag-emerald" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      {automlResult.best_score_metric.toUpperCase()}: {automlResult.best_score}
                    </div>
                  </div>

                  {/* AI Explanation of Why this model is preferred */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px',
                    marginTop: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Brain size={17} color="#4f46e5" />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                        Why {automlResult.best_model_name} is Preferred for This Dataset
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: '#334155', fontWeight: 600, marginBottom: '10px', lineHeight: '1.5' }}>
                      {automlResult.recommendation_rationale?.headline ||
                        `${automlResult.best_model_name} demonstrated the highest predictive accuracy across cross-validation tests.`}
                    </p>

                    {automlResult.recommendation_rationale?.key_reasons && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Architectural & Algorithmic Advantages:
                        </div>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {automlResult.recommendation_rationale.key_reasons.map((reason, idx) => (
                            <li key={idx} style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {automlResult.recommendation_rationale?.dataset_fit_analysis && (
                      <div style={{
                        fontSize: '12.5px',
                        color: '#475569',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '10px',
                        marginTop: '10px',
                        lineHeight: '1.5',
                      }}>
                        <strong style={{ color: '#0f172a' }}>Dataset Fit Analysis: </strong>
                        {automlResult.recommendation_rationale.dataset_fit_analysis}
                      </div>
                    )}

                    {automlResult.recommendation_rationale?.tradeoffs && (
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '8px',
                        marginTop: '8px',
                      }}>
                        <strong style={{ color: '#475569' }}>Engineering Trade-offs: </strong>
                        {automlResult.recommendation_rationale.tradeoffs}
                      </div>
                    )}

                    {automlResult.recommendation_rationale?.strengths && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {automlResult.recommendation_rationale.strengths.map((str, sIdx) => (
                          <span key={sIdx} style={{
                            backgroundColor: '#eef2ff',
                            color: '#4338ca',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #c7d2fe',
                          }}>
                            ✓ {str}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Benchmark Leaderboard */}
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Model Comparison Leaderboard</h3>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '10px 14px' }}>Algorithm</th>
                        <th style={{ padding: '10px 14px' }}>Train Time</th>
                        <th style={{ padding: '10px 14px' }}>{automlResult.task_type === 'classification' ? 'Accuracy' : 'R² Score'}</th>
                        <th style={{ padding: '10px 14px' }}>{automlResult.task_type === 'classification' ? 'F1-Score' : 'RMSE'}</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {automlResult.models.map((m) => (
                        <tr key={m.model_key} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: m.is_best ? '#f0fdf4' : 'transparent' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{m.model_name}</td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>{m.training_time_seconds}s</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: m.is_best ? '#059669' : '#0f172a' }}>
                            {m.metrics.accuracy !== undefined ? m.metrics.accuracy : m.metrics.r2_score}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {m.metrics.f1_score !== undefined ? m.metrics.f1_score : m.metrics.rmse}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {m.is_best ? <span className="badge-tag tag-emerald">Best</span> : <span className="badge-tag tag-gray">Tested</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live Inference Form: Only Required Predictive Fields */}
                <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '22px', boxShadow: 'var(--shadow-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles size={16} color="#4f46e5" />
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Test Live Prediction (Inference)</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (automlResult.sample_record) {
                            setPredictInputs({ ...automlResult.sample_record });
                          } else if (previewData?.rows?.[0]) {
                            const newInputs = {};
                            automlResult.features.forEach((feat) => {
                              newInputs[feat] = previewData.rows[0][feat] ?? '';
                            });
                            setPredictInputs(newInputs);
                          }
                        }}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Reset inputs to the first real row of your training data"
                      >
                        ✨ Fill with Sample Train Data
                      </button>

                      {previewData?.rows?.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const randIdx = Math.floor(Math.random() * previewData.rows.length);
                            const row = previewData.rows[randIdx];
                            const newInputs = {};
                            automlResult.features.forEach((feat) => {
                              newInputs[feat] = row[feat] !== undefined && row[feat] !== null ? String(row[feat]) : '';
                            });
                            setPredictInputs(newInputs);
                          }}
                          style={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Pick another random row from your dataset"
                        >
                          🎲 Random Row from Dataset
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const empty = {};
                          automlResult.features.forEach((f) => { empty[f] = ''; });
                          setPredictInputs(empty);
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #e2e8f0',
                          color: '#64748b',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '16px' }}>
                    Only <strong>required predictive fields</strong> are requested (IDs, names, and date columns have been automatically excluded). Values below are pre-filled with real training records so you can run an instant prediction.
                  </p>

                  <form onSubmit={handleRunPredict}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      {automlResult.features.map((f) => (
                        <div key={f} style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{f}</label>
                            <span style={{ fontSize: '9.5px', color: '#64748b', backgroundColor: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>Required</span>
                          </div>
                          <input
                            type="text"
                            value={predictInputs[f] ?? ''}
                            onChange={(e) => setPredictInputs({ ...predictInputs, [f]: e.target.value })}
                            placeholder={`e.g. ${automlResult.sample_record?.[f] ?? ''}`}
                            className="clean-input"
                            style={{ padding: '7px 10px', fontSize: '12.5px', backgroundColor: '#ffffff', width: '100%' }}
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                      <button type="submit" disabled={predicting} className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '13.5px' }}>
                        {predicting ? (
                          <>
                            <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                            Running Prediction...
                          </>
                        ) : (
                          <>
                            <Brain size={16} />
                            Run Prediction
                          </>
                        )}
                      </button>

                      {predictionOutput && (
                        <div style={{
                          backgroundColor: '#ecfdf5',
                          border: '1.5px solid #6ee7b7',
                          color: '#065f46',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}>
                          <div>
                            <div style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 800, color: '#047857', letterSpacing: '0.04em' }}>
                              Instant Predicted Result
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#064e3b' }}>
                              {predictionOutput.prediction_label}
                            </div>
                          </div>
                          {predictionOutput.probabilities && (
                            <div style={{ borderLeft: '1px solid #a7f3d0', paddingLeft: '12px', fontSize: '11.5px', color: '#047857' }}>
                              <span style={{ fontWeight: 700 }}>Confidence:</span>{' '}
                              {Object.entries(predictionOutput.probabilities).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(' | ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 4: EXECUTIVE REPORT (PDF)
           ========================================= */}
        {activeTab === 'report' && (
          <div className="white-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileText size={18} color="#059669" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Executive Audit Report (PDF)</h2>
                    <span className="badge-tag tag-emerald" style={{ fontSize: '11px' }}>Boardroom Ready &bull; PDF</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    Generated for <strong>{activeDataset?.name}</strong> &bull; Complete statistical diagnostic, data hygiene & modeling audit
                  </div>
                </div>
              </div>

              {/* Action buttons including primary Download Report button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {reportResult && (
                  <>
                    <a
                      href={`${reportResult.download_url}?download=true`}
                      download={reportResult.filename}
                      className="btn btn-emerald"
                      style={{ padding: '9px 18px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                    >
                      <Download size={15} /> Download Report (PDF)
                    </a>
                    <a
                      href={reportResult.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '9px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ExternalLink size={14} /> Fullscreen
                    </a>
                  </>
                )}
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="btn btn-secondary"
                  style={{ padding: '9px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Re-generate Report"
                >
                  <RefreshCw size={13} className={generatingReport ? 'animate-spin' : ''} />
                  {generatingReport ? 'Compiling...' : 'Re-generate'}
                </button>
              </div>
            </div>

            {generatingReport && !reportResult && (
              <div style={{
                padding: '60px 24px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '12px',
                margin: '12px 0',
              }}>
                <div className="animate-spin" style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#059669',
                  borderRadius: '50%',
                  margin: '0 auto 16px auto',
                }} />
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  Compiling Executive Audit Report...
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                  Analyzing data health, feature correlations, missing value metrics, and compiling boardroom PDF...
                </div>
              </div>
            )}

            {reportResult && (
              <div style={{ marginTop: '14px' }}>
                <div style={{
                  height: '740px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
                  backgroundColor: '#525659'
                }}>
                  <iframe
                    src={reportResult.download_url}
                    title="Executive Audit Report PDF"
                    type="application/pdf"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
            )}

            {!reportResult && !generatingReport && (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                marginTop: '12px',
              }}>
                <FileText size={32} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Ready to compile executive report
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                  Click below to generate a publication-ready PDF audit report for {activeDataset?.name}.
                </div>
                <button
                  onClick={handleGenerateReport}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px', fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <FileText size={15} /> Generate Executive PDF Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 7: RAW SPREADSHEET TABLE
           ========================================= */}
        {activeTab === 'table' && (
          <div className="white-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Spreadsheet Table View</h2>
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                Page {tablePage} of {previewData ? Math.ceil(previewData.total_rows / 20) : 1}
              </div>
            </div>

            {previewData && (
              <div>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '14px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '8px 12px' }}>#</th>
                        {previewData.columns.map((c) => (
                          <th key={c} style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{idx + 1 + (tablePage - 1) * 20}</td>
                          {previewData.columns.map((c) => (
                            <td key={c} style={{ padding: '8px 12px', color: '#334155' }}>{String(row[c] ?? 'null')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleTablePageChange(Math.max(1, tablePage - 1))}
                    disabled={tablePage <= 1}
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '12px' }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleTablePageChange(tablePage + 1)}
                    disabled={previewData.rows.length < 20}
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '12px' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================
          FLOATING AI CHAT COPILOT (BOTTOM-RIGHT CORNER)
         ========================================= */}
      {!isChatOpen ? (
        <button
          onClick={() => setIsChatOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.3)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={16} color="#ffffff" />
          </div>
          <span>Ask AI Copilot</span>
          <span style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Online
          </span>
        </button>
      ) : (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: '580px',
            maxHeight: 'calc(100vh - 48px)',
            zIndex: 9999,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Sparkles size={18} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', lineHeight: 1.2 }}>AI Data Copilot</div>
                <div style={{ fontSize: '11px', color: '#c7d2fe' }}>
                  {activeDataset ? activeDataset.name : 'Dataset Assistant'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close Chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
          }}>
            {[
              'Summarize dataset',
              'Which columns have null values?',
              'Strongest correlations',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendChat(q)}
                disabled={chatLoading}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#fdfdfe',
          }}>
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: m.role === 'user' ? '#4f46e5' : '#f1f5f9',
                  color: m.role === 'user' ? '#ffffff' : '#0f172a',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '12.5px',
                  lineHeight: '1.45',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div className={`markdown-content ${m.role === 'user' ? 'markdown-user' : 'markdown-assistant'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
                {m.chart && m.chart.data && (
                  <div style={{
                    marginTop: '10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BarChart3 size={14} />
                      {m.chart.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {m.chart.data.map((item, dIdx) => {
                        const maxVal = Math.max(...m.chart.data.map((d) => d.value)) || 1;
                        const pct = Math.max((item.value / maxVal) * 100, 5);
                        return (
                          <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                            <span style={{ width: '100px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#64748b' }}>
                              {item.name}
                            </span>
                            <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #4f46e5, #6366f1)',
                                borderRadius: '4px',
                              }} />
                            </div>
                            <span style={{ width: '35px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                              {item.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', padding: '6px' }}>
                <RefreshCw size={13} className="animate-spin" />
                AI is analyzing your dataset...
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about columns, nulls, trends..."
              className="clean-input"
              disabled={chatLoading}
              style={{ fontSize: '12.5px', padding: '8px 12px' }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="btn btn-primary"
              style={{ padding: '0 14px', flexShrink: 0 }}
              title="Send Message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
