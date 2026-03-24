import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Package, ShoppingBag, Receipt, Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import Header from '../components/Header';
import { activityApi } from '../api/client';
import { useToast } from '../components/Toast';

const USERS = ['Aymane', 'Zaid'];
const ACTIONS = ['created', 'updated', 'deleted'];
const ENTITIES = ['item', 'sale', 'expense'];

const ACTION_META = {
  created: { icon: Plus,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Created' },
  updated: { icon: Edit2,   color: 'text-amber-400  bg-amber-500/10  border-amber-500/20',  label: 'Updated' },
  deleted: { icon: Trash2,  color: 'text-rose-400   bg-rose-500/10   border-rose-500/20',   label: 'Deleted' },
};

const ENTITY_META = {
  item:    { icon: Package,     color: 'text-blue-400',   label: 'Item'    },
  sale:    { icon: ShoppingBag, color: 'text-amber-400',  label: 'Sale'    },
  expense: { icon: Receipt,     color: 'text-violet-400', label: 'Expense' },
};

const USER_COLORS = {
  Aymane: 'from-amber-400 to-orange-500',
  Zaid:   'from-blue-400 to-violet-500',
};

function formatDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt.replace(' ', 'T') + 'Z');
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DetailsExpand({ details }) {
  const [open, setOpen] = useState(false);
  let parsed = {};
  try { parsed = JSON.parse(details || '{}'); } catch { return null; }
  const keys = Object.keys(parsed);
  if (!keys.length) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[10px] text-[#555] hover:text-[#888] transition-colors"
      >
        {open ? 'Hide details ▲' : 'View details ▼'}
      </button>
      {open && (
        <div className="mt-1.5 pl-3 border-l border-white/[0.07] space-y-0.5">
          {keys.map(k => {
            const v = parsed[k];
            if (v && typeof v === 'object' && 'from' in v && 'to' in v) {
              return (
                <p key={k} className="text-[10px] text-[#666]">
                  <span className="text-[#888] font-medium capitalize">{k}</span>{' '}
                  <span className="text-rose-400 line-through">{String(v.from ?? '—')}</span>
                  {' → '}
                  <span className="text-emerald-400">{String(v.to ?? '—')}</span>
                </p>
              );
            }
            return (
              <p key={k} className="text-[10px] text-[#666]">
                <span className="text-[#888] font-medium capitalize">{k}:</span> {String(v ?? '—')}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function History() {
  const ctx = useOutletContext();
  const toast = useToast();
  const [log, setLog] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await activityApi.list({
        user: userFilter || undefined,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: LIMIT,
        offset: page * LIMIT,
      });
      setLog(res.data);
      setTotal(res.total);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [userFilter, actionFilter, entityFilter, from, to, page]);

  useEffect(() => { setPage(0); }, [userFilter, actionFilter, entityFilter, from, to]);
  useEffect(() => { load(); }, [load]);

  // Group by date
  const grouped = log.reduce((acc, entry) => {
    const date = entry.created_at?.split(' ')[0] || entry.created_at?.split('T')[0] || 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Activity History"
        subtitle={`${total} total events`}
        onMenuClick={() => ctx?.setMobileOpen(true)}
      />

      <div className="p-3 lg:p-5 flex flex-col gap-3 lg:gap-4 animate-fade-in">
        {/* User stats */}
        <div className="grid grid-cols-2 gap-3">
          {USERS.map(u => {
            const count = log.filter(e => e.user_name === u).length;
            return (
              <button
                key={u}
                onClick={() => setUserFilter(v => v === u ? '' : u)}
                className={`card p-4 flex items-center gap-3 text-left transition-all hover:border-white/[0.12]
                            ${userFilter === u ? 'border-amber-500/30 bg-amber-500/5' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${USER_COLORS[u] || 'from-gray-400 to-gray-600'}
                                  flex items-center justify-center text-white font-bold shrink-0`}>
                  {u[0]}
                </div>
                <div>
                  <p className="font-medium text-[#e8e8e6]">{u}</p>
                  <p className="text-xs text-[#555]">{count} actions in view</p>
                </div>
                {userFilter === u && <span className="ml-auto text-xs text-amber-500">filtered</span>}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select className="input flex-1 min-w-[120px] lg:w-auto lg:flex-none" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
            <option value="">All Users</option>
            {USERS.map(u => <option key={u}>{u}</option>)}
          </select>
          <select className="input flex-1 min-w-[120px] lg:w-auto lg:flex-none" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
          </select>
          <select className="input flex-1 min-w-[120px] lg:w-auto lg:flex-none" value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="">All Types</option>
            {ENTITIES.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
          <div className="flex gap-2 w-full lg:w-auto">
            <input className="input flex-1 lg:w-auto" type="date" value={from} onChange={e => setFrom(e.target.value)} title="From" />
            <input className="input flex-1 lg:w-auto" type="date" value={to} onChange={e => setTo(e.target.value)} title="To" />
          </div>
          {(userFilter || actionFilter || entityFilter || from || to) && (
            <button onClick={() => { setUserFilter(''); setActionFilter(''); setEntityFilter(''); setFrom(''); setTo(''); }}
              className="btn-ghost text-xs px-3">
              Clear filters
            </button>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-white/[0.05] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/[0.05] rounded w-2/3" />
                  <div className="h-3 bg-white/[0.03] rounded w-1/3" />
                </div>
              </div>
            ))
          ) : Object.keys(grouped).length === 0 ? (
            <div className="card p-12 text-center text-[#444]">No activity recorded yet.</div>
          ) : (
            Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                <p className="text-xs font-medium text-[#444] uppercase tracking-wider mb-2 px-1">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="card overflow-hidden">
                  {entries.map((entry, i) => {
                    const action = ACTION_META[entry.action] || ACTION_META.created;
                    const entity = ENTITY_META[entry.entity_type] || ENTITY_META.item;
                    const ActionIcon = action.icon;
                    const EntityIcon = entity.icon;

                    return (
                      <div key={entry.id} className={`flex items-start gap-3.5 p-4 ${i < entries.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                        {/* Action icon */}
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${action.color}`}>
                          <ActionIcon size={13} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${entity.color}`}>
                              {entry.entity_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-[#555]">was</span>
                            <span className={`text-xs font-medium ${action.color.split(' ')[0]}`}>{action.label.toLowerCase()}</span>
                            <span className="inline-flex items-center gap-1 text-xs text-[#555]">
                              <EntityIcon size={10} /> {entry.entity_type}
                            </span>
                          </div>
                          <DetailsExpand details={entry.details} />
                        </div>

                        {/* User + time */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${USER_COLORS[entry.user_name] || 'from-gray-400 to-gray-600'}
                                              flex items-center justify-center text-white text-[9px] font-bold`}>
                              {entry.user_name?.[0]}
                            </div>
                            <span className="text-xs font-medium text-[#888]">{entry.user_name}</span>
                          </div>
                          <p className="text-[10px] text-[#444] mt-0.5 font-mono">{formatDate(entry.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed">
              ← Prev
            </button>
            <span className="text-sm text-[#666]">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
