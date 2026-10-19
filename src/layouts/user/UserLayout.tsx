import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';

export default function UserLayout() {
  const location = useLocation();
  const isStudioPage = location.pathname === '/create';

  return (
    <div className="min-h-screen w-full bg-[#08090a] text-slate-100 flex overflow-x-hidden selection:bg-[#FFD166] selection:text-black">
      {/* Left Sidebar Navigation */}
      <UserSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative pl-[68px] md:pl-[72px]">
        {/* Page Content */}
        <main className={`flex-1 w-full ${isStudioPage ? 'h-screen overflow-hidden' : 'pt-4'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
