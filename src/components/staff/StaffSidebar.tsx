import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Kanban,
  ClipboardList,
  AlertTriangle,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Home,
} from 'lucide-react';
import { clearAuthSession, getCurrentUserProfile, isAdminRole } from '../../lib/auth';

interface StaffSidebarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export const StaffSidebar: React.FC<StaffSidebarProps> = ({ isDark, onToggleTheme }) => {
  const navigate = useNavigate();
  const profile = getCurrentUserProfile();
  const isAdmin = isAdminRole(profile?.role);

  const navItems = [
    { to: '/staff/reviews', icon: Box, label: 'Thẩm định mẫu in 3D', badge: '3' },
    { to: '/staff/fulfillment', icon: Kanban, label: 'Điều phối xưởng Kanban', badge: '5' },
    { to: '/staff/orders', icon: ClipboardList, label: 'Danh sách đơn hàng' },
    { to: '/staff/defects', icon: AlertTriangle, label: 'Xử lý khiếu nại lỗi', badge: '1' },
  ];

  const handleLogout = () => {
    clearAuthSession();
    navigate('/');
    window.dispatchEvent(
      new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } })
    );
  };

  const displayName = profile?.fullName || 'Kỹ thuật viên';
  const displayRole = isAdmin ? 'Super Admin' : 'Kỹ thuật viên SLA/FDM';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase() || 'KT';

  return (
    <aside
      className={`w-68 shrink-0 border-r flex flex-col justify-between transition-colors duration-200 select-none ${
        isDark
          ? 'bg-[#090D14] border-slate-800/80 text-slate-50'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-inherit">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.25)] group-hover:scale-105 transition-transform">
              <span className="font-mono font-bold text-[#00F0FF] text-sm">3D</span>
            </div>
            <div>
              <h1 className="font-bold tracking-wider text-sm uppercase">
                PRIN3D <span className="text-[#00F0FF]">THE BOYS</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                {isAdmin ? 'ADMIN / STAFF OPS' : 'STAFF OPS (ROLE=2)'}
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
              Dây chuyền kỹ thuật
            </p>
            <Link
              to="/"
              title="Về trang chủ khách hàng"
              className="text-slate-400 hover:text-[#00F0FF] transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_15px_rgba(0,240,255,0.18)]'
                      : isDark
                      ? 'text-slate-400 hover:bg-[#0D131F] hover:text-slate-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-[#00F0FF]/20 text-[#00F0FF]">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-inherit">
              <Link
                to="/admin/orders"
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isDark
                    ? 'bg-purple-950/20 text-purple-300 border border-purple-500/30 hover:bg-purple-900/30'
                    : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-purple-400" />
                <span>Cổng Quản Trị Admin →</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Footer & User Profile */}
      <div className="p-4 border-t border-inherit space-y-3">
        <button
          onClick={onToggleTheme}
          type="button"
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
            isDark
              ? 'bg-[#0D131F] border-slate-800 text-slate-300 hover:border-[#00F0FF]/50'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>Chế độ hiển thị</span>
          <span className="flex items-center gap-1.5 font-mono text-[#00F0FF]">
            {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            {isDark ? 'Cyberpunk Dark' : 'Clean Light'}
          </span>
        </button>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-mono text-xs font-bold text-emerald-400">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" title={displayName}>
                {displayName}
              </p>
              <p className="text-[11px] text-slate-400 font-mono truncate">{displayRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            type="button"
            className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default StaffSidebar;
