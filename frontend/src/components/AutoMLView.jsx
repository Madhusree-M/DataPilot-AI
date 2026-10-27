import React, { useState, useEffect } from 'react';
import {
  Brain,
  Trophy,
  Zap,
  Play,
  BarChart,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';

export default function AutoMLView({ dataset, onJobTrained }) {
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState('auto');
  const [testSize, setTestSize] = useState(0.2);

  const [training, setTraining] = useState(false);
  const [jobResult, setJobResult] = useState(null);
  const [error, setError] = useState(null);

  // Live Prediction state
  const [predictInputs, setPredictInputs] = useState({});
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictError, setPredictError] = useState(null);

  useEffect(() => {
    if (dataset) {
      if (dataset.suggested_target && dataset.columns.includes(dataset.suggested_target)) {
        setTargetColumn(dataset.suggested_target);
      } else if (dataset.columns.length > 0) {
        setTargetColumn(dataset.columns[dataset.columns.length - 1]);
      }
      if (dataset.suggested_task) {
        setTaskType(dataset.suggested_task);
      }
    }
  }, [dataset]);

  if (!dataset) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Select a dataset to launch AutoML model training.</p>
      </div>
    );
  }

  const handleStartTraining = async () => {
    if (!targetColumn) {
      setError('Please select a target column to predict.');
      return;
    }

    setTraining(true);
    setError(null);
    setPredictionResult(null);

    try {
      const res = await api.trainAutoML({
        dataset_id: dataset.id,
        target_column: targetColumn,
        task_type: taskType,
        test_size: parseFloat(testSize),
      });
      setJobResult(res);
      if (onJobTrained) {
        onJobTrained(res.job_id);
      }

      // Initialize predict inputs with empty strings
      const initialInputs = {};
      res.features.forEach((feat) => {
        initialInputs[feat] = '';
      });
      setPredictInputs(initialInputs);
    } catch (err) {
      setError(err.message || 'AutoML training failed');
    } finally {
      setTraining(false);
    }
  };

  const handlePredictInput = (field, value) => {
    setPredictInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleFillSample = () => {
    if (!jobResult) return;
    const sample = {};
    jobResult.features.forEach((feat) => {
      // Pick generic default or random sample
      sample[feat] = '1';
    });
    setPredictInputs(sample);
  };

  const handleRunPredict = async (e) => {
    e.preventDefault();
    if (!jobResult) return;

    setPredicting(true);
    setPredictError(null);

    try {
      const res = await api.predict(jobResult.job_id, predictInputs);
      setPredictionResult(res);
    } catch (err) {
      setPredictError(err.message || 'Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  const bestModel = jobResult?.models?.find((m) => m.is_best) || jobResult?.models?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Config Banner */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%), var(--bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}>
              <Brain size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>AutoML Benchmark & Prediction Studio</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Automatically trains, benchmarks, and optimizes multiple machine learning architectures simultaneously.
              </p>
            </div>
          </div>

          <button
            onClick={handleStartTraining}
            disabled={training}
            className="btn btn-primary"
            style={{ padding: '10px 22px', fontSize: '14px' }}
          >
            {training ? (
              <>
                <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                Benchmarking Candidate Models...
              </>
            ) : (
              <>
                <Zap size={16} />
                Launch AutoML Training
              </>
            )}
          </button>
        </div>

        {/* Configuration Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Target Column to Predict (Y):
            </label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="select-field"
            >
              {dataset.columns.map((c) => (
                <option key={c} value={c}>
                  {c} {c === dataset.suggested_target ? '★ (Auto-Suggested)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Task Type:
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="select-field"
            >
              <option value="auto">Auto-Detect</option>
              <option value="classification">Classification (Binary or Multi-Class)</option>
              <option value="regression">Regression (Continuous values)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Test Split: {Math.round(testSize * 100)}% ({Math.round(dataset.row_count * (1 - testSize))} Train / {Math.round(dataset.row_count * testSize)} Test)
            </label>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSize}
              onChange={(e) => setTestSize(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', marginTop: '8px' }}
            />
          </div>
        </div>
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

      {/* Model Benchmark Leaderboard */}
      {jobResult && (
        <>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Trophy size={18} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                    AutoML Benchmark Leaderboard ({jobResult.models.length} Candidates Evaluated)
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Ranked by <b>{jobResult.best_score_metric.toUpperCase()}</b> &bull; Task: <b>{jobResult.task_type.toUpperCase()}</b>
                  </div>
                </div>
              </div>

              {/* Best Model Badge */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '6px 14px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>Top Performer:</span>
                <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 800 }}>{jobResult.best_model_name}</span>
                <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                  {jobResult.best_score}
                </span>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Rank & Model</th>
                    <th style={{ padding: '10px 12px' }}>Train Time</th>
                    <th style={{ padding: '10px 12px' }}>{jobResult.task_type === 'classification' ? 'Accuracy' : 'R² Score'}</th>
                    <th style={{ padding: '10px 12px' }}>{jobResult.task_type === 'classification' ? 'F1-Score' : 'RMSE'}</th>
                    <th style={{ padding: '10px 12px' }}>{jobResult.task_type === 'classification' ? 'Precision' : 'MAE'}</th>
                    <th style={{ padding: '10px 12px' }}>{jobResult.task_type === 'classification' ? 'Recall' : 'MAPE (%)'}</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobResult.models.map((m, idx) => (
                    <tr
                      key={m.model_key}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: m.is_best ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: m.is_best ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                            color: m.is_best ? '#000000' : 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {idx + 1}
                          </span>
                          {m.model_name}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {m.training_time_seconds}s
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: m.is_best ? '#10b981' : 'var(--text-main)' }}>
                        {m.metrics.accuracy !== undefined ? m.metrics.accuracy : m.metrics.r2_score}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {m.metrics.f1_score !== undefined ? m.metrics.f1_score : m.metrics.rmse}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {m.metrics.precision !== undefined ? m.metrics.precision : m.metrics.mae}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {m.metrics.recall !== undefined ? m.metrics.recall : m.metrics.mape ?? '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {m.is_best ? (
                          <span className="badge badge-emerald">Best Model</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                            Benchmarked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Model Recommendation & Selection Rationale */}
            {jobResult.recommendation_rationale && (
              <div style={{
                marginTop: '20px',
                padding: '18px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#6366f1" />
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Why {jobResult.best_model_name} is Preferred for This Dataset
                    </span>
                  </div>
                  {jobResult.recommendation_rationale.score_margin && (
                    <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                      {jobResult.recommendation_rationale.score_margin}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600, marginBottom: '12px', lineHeight: '1.5' }}>
                  {jobResult.recommendation_rationale.headline}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {jobResult.recommendation_rationale.key_reasons.map((reason, idx) => (
                    <div key={idx} style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {jobResult.recommendation_rationale.dataset_fit_analysis && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '8px', lineHeight: '1.5' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>Dataset Fit: </strong>
                    {jobResult.recommendation_rationale.dataset_fit_analysis}
                  </div>
                )}

                {jobResult.recommendation_rationale.tradeoffs && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '6px' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>Trade-offs: </strong>
                    {jobResult.recommendation_rationale.tradeoffs}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Model Interpretability: Feature Importance & Confusion Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {/* Feature Importance */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                Feature Importance & Interpretability
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Relative contribution of top features to the winning {bestModel?.model_name} model.
              </p>

              {bestModel?.feature_importance && bestModel.feature_importance.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {bestModel.feature_importance.map((item) => (
                    <div key={item.feature} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.feature}</span>
                        <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {item.importance}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${item.importance}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                          borderRadius: '3px',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                  Feature importances are not directly available for this model type.
                </div>
              )}
            </div>

            {/* Confusion Matrix (for Classification) */}
            {jobResult.task_type === 'classification' && bestModel?.confusion_matrix && (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                  Confusion Matrix Breakdown
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  True Positive, False Positive, and Misclassification heat across test fold.
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${bestModel.confusion_matrix.length}, 1fr)`,
                  gap: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {bestModel.confusion_matrix.map((row, rIdx) =>
                    row.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          style={{
                            background: isDiagonal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.1)',
                            border: `1px solid ${isDiagonal ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.2)'}`,
                            borderRadius: '8px',
                            padding: '16px 8px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '20px', fontWeight: 800, color: isDiagonal ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                            {val}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {bestModel.confusion_labels ? `True ${bestModel.confusion_labels[rIdx]} / Pred ${bestModel.confusion_labels[cIdx]}` : `R${rIdx}:C${cIdx}`}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Prediction Playground */}
          <div className="glass-panel" style={{
            padding: '24px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(6, 182, 212, 0.03) 100%), var(--bg-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={20} color="var(--accent-primary)" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Interactive Prediction Playground (Live Inference)</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Provide inputs below to evaluate real-time predictions with <b>{jobResult.best_model_name}</b>.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFillSample}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                Autofill Sample Values
              </button>
            </div>

            {predictError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#fda4af',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {predictError}
              </div>
            )}

            <form onSubmit={handleRunPredict}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                {jobResult.features.map((feat) => (
                  <div key={feat}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {feat}:
                    </label>
                    <input
                      type="text"
                      value={predictInputs[feat] ?? ''}
                      onChange={(e) => handlePredictInput(feat, e.target.value)}
                      placeholder="e.g. 25"
                      className="input-field"
                      style={{ fontSize: '12.5px', padding: '7px 10px' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={predicting}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  {predicting ? 'Computing...' : 'Run Live Inference'}
                </button>

                {predictionResult && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>Prediction Result:</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                      {predictionResult.prediction_label}
                    </span>
                    {predictionResult.probabilities && (
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', fontSize: '11.5px', color: '#6ee7b7' }}>
                        {Object.entries(predictionResult.probabilities).map(([cls, prob]) => (
                          <span key={cls} className="badge badge-emerald">
                            {cls}: {(prob * 100).toFixed(1)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
