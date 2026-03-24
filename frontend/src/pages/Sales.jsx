import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import ExportMenu from '../components/ExportMenu';
import { salesApi } from '../api/client';
import { useToast } from '../components/Toast';
import { useUser, USERS } from '../context/UserContext';
import { salesCSV, salesPDF } from '../utils/export';

const CATEGORIES = ['hoodie','jeans','sneakers','jacket','shirt','dress','pants','bag','accessories','other'];
const fmtCurrency = (v) => `${Number(v || 0).toFixed(2)} DH`;
const USER_COLORS = { Aymane: 'bg-amber-500/20 text-amber-400', Zaid: 'bg-blue-500/20 text-blue-400' };

function EditSaleForm({ sale, onSave, onCancel, loading, defaultUser }) {
  const [form, setForm] = useState({
    selling_price: sale.selling_price, sale_date: sale.sale_date,
    buyer_name: sale.buyer_name || '', buyer_contact: sale.buyer_contact || '',
    platform: sale.platform || 'Instagram', notes: sale.notes || '',
    submitted_by: sale.submitted_by || defaultUser || USERS[0],
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const profit = form.selling_price ? (parseFloat(form.selling_price) - sale.purchase_price).toFixed(2) : null;

  const submit = (e) => { e.preventDefault(); onSave({ ...form, selling_price: parseFloat(form.selling_price) }); };

  return (
    <form onSubmit={submit} className="space-y-4">
      {profit !== null && (
        <div className={`p-3 rounded-xl border text-sm text-center ${parseFloat(profit) >= 0 ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400' : 'bg-rose-500/[0.08] border-rose-500/20 text-rose-400'}`}>
          Profit: <span className="font-mono font-bold">{fmtCurrency(profit)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Selling Price (DH) *</label>
          <input className="input" type="number" step="0.01" min="0" value={form.selling_price}
            onChange={e => set('selling_price', e.target.value)} required />
        </div>
        <div>
          <label className="label">Sale Date *</label>
          <input className="input" type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Platform</label>
          <select className="input" value={form.platform} onChange={e => set('platform', e.target.value)}>
            {['Instagram','Depop','eBay','Vinted','Facebook','Other'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Buyer Name</label>
          <input className="input" value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Buyer Contact</label>
          <input className="input" value={form.buyer_contact} onChange={e => set('buyer_contact', e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div>
          <label className="label">Employee</label>
          <select className="input" value={form.submitted_by} onChange={e => set('submitted_by', e.target.value)}>
            {USERS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Saving…' : 'Update Sale'}</button>
      </div>
    </form>
  );
}

function SaleCard({ sale, onEdit, onDelete }) {
  return (
    <div className="mobile-card">
      <div className="flex items-start justify-between gap-3">
        {sale.image_url && (
          <img src={sale.image_url} alt={sale.item_name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--input-text)' }}>{sale.item_name}</p>
          {sale.brand && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--input-placeholder)' }}>{sale.brand} · {sale.category}</p>
          )}
        </div>
        <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 text-[10px]">
          {sale.platform || 'Instagram'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--input-placeholder)' }}>Revenue</p>
          <p className="text-sm font-mono font-medium text-amber-400">{fmtCurrency(sale.selling_price)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--input-placeholder)' }}>Profit</p>
          <p className={`text-sm font-mono font-medium flex items-center gap-0.5 ${sale.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {sale.profit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {fmtCurrency(sale.profit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--input-placeholder)' }}>Margin</p>
          <p className="text-sm font-mono font-medium text-violet-400">{sale.margin}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono" style={{ color: 'var(--input-placeholder)' }}>{sale.sale_date}</p>
          {sale.submitted_by && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${USER_COLORS[sale.submitted_by] || 'bg-white/5 text-[#666]'}`}>
              {sale.submitted_by}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(sale)}
            className="p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            style={{ color: 'var(--input-placeholder)' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(sale)}
            className="p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center text-rose-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const ctx = useOutletContext();
  const toast = useToast();
  const { user } = useUser();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('sale_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesApi.list({ search: search || undefined, category: categoryFilter || undefined, from: from || undefined, to: to || undefined, sort: sortBy, order: sortOrder });
      setSales(res.data);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }, [search, categoryFilter, from, to, sortBy, sortOrder]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const handleUpdate = async (data) => {
    setSaving(true);
    try { await salesApi.update(selected.id, data); toast('Sale updated'); setModal(null); setSelected(null); load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await salesApi.delete(selected.id); toast('Sale deleted'); setModal(null); setSelected(null); load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const totalRevenue = sales.reduce((s, r) => s + r.selling_price, 0);
  const totalProfit  = sales.reduce((s, r) => s + r.profit, 0);
  const avgMargin    = sales.length ? (sales.reduce((s, r) => s + r.margin, 0) / sales.length).toFixed(1) : 0;

  const toggleSort = (col) => { if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortOrder('desc'); } };
  const SortTh = ({ col, children }) => (
    <th className="th cursor-pointer hover:text-[#999] select-none" onClick={() => toggleSort(col)}>
      <span className="flex items-center gap-1">{children}{sortBy === col && <span className="text-amber-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</span>
    </th>
  );

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Sales"
        subtitle={`${sales.length} records`}
        onMenuClick={() => ctx?.setMobileOpen(true)}
        actions={<ExportMenu onCSV={() => salesCSV(sales)} onPDF={() => salesPDF(sales)} />}
      />

      <div className="p-3 lg:p-5 flex flex-col gap-3 lg:gap-4 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {[
            { label: 'Total Revenue', val: fmtCurrency(totalRevenue), color: 'text-amber-400' },
            { label: 'Total Profit',  val: fmtCurrency(totalProfit),  color: totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            { label: 'Avg Margin',    val: `${avgMargin}%`,           color: 'text-violet-400' },
          ].map(s => (
            <div key={s.label} className="card p-3 lg:p-4 text-center">
              <p className="text-[10px] lg:text-xs mb-1 truncate" style={{ color: 'var(--input-placeholder)' }}>{s.label}</p>
              <p className={`text-base lg:text-xl font-display font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--input-placeholder)' }} />
            <input className="input pl-8" placeholder="Search sales…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
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
                  <div className="h-4 rounded bg-white/[0.06] w-2/3" />
                  <div className="h-3 rounded bg-white/[0.04] w-1/2" />
                  <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(j => <div key={j} className="h-8 rounded bg-white/[0.04]" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--input-placeholder)' }}>
              No sales yet. Mark items as sold from Inventory.
            </div>
          ) : (
            <div className="space-y-2">
              {sales.map(sale => (
                <SaleCard key={sale.id} sale={sale}
                  onEdit={s => { setSelected(s); setModal('edit'); }}
                  onDelete={s => { setSelected(s); setModal('delete'); }} />
              ))}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead className="border-b" style={{ borderColor: 'var(--card-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <th className="th">Image</th>
                  <SortTh col="item_name">Item</SortTh>
                  <th className="th">Category</th>
                  <SortTh col="selling_price">Revenue</SortTh>
                  <th className="th">Cost</th>
                  <th className="th">Profit</th>
                  <th className="th">Margin</th>
                  <SortTh col="sale_date">Date</SortTh>
                  <th className="th">Platform</th>
                  <th className="th">Employee</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="table-row">{Array.from({ length: 10 }).map((_, j) => <td key={j} className="td"><div className="h-4 rounded-md bg-white/[0.05] animate-pulse w-3/4" /></td>)}</tr>
                  ))
                ) : sales.length === 0 ? (
                  <tr><td colSpan={11} className="td text-center py-12" style={{ color: 'var(--input-placeholder)' }}>No sales yet. Mark items as sold from Inventory.</td></tr>
                ) : (
                  sales.map(sale => (
                    <tr key={sale.id} className="table-row">
                      <td className="td">
                        {sale.image_url ? (
                          <img src={sale.image_url} alt={sale.item_name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/[0.06]" />
                        )}
                      </td>
                      <td className="td">
                        <p className="font-medium">{sale.item_name}</p>
                        {sale.brand && <p className="text-xs mt-0.5" style={{ color: 'var(--input-placeholder)' }}>{sale.brand}</p>}
                      </td>
                      <td className="td text-sm capitalize" style={{ color: 'var(--input-placeholder)' }}>{sale.category}</td>
                      <td className="td font-mono text-amber-400">{fmtCurrency(sale.selling_price)}</td>
                      <td className="td font-mono" style={{ color: 'var(--input-placeholder)' }}>{fmtCurrency(sale.purchase_price)}</td>
                      <td className="td">
                        <span className={`font-mono font-medium flex items-center gap-1 ${sale.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {sale.profit >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {fmtCurrency(sale.profit)}
                        </span>
                      </td>
                      <td className="td font-mono text-sm text-violet-400">{sale.margin}%</td>
                      <td className="td text-xs font-mono" style={{ color: 'var(--input-placeholder)' }}>{sale.sale_date}</td>
                      <td className="td">
                        <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/20">{sale.platform || 'Instagram'}</span>
                      </td>
                      <td className="td">
                        {sale.submitted_by && (
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${USER_COLORS[sale.submitted_by] || 'bg-white/5 text-[#666]'}`}>
                            {sale.submitted_by}
                          </span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setSelected(sale); setModal('edit'); }} className="p-1.5 rounded-lg hover:bg-white/5 text-[#666] hover:text-[#e8e8e6] transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => { setSelected(sale); setModal('delete'); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[#666] hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
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

      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setSelected(null); }} title="Edit Sale">
        {selected && <EditSaleForm sale={selected} onSave={handleUpdate} onCancel={() => { setModal(null); setSelected(null); }} loading={saving} defaultUser={user} />}
      </Modal>

      <Modal open={modal === 'delete'} onClose={() => { setModal(null); setSelected(null); }} title="Delete Sale" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--input-placeholder)' }}>
          Delete this sale? The item will be restored to <span className="text-amber-400">available</span>.
        </p>
        <div className="flex gap-2">
          <button onClick={() => { setModal(null); setSelected(null); }} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1" disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
