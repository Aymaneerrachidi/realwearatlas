import { useOutletContext } from 'react-router-dom';
import { Sun, Moon, Github, Globe, Instagram, Info } from 'lucide-react';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-white/[0.06] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#e8e8e6]">{label}</p>
        {description && <p className="text-xs text-[#555] mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-200 ${checked ? 'bg-amber-500' : 'bg-white/10'}`}
      style={{ height: 22 }}
    >
      <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`}
        style={{ width: 18, height: 18 }} />
    </button>
  );
}

export default function Settings() {
  const ctx = useOutletContext();
  const { isDark, toggle } = useTheme();

  return (
    <div className="flex flex-col flex-1">
      <Header title="Settings" subtitle="App preferences" onMenuClick={() => ctx?.setMobileOpen(true)} />

      <div className="p-3 lg:p-5 space-y-3 lg:space-y-5 max-w-2xl animate-fade-in">

        {/* Appearance */}
        <section className="card p-5">
          <h3 className="font-display font-semibold text-[#e8e8e6] mb-1">Appearance</h3>
          <p className="text-xs text-[#555] mb-4">Customize how RealWear Atlas looks</p>
          <SettingRow label="Dark Mode" description="Switch between dark and light theme">
            <div className="flex items-center gap-2">
              <Sun size={14} className={isDark ? 'text-[#555]' : 'text-amber-400'} />
              <Toggle checked={isDark} onChange={toggle} />
              <Moon size={14} className={isDark ? 'text-amber-400' : 'text-[#555]'} />
            </div>
          </SettingRow>
        </section>

        {/* Business Info */}
        <section className="card p-5">
          <h3 className="font-display font-semibold text-[#e8e8e6] mb-1">Business Info</h3>
          <p className="text-xs text-[#555] mb-4">Your store details</p>
          <div className="space-y-3">
            <div>
              <label className="label">Store Name</label>
              <input className="input" defaultValue="My Thrift Store" />
            </div>
            <div>
              <label className="label">Instagram Handle</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555] text-sm">@</span>
                <input className="input pl-7" placeholder="yourhandle" />
              </div>
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="MAD">MAD (د.م.)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <button className="btn-primary">Save Changes</button>
          </div>
        </section>

        {/* Data */}
        <section className="card p-5">
          <h3 className="font-display font-semibold text-[#e8e8e6] mb-1">Data</h3>
          <p className="text-xs text-[#555] mb-4">Export and manage your data</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost text-sm">Export Inventory CSV</button>
            <button className="btn-ghost text-sm">Export Sales CSV</button>
          </div>
        </section>

        {/* About */}
        <section className="card p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Info size={14} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[#e8e8e6]">RealWear Atlas</h3>
              <p className="text-xs text-[#555] mt-1">Version 1.0.0 — Thrift Business Manager</p>
              <p className="text-xs text-[#444] mt-2 leading-relaxed">
                Track your thrift resale business with ease. Manage inventory, record sales,
                track expenses, and visualize your profits — all in one place.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
