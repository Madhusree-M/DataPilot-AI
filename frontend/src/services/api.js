const API_BASE = '/api';

export const api = {
  // Datasets
  async getDatasets() {
    const res = await fetch(`${API_BASE}/datasets`);
    if (!res.ok) throw new Error('Failed to fetch datasets');
    return res.json();
  },

  async getDataset(id) {
    const res = await fetch(`${API_BASE}/datasets/${id}`);
    if (!res.ok) throw new Error('Failed to fetch dataset details');
    return res.json();
  },

  async getDatasetPreview(id, page = 1, pageSize = 50, search = '') {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/datasets/${id}/preview?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch preview');
    return res.json();
  },

  async uploadDataset(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async deleteDataset(id) {
    const res = await fetch(`${API_BASE}/datasets/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete dataset');
    return res.json();
  },

  // EDA & Visualizations
  async getEDA(id) {
    const res = await fetch(`${API_BASE}/eda/${id}`);
    if (!res.ok) throw new Error('Failed to calculate EDA');
    return res.json();
  },

  async getChartData(id, request) {
    const res = await fetch(`${API_BASE}/eda/${id}/chart-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch chart data');
    }
    return res.json();
  },

  async getAutoInsights(id, targetColumn = null) {
    const url = targetColumn
      ? `${API_BASE}/eda/${id}/insights?target_column=${encodeURIComponent(targetColumn)}`
      : `${API_BASE}/eda/${id}/insights`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch automated insights');
    }
    return res.json();
  },

  // Cleaning
  async cleanDataset(config) {
    const res = await fetch(`${API_BASE}/cleaning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Cleaning failed');
    }
    return res.json();
  },

  // AutoML
  async trainAutoML(config) {
    const res = await fetch(`${API_BASE}/automl/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'AutoML training failed');
    }
    return res.json();
  },

  async predict(jobId, inputs) {
    const res = await fetch(`${API_BASE}/automl/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, inputs }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Prediction failed');
    }
    return res.json();
  },

  // Chat
  async queryChat(datasetId, message, history = []) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, message, history }),
    });
    if (!res.ok) throw new Error('Chat query failed');
    return res.json();
  },

  // Reports
  async generateReport(datasetId, reportTitle, jobId = null) {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: datasetId,
        report_title: reportTitle,
        job_id: jobId,
      }),
    });
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
  },

  async simulateScenario(jobId, baselineInputs, modifiedInputs) {
    const res = await fetch(`${API_BASE}/automl/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        baseline_inputs: baselineInputs,
        modified_inputs: modifiedInputs,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Simulation failed');
    }
    return res.json();
  },

  getDatasetDownloadUrl(datasetId) {
    return `${API_BASE}/datasets/${datasetId}/download`;
  },
};
