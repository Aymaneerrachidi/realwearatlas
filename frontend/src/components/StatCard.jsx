import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ label, value, sub, icon: Icon, trend, color = 'amber', prefix = '', suffix = '' }) {
  const colors = {
    amber:   'text-amber-400  bg-amber-500/10  border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:    'text-blue-400   bg-blue-500/10   border-blue-500/20',
    rose:    'text-rose-400   bg-rose-500/10   border-rose-500/20',
    violet:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-[#666] uppercase tracking-wide">{label}</p>
        {Icon && (
          <span className={`flex items-center justify-center w-8 h-8 rounded-xl border ${colors[color]} shrink-0`}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-[#e8e8e6] leading-none">
          {prefix}<span>{typeof value === 'number'
            ? value.toLocaleString('en-US', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })
            : value}</span>{suffix}
        </p>
        {sub && <p className="text-xs text-[#555] mt-1.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`flex items-center gap-1 text-xs mt-1.5 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}% vs last period
          </p>
        )}
      </div>
    </div>
  );
}
