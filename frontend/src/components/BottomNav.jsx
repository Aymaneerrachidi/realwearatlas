import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Receipt, MoreHorizontal } from 'lucide-react';

const TABS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package,         label: 'Inventory' },
  { to: '/sales',     icon: ShoppingBag,     label: 'Sales'     },
  { to: '/expenses',  icon: Receipt,         label: 'Expenses'  },
];

export default function BottomNav({ onMoreClick }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--header-bg)',
        borderTop: '1px solid var(--card-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 px-3 min-w-[56px] transition-colors
               ${isActive ? 'text-amber-400' : 'text-[#666]'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-amber-500/15' : ''}`}>
                  <Icon size={20} />
                </span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center gap-1 py-2.5 px-3 min-w-[56px] text-[#666] transition-colors"
        >
          <span className="p-1 rounded-xl">
            <MoreHorizontal size={20} />
          </span>
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
