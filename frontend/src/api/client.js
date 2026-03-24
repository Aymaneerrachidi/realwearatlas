import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const INVENTORY_WRITE_TIMEOUT = 30000;

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
      return Promise.reject(new Error('Request timed out. Try again, or use a smaller image.'));
    }
    let msg = err.response?.data?.error;
    if (msg && typeof msg !== 'string') msg = msg.message || JSON.stringify(msg);
    msg = msg || err.message || 'Unknown error';
    return Promise.reject(new Error(String(msg)));
  }
);

// ── Items ─────────────────────────────────────────
export const itemsApi = {
  list:       (params) => api.get('/items', { params }),
  get:        (id)     => api.get(`/items/${id}`),
  create:     (data)   => api.post('/items', data, { timeout: INVENTORY_WRITE_TIMEOUT }),
  update:     (id, d)  => api.patch(`/items/${id}`, d, { timeout: INVENTORY_WRITE_TIMEOUT }),
  delete:     (id)     => api.delete(`/items/${id}`),
  categories: ()       => api.get('/items/meta/categories'),
};

// ── Sales ─────────────────────────────────────────
export const salesApi = {
  list:   (params) => api.get('/sales', { params }),
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
