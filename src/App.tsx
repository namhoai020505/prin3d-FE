import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import ConfirmDialogHost from './components/ConfirmDialogHost';
import LoginModal from './components/LoginModal';
import AiConsentModal from './components/AiConsentModal';
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
const OrderCheckoutReturn = lazy(() => import('./pages/user/OrderCheckoutReturn'));

// Admin pages
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const OrdersPage = lazy(() => import('./pages/admin/orders/OrdersPage'));
const ReviewsPage = lazy(() => import('./pages/admin/reviews/ReviewsPage'));
const AdminFulfillmentPage = lazy(() => import('./pages/admin/fulfillment/AdminFulfillmentPage'));

// Staff pages
const StaffLayout = lazy(() => import('./components/staff/StaffLayout'));
const StaffReviewsPage = lazy(() => import('./pages/staff/StaffReviewsPage'));
const StaffFulfillmentKanbanPage = lazy(() => import('./pages/staff/StaffFulfillmentKanbanPage'));
const StaffOrdersPage = lazy(() => import('./pages/staff/StaffOrdersPage'));
const StaffDefectsPage = lazy(() => import('./pages/staff/StaffDefectsPage'));

// Fallback spinner while lazy chunks are loading - Cyberpunk Dark Obsidian & Neon Cyan
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#090d14' }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#00f0ff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const customerRoles = ['customer', 'cus', 'staff', 'admin'];
const adminRoles = ['admin', 'staff'];
const staffRoles = ['staff', 'admin'];

const RootLayout = () => {
  useIdleTimeout(10);
  useMultiTabSecurity();
  useSessionHeartbeat();
  return (
    <>
      <Outlet />
      <ConfirmDialogHost />
      <LoginModal />
      <AiConsentModal />
    </>
  );
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
              { path: '/orders', element: <MyBookings /> },
              { path: '/orders/:id/checkout-return', element: <OrderCheckoutReturn /> },
              { path: '/orders/:id/checkout-cancel', element: <OrderCheckoutReturn /> },
              { path: '/checkout/success', element: <OrderCheckoutReturn /> },
              { path: '/checkout/cancel', element: <OrderCheckoutReturn /> },
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
              { index: true, element: <Navigate to="orders" replace /> },
              { path: 'orders', element: <OrdersPage /> },
              { path: 'orders/:id', element: <OrdersPage /> },
              { path: 'reviews', element: <ReviewsPage /> },
              { path: 'reviews/:generationId', element: <ReviewsPage /> },
              { path: 'fulfillment', element: <AdminFulfillmentPage /> },
              { path: 'fulfillment/:orderId', element: <AdminFulfillmentPage /> },
              { path: 'dashboard', element: <Dashboard /> },
              { path: '*', element: <Navigate to="orders" replace /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth allowedRoles={staffRoles} verifyAdmin />,
        children: [
          {
            path: '/staff',
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="reviews" replace /> },
              { path: 'reviews', element: <StaffReviewsPage /> },
              { path: 'fulfillment', element: <StaffFulfillmentKanbanPage /> },
              { path: 'fulfillment/:orderId', element: <StaffFulfillmentKanbanPage /> },
              { path: 'orders', element: <StaffOrdersPage /> },
              { path: 'defects', element: <StaffDefectsPage /> },
              { path: '*', element: <Navigate to="reviews" replace /> },
            ],
          },
        ],
      },
      // Redirect legacy paths
      { path: '/movies/*', element: <Navigate to="/" replace /> },
      { path: '/cinemas/*', element: <Navigate to="/" replace /> },
      { path: '/cinema-schedule', element: <Navigate to="/" replace /> },
      { path: '/booking/*', element: <Navigate to="/" replace /> },
      { path: '/manager/*', element: <Navigate to="/admin/orders" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

export default App;
