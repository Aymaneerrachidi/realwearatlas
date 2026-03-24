import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Receipt, Settings, TrendingUp, X, History } from 'lucide-react';
import { useUser, USERS } from '../context/UserContext';

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory',icon: Package,         label: 'Inventory'  },
  { to: '/sales',    icon: ShoppingBag,     label: 'Sales'      },
  { to: '/expenses', icon: Receipt,         label: 'Expenses'   },
  { to: '/history',  icon: History,         label: 'History'    },
  { to: '/settings', icon: Settings,        label: 'Settings'   },
];

const USER_GRADIENT = {
  Aymane: 'from-amber-400 to-orange-500',
  Zaid:   'from-blue-400 to-violet-500',
};

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
         ${isActive
           ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
           : 'text-[#888] hover:text-[#e8e8e6] hover:bg-white/[0.05] border border-transparent'
         }`
      }
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

function UserSwitcher() {
  const { user, switchUser } = useUser();

  return (
    <div className="px-3 pb-4 pt-3 border-t border-white/[0.07]">
      <p className="text-[10px] text-[#444] uppercase tracking-widest font-medium mb-2 px-1">Default Employee</p>
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${USER_GRADIENT[user] || 'from-gray-400 to-gray-600'}
                          flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {user?.[0]}
        </div>
        <select
          value={user}
          onChange={e => switchUser(e.target.value)}
          className="input flex-1 py-1.5 text-sm"
        >
          {USERS.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-[#444] mt-1.5 px-1">Pre-fills Employee field in forms</p>
    </div>
  );
}

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <TrendingUp size={15} className="text-black" />
          </div>
          <div>
            <p className="font-display font-bold text-base leading-none text-[#e8e8e6]">RealWear</p>
            <p className="text-[10px] text-[#666] font-mono tracking-widest uppercase mt-0.5">Atlas</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-[#666]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(n => (
          <NavItem key={n.to} {...n} onClick={() => setMobileOpen(false)} />
        ))}
      </nav>

    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/[0.07] h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col border-r border-white/[0.07] h-full animate-slide-in">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
