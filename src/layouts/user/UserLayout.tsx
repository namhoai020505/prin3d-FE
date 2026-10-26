import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import Footer from './Footer';

export default function UserLayout() {
  const location = useLocation();
  const isStudioPage = location.pathname === '/create';

  return (
    <div className="min-h-screen w-full bg-[#F6F3EE] text-[#231F1E] flex overflow-x-hidden selection:bg-[#B83B2A]/15 selection:text-[#B83B2A]">
      {/* Left Sidebar Navigation */}
      <UserSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative pl-[64px] md:pl-[72px]">
        {/* Page Content with View Transition Name for smooth continuous conveyor slide */}
        <main
          style={{ viewTransitionName: 'app-main-content' }}
          className={`app-main-content flex-1 w-full ${isStudioPage ? 'h-screen overflow-hidden' : ''}`}
        >
          <Outlet />
        </main>

        {/* Footer rendered on standard pages, excluded from full-screen Studio */}
        {!isStudioPage && <Footer />}
      </div>
    </div>
  );
}
