import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Tag, ShoppingBag, Camera, X } from 'lucide-react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import ExportMenu from '../components/ExportMenu';
import { itemsApi, salesApi } from '../api/client';
import { useToast } from '../components/Toast';
import { useUser, USERS } from '../context/UserContext';
import { inventoryCSV, inventoryPDF } from '../utils/export';

const CATEGORIES = ['hoodie','jeans','sneakers','jacket','shirt','dress','pants','bag','accessories','other'];
const fmt = (v) => `${Number(v || 0).toFixed(2)} DH`;
const USER_COLORS = { Aymane: 'bg-amber-500/20 text-amber-400', Zaid: 'bg-blue-500/20 text-blue-400' };

function EmployeeSelect({ value, onChange }) {
  return (
    <div>
      <label className="label">Employee</label>
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        {USERS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  );
}

// Compress image to JPEG base64 with aggressive size cap for faster API requests
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_DIMENSION = 500;
        const TARGET_BYTES = 160 * 1024;
        const MIN_QUALITY = 0.45;

        const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = 0.75;
        let output = canvas.toDataURL('image/jpeg', quality);

        while (output.length > TARGET_BYTES * 1.37 && quality > MIN_QUALITY) {
          quality -= 0.1;
          output = canvas.toDataURL('image/jpeg', quality);
        }

        if (output.length > TARGET_BYTES * 1.37) {
          const downscaled = document.createElement('canvas');
          downscaled.width = Math.max(180, Math.round(canvas.width * 0.8));
          downscaled.height = Math.max(180, Math.round(canvas.height * 0.8));
          downscaled.getContext('2d').drawImage(canvas, 0, 0, downscaled.width, downscaled.height);
          output = downscaled.toDataURL('image/jpeg', Math.max(MIN_QUALITY, quality));
        }

        resolve(output);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function ImageUpload({ value, onChange }) {
  const ref = useRef();
  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    try { onChange(await compressImage(file)); } catch {}
  };
  return (
    <div>
      <label className="label">Photo</label>
      <div className="relative">
        {value ? (
          <div className="relative w-full h-36 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--card-border)' }}>
            <img src={value} alt="item" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange('')}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-rose-500/80 transition-colors">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => ref.current.click()}
            className="w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-amber-500/50 hover:bg-amber-500/5"
            style={{ borderColor: 'var(--card-border)', color: 'var(--input-placeholder)' }}>
            <Camera size={18} />
            <span className="text-xs">Tap to upload photo</span>
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>
    </div>
  );
}

function ItemForm({ initial, onSave, onCancel, loading, defaultUser }) {
  const [form, setForm] = useState({
    name: '', brand: '', category: 'hoodie', purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '', status: 'available', submitted_by: defaultUser || USERS[0],
    ...initial,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, purchase_price: parseFloat(form.purchase_price) }); }}
      className="space-y-3">
      <div>
        <label className="label">Item Name <span className="text-amber-500">*</span></label>
        <input className="input" placeholder="e.g. Vintage Nike Hoodie" value={form.name}
          onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Brand <span className="text-amber-500">*</span></label>
          <input className="input" placeholder="Nike, Adidas…" value={form.brand}
            onChange={e => set('brand', e.target.value)} required />
        </div>
        <div>
          <label className="label">Price (DH) <span className="text-amber-500">*</span></label>
          <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
            value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} required />
        </div>
        <div>
          <label className="label">Status <span className="text-amber-500">*</span></label>
          {form.status === 'sold' ? (
            <div className="input flex items-center gap-2 opacity-60 cursor-not-allowed">
              <span className="badge-sold">sold</span>
            </div>
          ) : (
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
            </select>
          )}
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Purchase Date</label>
          <input className="input" type="date" value={form.purchase_date}
            onChange={e => set('purchase_date', e.target.value)} />
        </div>
        <EmployeeSelect value={form.submitted_by} onChange={v => set('submitted_by', v)} />
      </div>
      <ImageUpload value={form.image_url || ''} onChange={v => set('image_url', v)} />
      <div>
        <label className="label">Notes</label>
        <textarea className="input resize-none" rows={2} placeholder="Condition, size…"
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving…' : initial?.id ? 'Update' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}

function SellForm({ item, onSave, onCancel, loading, defaultUser }) {
  const [form, setForm] = useState({
    selling_price: '', sale_date: new Date().toISOString().split('T')[0],
    buyer_name: '', platform: 'Instagram', notes: '',
    submitted_by: defaultUser || USERS[0],
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const profit = form.selling_price ? (parseFloat(form.selling_price) - item.purchase_price).toFixed(2) : null;
  const margin = form.selling_price && parseFloat(form.selling_price) > 0
    ? (((parseFloat(form.selling_price) - item.purchase_price) / parseFloat(form.selling_price)) * 100).toFixed(1) : null;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ item_id: item.id, ...form, selling_price: parseFloat(form.selling_price) }); }}
      className="space-y-3">
      <div className="p-3 rounded-xl border flex items-center gap-3"
        style={{ background: 'rgba(245,166,35,0.07)', borderColor: 'rgba(245,166,35,0.25)' }}>
        <Tag size={14} className="text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--input-text)' }}>{item.name}</p>
          <p className="text-xs" style={{ color: 'var(--input-placeholder)' }}>{item.brand} · Cost: {fmt(item.purchase_price)}</p>
        </div>
      </div>

      {profit !== null && (
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2.5 rounded-xl text-center border ${parseFloat(profit) >= 0 ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-rose-500/8 border-rose-500/20'}`}>
            <p className="text-xs mb-0.5" style={{ color: 'var(--input-placeholder)' }}>Profit</p>
            <p className={`font-display font-bold ${parseFloat(profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(profit)}</p>
          </div>
          <div className="p-2.5 rounded-xl text-center bg-violet-500/8 border border-violet-500/20">
            <p className="text-xs mb-0.5" style={{ color: 'var(--input-placeholder)' }}>Margin</p>
            <p className="font-display font-bold text-violet-400">{margin}%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Sell Price (DH) *</label>
          <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
            value={form.selling_price} onChange={e => set('selling_price', e.target.value)} required />
        </div>
        <div>
          <label className="label">Sale Date *</label>
          <input className="input" type="date" value={form.sale_date}
            onChange={e => set('sale_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Platform</label>
          <select className="input" value={form.platform} onChange={e => set('platform', e.target.value)}>
            {['Instagram','Depop','eBay','Vinted','Facebook','Other'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Buyer Name</label>
          <input className="input" placeholder="Optional" value={form.buyer_name}
            onChange={e => set('buyer_name', e.target.value)} />
        </div>
        <EmployeeSelect value={form.submitted_by} onChange={v => set('submitted_by', v)} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Recording…' : 'Mark as Sold'}
        </button>
      </div>
    </form>
  );
}

// ── Mobile card ────────────────────────────────────────────────────
function ItemCard({ item, onEdit, onSell, onDelete }) {
  return (
    <div className="mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border" style={{ borderColor: 'var(--card-border)' }}>
            {item.image_url
              ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-400/60"><Tag size={14} /></div>
            }
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm leading-snug truncate" style={{ color: 'var(--input-text)' }}>{item.name}</p>
            <p className="text-xs" style={{ color: 'var(--input-placeholder)' }}>{item.brand || '—'} · <span className="capitalize">{item.category}</span></p>
          </div>
        </div>
        <span className={`badge-${item.status} shrink-0`}>{item.status}</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold text-sm" style={{ color: 'var(--input-text)' }}>{fmt(item.purchase_price)}</span>
          <span className="text-xs font-mono" style={{ color: 'var(--input-placeholder)' }}>{item.purchase_date}</span>
          {item.submitted_by && (
            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${USER_COLORS[item.submitted_by] || 'bg-white/5 text-[#666]'}`}>
              {item.submitted_by}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {item.status !== 'sold' && (
            <button onClick={() => onSell(item)}
              className="p-2 rounded-xl bg-amber-500/10 text-amber-400 active:scale-95 transition-transform">
              <ShoppingBag size={14} />
            </button>
          )}
          <button onClick={() => onEdit(item)}
            className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-transform"
            style={{ color: 'var(--input-placeholder)' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(item)}
            className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400/60 hover:text-rose-400 active:scale-95 transition-transform">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const ctx = useOutletContext();
  const toast = useToast();
  const { user } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itemsApi.list({ status: statusFilter || undefined, category: categoryFilter || undefined, search: search || undefined, sort: sortBy, order: sortOrder });
      setItems(res.data);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (selected?.id) { await itemsApi.update(selected.id, data); toast('Item updated'); }
      else              { await itemsApi.create(data); toast('Item added!'); }
      setModal(null); setSelected(null); load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleSell = async (data) => {
    setSaving(true);
    try { await salesApi.create(data); toast('Marked as sold!'); setModal(null); setSelected(null); load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await itemsApi.delete(selected.id); toast('Deleted'); setModal(null); setSelected(null); load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const openSell   = (item) => { setSelected(item); setModal('sell'); };
  const openEdit   = (item) => { setSelected(item); setModal('edit'); };
  const openDelete = (item) => { setSelected(item); setModal('delete'); };

  const toggleSort = (col) => { if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortOrder('desc'); } };
  const SortTh = ({ col, children }) => (
    <th className="th cursor-pointer hover:text-[#999] select-none whitespace-nowrap" onClick={() => toggleSort(col)}>
      <span className="flex items-center gap-1">{children}{sortBy === col && <span className="text-amber-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>}</span>
    </th>
  );

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Inventory"
        subtitle={`${items.length} items`}
        onMenuClick={() => ctx?.setMobileOpen(true)}
        actions={
          <div className="flex items-center gap-1.5">
            <ExportMenu onCSV={() => inventoryCSV(items)} onPDF={() => inventoryPDF(items)} />
            <button onClick={() => { setSelected(null); setModal('add'); }} className="btn-primary">
              <Plus size={14} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        }
      />

      <div className="p-3 lg:p-5 flex flex-col gap-3 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--input-placeholder)' }} />
            <input className="input pl-8" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <select className="input flex-1 sm:flex-none sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </select>
            <select className="input flex-1 sm:flex-none sm:w-auto" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mobile-card animate-pulse space-y-3">
                <div className="h-4 rounded w-2/3 bg-white/[0.06]" />
                <div className="h-3 rounded w-1/2 bg-white/[0.04]" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="mobile-card text-center py-10 text-sm" style={{ color: 'var(--input-placeholder)' }}>
              No items found. Tap <strong>+</strong> to add your first item.
            </div>
          ) : (
            items.map(item => (
              <ItemCard key={item.id} item={item} onEdit={openEdit} onSell={openSell} onDelete={openDelete} />
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="border-b" style={{ borderColor: 'var(--card-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <SortTh col="name">Name</SortTh>
                  <th className="th">Brand / Category</th>
                  <SortTh col="purchase_price">Cost</SortTh>
                  <SortTh col="purchase_date">Date</SortTh>
                  <SortTh col="status">Status</SortTh>
                  <th className="th">Employee</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="table-row">
                      {Array.from({ length: 7 }).map((_, j) => <td key={j} className="td"><div className="h-4 rounded bg-white/[0.05] animate-pulse w-3/4" /></td>)}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="td text-center py-12" style={{ color: 'var(--input-placeholder)' }}>No items found.</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="table-row">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: 'var(--card-border)' }}>
                            {item.image_url
                              ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-400/50"><Tag size={12} /></div>
                            }
                          </div>
                          <div>
                            <p className="font-medium leading-none" style={{ color: 'var(--input-text)' }}>{item.name}</p>
                            {item.notes && <p className="text-xs mt-0.5 truncate max-w-[160px]" style={{ color: 'var(--input-placeholder)' }}>{item.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <p style={{ color: 'var(--input-text)' }}>{item.brand || '—'}</p>
                        <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--input-placeholder)' }}>{item.category}</p>
                      </td>
                      <td className="td font-mono" style={{ color: 'var(--input-text)' }}>{fmt(item.purchase_price)}</td>
                      <td className="td text-xs font-mono" style={{ color: 'var(--input-placeholder)' }}>{item.purchase_date}</td>
                      <td className="td"><span className={`badge-${item.status}`}>{item.status}</span></td>
                      <td className="td">
                        {item.submitted_by && <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${USER_COLORS[item.submitted_by] || 'bg-white/5 text-[#666]'}`}>{item.submitted_by}</span>}
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          {item.status !== 'sold' && (
                            <button onClick={() => openSell(item)} className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"><ShoppingBag size={13} /></button>
                          )}
                          <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--input-placeholder)' }}><Edit2 size={13} /></button>
                          <button onClick={() => openDelete(item)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400/60 hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
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

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => { setModal(null); setSelected(null); }} title={modal === 'edit' ? 'Edit Item' : 'Add New Item'}>
        <ItemForm initial={selected} onSave={handleSave} onCancel={() => { setModal(null); setSelected(null); }} loading={saving} defaultUser={user} />
      </Modal>
      <Modal open={modal === 'sell'} onClose={() => { setModal(null); setSelected(null); }} title="Record Sale">
        {selected && <SellForm item={selected} onSave={handleSell} onCancel={() => { setModal(null); setSelected(null); }} loading={saving} defaultUser={user} />}
      </Modal>
      <Modal open={modal === 'delete'} onClose={() => { setModal(null); setSelected(null); }} title="Delete Item" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--input-placeholder)' }}>
          Delete <strong style={{ color: 'var(--input-text)' }}>{selected?.name}</strong>? Cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={() => { setModal(null); setSelected(null); }} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1" disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
