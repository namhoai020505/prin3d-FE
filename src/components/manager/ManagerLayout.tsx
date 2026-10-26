import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, ChartNoAxesCombined, ClipboardCheck, CreditCard, Factory, Home, LogOut, Menu, Moon, Package, ShieldCheck, Sun, X } from 'lucide-react';
import { getCurrentUserProfile, isAdminRole } from '../../lib/auth';
import { logout } from '../../services/authService';
import NotificationBellV2 from '../NotificationBellV2';
import '../staff/staff.css';
import './manager.css';

const navigation = [
  { path: 'dashboard', label: 'Tổng quan vận hành', icon: ChartNoAxesCombined },
  { path: 'orders', label: 'Quản lý đơn hàng', icon: Package },
  { path: 'reviews', label: 'Thẩm định mẫu in 3D', icon: ClipboardCheck },
  { path: 'fulfillment', label: 'Điều phối xưởng Kanban', icon: Factory },
  { path: 'payments', label: 'Thanh toán & hoàn tiền', icon: CreditCard },
  { path: 'defects', label: 'Bảo hành & khiếu nại', icon: ShieldCheck },
];

export default function ManagerLayout() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('g2c-theme') === 'light' ? 'light' : 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profile = getCurrentUserProfile();
  const active = navigation.find(item => location.pathname.startsWith(`/manager/${item.path}`));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('g2c-light-mode', theme === 'light');
    localStorage.setItem('g2c-theme', theme);
  }, [theme]);

  return <div className="staff-portal manager-portal" data-staff-theme={theme}>
    {menuOpen && <button className="manager-backdrop" aria-label="Đóng điều hướng" onClick={() => setMenuOpen(false)} />}
    <aside className={`staff-sidebar manager-sidebar ${menuOpen ? 'is-open' : ''}`}>
      <Link className="manager-brand" to="/manager/dashboard" onClick={() => setMenuOpen(false)}><Box size={30} /><span>PRIN3D<small>THE BOYS · MANAGER</small></span></Link>
      <div className="manager-nav-label">KHÔNG GIAN QUẢN LÝ</div>
      <nav aria-label="Điều hướng Manager" className="flex-1 p-3 space-y-1">
        {navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={`/manager/${path}`} onClick={() => setMenuOpen(false)} className={({ isActive }) => `staff-nav manager-nav ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
      </nav>
      <div className="manager-sidebar-footer">
        {isAdminRole(profile?.role) && <Link className="staff-nav manager-nav" to="/admin/orders"><ShieldCheck size={18} />Cổng Admin</Link>}
        <Link className="staff-nav manager-nav" to="/"><Home size={18} />Về trang chủ</Link>
        <div className="manager-profile"><span className="manager-avatar">{profile?.fullName?.charAt(0) || 'M'}</span><div><strong>{profile?.fullName}</strong><small>{isAdminRole(profile?.role) ? 'Quản trị viên' : 'Quản lý vận hành'}</small></div><button className="manager-icon" aria-label="Đăng xuất" onClick={() => void logout().then(() => navigate('/'))}><LogOut size={18} /></button></div>
      </div>
    </aside>
    <div className="manager-workspace">
      <header className="manager-topbar">
        <button className="manager-icon manager-menu" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <div className="min-w-0"><p className="manager-eyebrow">MANAGER WORKSPACE</p><h1>{active?.label || 'Quản lý vận hành'}</h1></div>
        <div className="ml-auto flex items-center gap-2"><NotificationBellV2 placement="topbar" /><button className="manager-icon" aria-label={theme === 'dark' ? 'Chuyển chế độ sáng' : 'Chuyển chế độ tối'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button></div>
      </header>
      <main className="manager-content"><Outlet context={{ themeMode: theme, isDark: theme === 'dark', isLightMode: theme === 'light' }} /></main>
    </div>
  </div>;
}
