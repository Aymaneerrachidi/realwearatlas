import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import ExportMenu from '../components/ExportMenu';
import { expensesApi } from '../api/client';
import { useToast } from '../components/Toast';
import { useUser, USERS } from '../context/UserContext';
import { expensesCSV, expensesPDF } from '../utils/export';

const EXP_CATEGORIES = ['ads','shipping','packaging','misc'];
const CATEGORY_COLORS = { ads: 'text-violet-400', shipping: 'text-blue-400', packaging: 'text-emerald-400', misc: 'text-amber-400' };
const CATEGORY_BG = { ads: 'bg-violet-500/10 border-violet-500/20', shipping: 'bg-blue-500/10 border-blue-500/20', packaging: 'bg-emerald-500/10 border-emerald-500/20', misc: 'bg-amber-500/10 border-amber-500/20' };
const USER_COLORS = { Aymane: 'bg-amber-500/20 text-amber-400', Zaid: 'bg-blue-500/20 text-blue-400' };
const fmtCurrency = (v) => `${Number(v || 0).toFixed(2)} DH`;

function ExpenseForm({ initial, onSave, onCancel, loading, defaultUser }) {
  const [form, setForm] = useState({
    amount: '', category: 'ads',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
    submitted_by: defaultUser || USERS[0],
    ...initial,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e) => { e.preventDefault(); onSave({ ...form, amount: parseFloat(form.amount) }); };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount (DH) <span className="text-amber-500">*</span></label>
          <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
            value={form.amount} onChange={e => set('amount', e.target.value)} required />
        </div>
        <div>
          <label className="label">Category <span className="text-amber-500">*</span></label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)} required>
            {EXP_CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Date <span className="text-amber-500">*</span></label>
          <input className="input" type="date" value={form.expense_date}
            onChange={e => set('expense_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Employee</label>
          <select className="input" value={form.submitted_by} onChange={e => set('submitted_by', e.target.value)}>
            {USERS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={3} placeholder="What was this expense for?"
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving…' : initial?.id ? 'Update Expense' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}

function ExpenseCard({ exp, onEdit, onDelete }) {
  return (
    <div className="mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`badge capitalize border ${CATEGORY_BG[exp.category] || 'bg-white/[0.04] border-white/[0.08]'} ${CATEGORY_COLORS[exp.category] || 'text-[#888]'} shrink-0`}>
            {exp.category}
          </span>
          {exp.notes && (
            <p className="text-sm truncate" style={{ color: 'var(--input-text)' }}>{exp.notes}</p>
          )}
        </div>
        <p className="text-base font-mono font-bold text-rose-400 shrink-0">{fmtCurrency(exp.amount)}</p>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono" style={{ color: 'var(--input-placeholder)' }}>{exp.expense_date}</p>
          {exp.submitted_by && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${USER_COLORS[exp.submitted_by] || 'bg-white/5 text-[#666]'}`}>
              {exp.submitted_by}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(exp)}
            className="p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            style={{ color: 'var(--input-placeholder)' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(exp)}
            className="p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center text-rose-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const ctx = useOutletContext();
  const toast = useToast();
  const { user } = useUser();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('expense_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expensesApi.list({ search: search || undefined, category: catFilter || undefined, from: from || undefined, to: to || undefined, sort: sortBy, order: sortOrder });
      setExpenses(res.data);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }, [search, catFilter, from, to, sortBy, sortOrder]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (selected?.id) { await expensesApi.update(selected.id, data); toast('Expense updated'); }
      else              { await expensesApi.create(data); toast('Expense added'); }
      setModal(null); setSelected(null); load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await expensesApi.delete(selected.id); toast('Expense deleted'); setModal(null); setSelected(null); load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const byCategory = EXP_CATEGORIES.map(cat => ({ cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0) }));
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const toggleSort = (col) => { if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortOrder('desc'); } };
  const SortTh = ({ col, children }) => (
    <th className="th cursor-pointer hover:text-[#999] select-none" onClick={() => toggleSort(col)}>
      <span className="flex items-center gap-1">{children}{sortBy === col && <span className="text-amber-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</span>
    </th>
  );

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Expenses"
        subtitle={`${expenses.length} records`}
        onMenuClick={() => ctx?.setMobileOpen(true)}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu onCSV={() => expensesCSV(expenses)} onPDF={() => expensesPDF(expenses)} />
            <button onClick={() => { setSelected(null); setModal('add'); }} className="btn-primary">
              <Plus size={14} />
              <span className="hidden sm:inline">Add Expense</span>
            </button>
          </div>
        }
      />

      <div className="p-3 lg:p-5 flex flex-col gap-3 lg:gap-4 animate-fade-in">
        {/* Stats — 2-col on mobile, 5-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
          <div className="card p-3 lg:p-4 col-span-2 lg:col-span-1">
            <p className="text-[10px] lg:text-xs mb-1" style={{ color: 'var(--input-placeholder)' }}>Total</p>
            <p className="text-lg lg:text-xl font-display font-bold text-rose-400">{fmtCurrency(grandTotal)}</p>
          </div>
          {byCategory.map(({ cat, total }) => (
            <div key={cat} className="card p-3 lg:p-4">
              <p className="text-[10px] lg:text-xs mb-1 capitalize" style={{ color: 'var(--input-placeholder)' }}>{cat}</p>
              <p className={`text-base lg:text-lg font-display font-bold ${CATEGORY_COLORS[cat]}`}>{fmtCurrency(total)}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--input-placeholder)' }} />
            <input className="input pl-8" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <div className="flex gap-2 w-full lg:w-auto">
            <input className="input flex-1 lg:w-auto" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <input className="input flex-1 lg:w-auto" type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mobile-card animate-pulse space-y-3">
                  <div className="flex justify-between">
                    <div className="h-5 rounded-full bg-white/[0.06] w-20" />
                    <div className="h-5 rounded bg-white/[0.06] w-24" />
                  </div>
                  <div className="h-3 rounded bg-white/[0.04] w-1/2" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--input-placeholder)' }}>
              No expenses recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => (
                <ExpenseCard key={exp.id} exp={exp}
                  onEdit={e => { setSelected(e); setModal('edit'); }}
                  onDelete={e => { setSelected(e); setModal('delete'); }} />
              ))}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead className="border-b" style={{ borderColor: 'var(--card-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <SortTh col="expense_date">Date</SortTh>
                  <SortTh col="category">Category</SortTh>
                  <SortTh col="amount">Amount</SortTh>
                  <th className="th">Notes</th>
                  <th className="th">Employee</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="table-row">{Array.from({ length: 6 }).map((_, j) => <td key={j} className="td"><div className="h-4 rounded-md bg-white/[0.05] animate-pulse w-3/4" /></td>)}</tr>
                  ))
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={6} className="td text-center py-12" style={{ color: 'var(--input-placeholder)' }}>No expenses recorded.</td></tr>
                ) : (
                  expenses.map(exp => (
                    <tr key={exp.id} className="table-row">
                      <td className="td text-xs font-mono" style={{ color: 'var(--input-placeholder)' }}>{exp.expense_date}</td>
                      <td className="td">
                        <span className={`badge capitalize bg-white/[0.04] border border-white/[0.08] ${CATEGORY_COLORS[exp.category] || 'text-[#888]'}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="td font-mono font-medium text-rose-400">{fmtCurrency(exp.amount)}</td>
                      <td className="td text-sm max-w-[200px] truncate" style={{ color: 'var(--input-placeholder)' }}>{exp.notes || '—'}</td>
                      <td className="td">
                        {exp.submitted_by && (
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${USER_COLORS[exp.submitted_by] || 'bg-white/5 text-[#666]'}`}>
                            {exp.submitted_by}
                          </span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setSelected(exp); setModal('edit'); }} className="p-1.5 rounded-lg hover:bg-white/5 text-[#666] hover:text-[#e8e8e6] transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => { setSelected(exp); setModal('delete'); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[#666] hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => { setModal(null); setSelected(null); }}
        title={modal === 'edit' ? 'Edit Expense' : 'Add Expense'} size="sm">
        <ExpenseForm initial={selected} onSave={handleSave} onCancel={() => { setModal(null); setSelected(null); }} loading={saving} defaultUser={user} />
      </Modal>

      <Modal open={modal === 'delete'} onClose={() => { setModal(null); setSelected(null); }} title="Delete Expense" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--input-placeholder)' }}>Delete this expense? This cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={() => { setModal(null); setSelected(null); }} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1" disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
