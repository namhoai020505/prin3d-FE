import { NavLink, useNavigate, Link } from 'react-router-dom';
import { clearAuthSession, getCurrentUserProfile, isAdminRole } from '../../lib/auth';

export function StaffSidebar({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const navigate = useNavigate();
  const profile = getCurrentUserProfile();
  const admin = isAdminRole(profile?.role);
  const navItems = [
    { to: '/staff/reviews', label: 'Thẩm định mẫu in 3D' },
    { to: '/staff/fulfillment', label: 'Điều phối xưởng Kanban' },
    { to: '/staff/orders', label: 'Danh sách đơn hàng' },
    { to: '/staff/defects', label: 'Xử lý khiếu nại lỗi' },
  ];
  return <aside className="staff-sidebar">
    <Link to="/" className="p-4 font-bold">PRIN3D THE BOYS</Link>
    <nav aria-label="Điều hướng Staff" className="flex-1 p-3 space-y-2">
      {navItems.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `staff-nav ${isActive ? 'active' : ''}`}>{item.label}</NavLink>)}
      {admin && <Link to="/admin/orders" className="staff-nav">Cổng quản trị Admin</Link>}
      <Link to="/" className="staff-nav">Về trang chủ</Link>
    </nav>
    <div className="p-3 space-y-3">
      <button type="button" className="staff-button w-full" onClick={onToggleTheme}>{isDark ? 'Chuyển chế độ sáng' : 'Chuyển chế độ tối'}</button>
      <p className="text-sm">{profile?.fullName || 'Kỹ thuật viên'}</p>
      <button type="button" className="staff-button w-full" onClick={() => {
        clearAuthSession(); navigate('/');
        window.dispatchEvent(new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }));
      }}>Đăng xuất</button>
    </div>
  </aside>;
}
export default StaffSidebar;
