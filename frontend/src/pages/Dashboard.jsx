import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DollarSign, TrendingUp, ShoppingBag, Package, Layers, ArrowUpRight, Percent, Wallet } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import { dashboardApi } from '../api/client';

const COLORS = ['#f5a623','#4ade80','#60a5fa','#f87171','#a78bfa','#34d399'];
const fmt = (v) => `${Number(v || 0).toFixed(2)} DH`;
const fmtShort = (v) => {
  const n = Number(v || 0);
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k DH`;
  return `${n.toFixed(0)} DH`;
};
const fmtDate = (str) => {
  if (!str) return str;
  if (str.includes('-W')) { const [yr, wk] = str.split('-W'); return `W${wk}`; }
  const [yr, mo] = str.split('-');
  return new Date(yr, mo - 1).toLocaleString('en-US', { month: 'short' });
};

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="font-medium mb-1 text-xs" style={{ color: 'var(--input-text)' }}>{fmtDate(label) || label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-3 text-xs">
          <span style={{ color: 'var(--input-placeholder)' }}>{p.name}</span>
          <span className="font-mono">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip text-xs">
      <p style={{ color: 'var(--input-text)' }}>{payload[0].name}</p>
      <p className="font-mono text-amber-400">{fmt(payload[0].value)}</p>
    </div>
  );
}

const PERIODS = [
  { label: '7D',  from: () => d(-7),   period: 'week'  },
  { label: '1M',  from: () => d(-30),  period: 'month' },
  { label: '3M',  from: () => d(-90),  period: 'month' },
  { label: '1Y',  from: () => d(-365), period: 'month' },
  { label: 'All', from: () => null,    period: 'month' },
];
function d(days) {
  const dt = new Date(); dt.setDate(dt.getDate() + days);
  return dt.toISOString().split('T')[0];
}

export default function Dashboard() {
  const ctx = useOutletContext();
  const [activePeriod, setActivePeriod] = useState(1);
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expBreakdown, setExpBreakdown] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const p = PERIODS[activePeriod];
    const from = p.from();
    const to = new Date().toISOString().split('T')[0];
    const params = from ? { from, to } : { to };
    try {
      const [s, r, c, e, a] = await Promise.all([
        dashboardApi.stats(params),
        dashboardApi.revenueOverTime({ ...params, period: p.period }),
        dashboardApi.categoryBreakdown(params),
        dashboardApi.expensesBreakdown(params),
        dashboardApi.recentActivity(),
      ]);
      setStats(s); setRevenue(r); setCategories(c); setExpBreakdown(e); setActivity(a);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [activePeriod]);

  useEffect(() => { load(); }, [load]);

  const KPI = loading ? null : [
    { label: 'Revenue',    value: `${Number(stats?.total_revenue||0).toFixed(2)} DH`,   icon: DollarSign,  color: 'amber'   },
    { label: 'Net Profit', value: `${Number(stats?.net_profit||0).toFixed(2)} DH`,      icon: TrendingUp,  color: 'emerald' },
    { label: 'Expenses',   value: `${Number(stats?.total_expenses||0).toFixed(2)} DH`,  icon: Wallet,      color: 'rose'    },
    { label: 'Margin',     value: `${stats?.margin || 0}%`,                             icon: Percent,     color: 'violet'  },
    { label: 'Sold',       value: stats?.total_sold || 0,                               icon: ShoppingBag, color: 'blue'    },
    { label: 'In Stock',   value: stats?.available || 0,                                icon: Package,     color: 'amber'   },
    { label: 'Reserved',   value: stats?.reserved || 0,                                 icon: Layers,      color: 'violet'  },
    { label: 'Stock Value',value: `${Number(stats?.inventory_value||0).toFixed(2)} DH`, icon: ArrowUpRight,color: 'emerald' },
  ];

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle="Business overview"
        onMenuClick={() => ctx?.setMobileOpen(true)}
        actions={
          /* Period filter — horizontal scroll on mobile */
          <div className="scroll-x-hide flex items-center gap-1 p-1 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)' }}>
            {PERIODS.map((p, i) => (
              <button key={p.label} onClick={() => setActivePeriod(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                            ${activePeriod === i ? 'bg-amber-500 text-black' : 'text-[#888] hover:text-[#e8e8e6]'}`}>
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 p-3 lg:p-5 space-y-3 lg:space-y-5 animate-fade-in">

        {/* KPI Grid — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="stat-card animate-pulse">
                  <div className="h-3 rounded w-2/3 bg-white/[0.06]" />
                  <div className="h-6 rounded w-1/2 bg-white/[0.06]" />
                </div>
              ))
            : KPI.map(k => <StatCard key={k.label} {...k} />)
          }
        </div>

        {/* Revenue chart */}
        <div className="card p-4 lg:p-5">
          <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--input-text)' }}>
            Revenue & Profit
          </h3>
          {revenue.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm" style={{ color: 'var(--input-placeholder)' }}>
              No sales data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenue} margin={{ top: 5, right: 0, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f5a623" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" tickFormatter={fmtDate} tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={55} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f5a623" strokeWidth={2} fill="url(#gRev)" />
                <Area type="monotone" dataKey="profit"  name="Profit"  stroke="#4ade80" strokeWidth={2} fill="url(#gPro)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Category bar chart */}
          <div className="card p-4 lg:p-5 lg:col-span-2">
            <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--input-text)' }}>Sales by Category</h3>
            {categories.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-sm" style={{ color: 'var(--input-placeholder)' }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={categories} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="category" tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={55} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#f5a623" radius={[4,4,0,0]} />
                  <Bar dataKey="profit"  name="Profit"  fill="#4ade80" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Expenses pie */}
          <div className="card p-4 lg:p-5">
            <h3 className="font-display font-semibold mb-3" style={{ color: 'var(--input-text)' }}>Expenses</h3>
            {expBreakdown.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-sm" style={{ color: 'var(--input-placeholder)' }}>No data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={expBreakdown} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={50} innerRadius={28} paddingAngle={3}>
                      {expBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                  {expBreakdown.map((e, i) => (
                    <div key={e.category} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="capitalize truncate" style={{ color: 'var(--input-placeholder)' }}>{e.category}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <h3 className="font-display font-semibold text-sm lg:text-base" style={{ color: 'var(--input-text)' }}>Recent Activity</h3>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--input-placeholder)' }}>No recent activity</p>
          ) : (
            <div>
              {activity.map((item) => (
                <div key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: 'var(--card-border)' }}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                    item.type === 'sale' ? 'bg-amber-500/10 text-amber-400' :
                    item.type === 'expense' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {item.type === 'sale' ? '$' : item.type === 'expense' ? '−' : '+'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--input-text)' }}>{item.title}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--input-placeholder)' }}>{item.type} · {item.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-mono font-medium ${item.type === 'expense' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {item.type === 'expense' ? '-' : ''}{fmt(item.amount)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--input-placeholder)' }}>{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
