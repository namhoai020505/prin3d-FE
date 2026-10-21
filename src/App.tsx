import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import ConfirmDialogHost from './components/ConfirmDialogHost';
import RequireAuth from './components/RequireAuth';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { useMultiTabSecurity } from './hooks/useMultiTabSecurity';
import { useSessionHeartbeat } from './lib/sessionHeartbeat';

// Layouts — loaded eagerly
import AdminLayout from './layouts/admin/AdminLayout';
import UserLayout from './layouts/user/UserLayout';

// Auth pages
import Login from './pages/auth/Login';

// User pages
const Home = lazy(() => import('./pages/user/Home'));
const Create3DStudio = lazy(() => import('./pages/user/Create3DStudio'));
const TicketPrices = lazy(() => import('./pages/user/TicketPrices'));
const MyBookings = lazy(() => import('./pages/user/MyBookings'));
const Profile = lazy(() => import('./pages/user/Profile'));

// Admin pages
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));

// Fallback spinner while lazy chunks are loading
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#140204' }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#e11d48', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const customerRoles = ['customer', 'cus', 'staff', 'admin'];
const adminRoles = ['admin'];

const RootLayout = () => {
  useIdleTimeout(10);
  useMultiTabSecurity();
  useSessionHeartbeat();
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <Login /> },
      {
        element: <UserLayout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/create', element: <Create3DStudio /> },
          { path: '/ticket-prices', element: <TicketPrices /> },
          { path: '/pricing', element: <Navigate to="/ticket-prices" replace /> },
          {
            element: <RequireAuth allowedRoles={customerRoles} />,
            children: [
              { path: '/my-bookings', element: <MyBookings /> },
              { path: '/orders', element: <Navigate to="/my-bookings" replace /> },
              { path: '/profile', element: <Profile /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth allowedRoles={adminRoles} verifyAdmin />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <Dashboard /> },
              { path: '*', element: <Navigate to="dashboard" replace /> },
            ],
          },
        ],
      },
      // Redirect legacy paths
      { path: '/movies/*', element: <Navigate to="/" replace /> },
      { path: '/cinemas/*', element: <Navigate to="/" replace /> },
      { path: '/cinema-schedule', element: <Navigate to="/" replace /> },
      { path: '/booking/*', element: <Navigate to="/" replace /> },
      { path: '/manager/*', element: <Navigate to="/admin/dashboard" replace /> },
      { path: '/staff/*', element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
      <ConfirmDialogHost />
    </>
  );
}

export default App;
