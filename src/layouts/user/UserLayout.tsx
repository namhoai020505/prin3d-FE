import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import Footer from './Footer';

export default function UserLayout() {
  const location = useLocation();
  const isStudioPage = location.pathname === '/create';

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-white flex overflow-x-hidden selection:bg-white selection:text-black">
      {/* Left Sidebar Navigation */}
      <UserSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative pl-[64px] md:pl-[72px]">
        {/* Page Content */}
        <main className={`flex-1 w-full ${isStudioPage ? 'h-screen overflow-hidden' : ''}`}>
          <Outlet />
        </main>

        {/* Footer rendered on standard pages, excluded from full-screen Studio */}
        {!isStudioPage && <Footer />}
      </div>
    </div>
  );
}
