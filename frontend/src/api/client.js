import axios from 'axios';

const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const isBrowser = typeof window !== 'undefined';
const isConfiguredLocalhost = /localhost|127\.0\.0\.1/i.test(configuredApiUrl);
const isRunningLocally = isBrowser && /localhost|127\.0\.0\.1/i.test(window.location.hostname);

const resolvedBaseURL = configuredApiUrl && (!isConfiguredLocalhost || isRunningLocally)
  ? `${configuredApiUrl.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const INVENTORY_READ_TIMEOUT = 12000;
const INVENTORY_WRITE_TIMEOUT = 60000;
const INVENTORY_DELETE_TIMEOUT = 12000;

// Attach current user to every request
api.interceptors.request.use((config) => {
  const user = localStorage.getItem('rwa-user') || 'Aymane';
  config.headers['X-User'] = user;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
      return Promise.reject(new Error('Request timed out. Please refresh and check if it saved, then try again.'));
    }
    if (!err.response && /Network Error/i.test(err.message || '')) {
      return Promise.reject(new Error('Cannot reach API. Check VITE_API_URL for deployment or use same-origin /api.'));
    }
    let msg = err.response?.data?.error;
    if (msg && typeof msg !== 'string') msg = msg.message || JSON.stringify(msg);
    msg = msg || err.message || 'Unknown error';
    return Promise.reject(new Error(String(msg)));
  }
);

// ── Items ─────────────────────────────────────────
export const itemsApi = {
  list:       (params) => api.get('/items', { params: { limit: 15, page: 1, ...(params || {}) }, timeout: INVENTORY_READ_TIMEOUT }),
  get:        (id)     => api.get(`/items/${id}`),
  create:     (data)   => api.post('/items', data, { timeout: INVENTORY_WRITE_TIMEOUT }),
  update:     (id, d)  => api.patch(`/items/${id}`, d, { timeout: INVENTORY_WRITE_TIMEOUT }),
  delete:     (id)     => api.delete(`/items/${id}`, { timeout: INVENTORY_DELETE_TIMEOUT }),
  categories: ()       => api.get('/items/meta/categories'),
};

// ── Sales ─────────────────────────────────────────
export const salesApi = {
  list:   (params) => api.get('/sales', { params, timeout: INVENTORY_READ_TIMEOUT }),
  get:    (id)     => api.get(`/sales/${id}`),
  create: (data)   => api.post('/sales', data),
  update: (id, d)  => api.patch(`/sales/${id}`, d),
  delete: (id)     => api.delete(`/sales/${id}`),
};

// ── Expenses ──────────────────────────────────────
export const expensesApi = {
  list:   (params) => api.get('/expenses', { params }),
  get:    (id)     => api.get(`/expenses/${id}`),
  create: (data)   => api.post('/expenses', data),
  update: (id, d)  => api.patch(`/expenses/${id}`, d),
  delete: (id)     => api.delete(`/expenses/${id}`),
};

// ── Dashboard ─────────────────────────────────────
export const dashboardApi = {
  stats:             (params) => api.get('/dashboard/stats', { params }),
  revenueOverTime:   (params) => api.get('/dashboard/revenue-over-time', { params }),
  categoryBreakdown: (params) => api.get('/dashboard/category-breakdown', { params }),
  expensesBreakdown: (params) => api.get('/dashboard/expenses-breakdown', { params }),
  recentActivity:    ()       => api.get('/dashboard/recent-activity'),
};

// ── Activity log ───────────────────────────────────
export const activityApi = {
  list:  (params) => api.get('/activity', { params }),
  users: ()       => api.get('/activity/users'),
};
