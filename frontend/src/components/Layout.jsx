import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {/* Main content — add bottom padding on mobile so bottom nav doesn't cover content */}
      <main className="flex-1 min-w-0 flex flex-col pb-[64px] lg:pb-0">
        <Outlet context={{ setMobileOpen }} />
      </main>
      <BottomNav onMoreClick={() => setMobileOpen(true)} />
    </div>
  );
}
