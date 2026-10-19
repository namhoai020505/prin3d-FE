import { Outlet } from 'react-router-dom';
import UserSidebar from './UserSidebar';

export default function UserLayout() {
  return (
    <div className="min-h-screen w-full bg-[#08090a] text-slate-100 flex overflow-x-hidden selection:bg-amber-400 selection:text-black">
      {/* Left Sidebar Navigation */}
      <UserSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative pl-[68px] md:pl-[74px]">
        {/* Page Content */}
        <main className="flex-1 w-full pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
