import { Link, useLocation } from 'react-router-dom';
import {
  FaBox,
  FaChartLine,
  FaCheckDouble,
  FaCreditCard,
  FaIndustry,
  FaShieldAlt,
  FaUsersCog,
  FaArrowLeft,
} from 'react-icons/fa';
import logoTheBoy from '../../assets/LOGOTheBoy.png';
import { getRoleFromAccessToken, isAdminRole } from '../../lib/auth';

interface SidebarProps {
  collapsed: boolean;
  isLightMode: boolean;
}

interface NavItemConfig {
  to?: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  adminOnly?: boolean;
}

const navItemsConfig: NavItemConfig[] = [
  {
    to: '/admin/dashboard',
    label: 'Tổng quan & Chỉ số',
    description: 'Báo cáo thời gian thực & Vận hành hệ thống',
    icon: <FaChartLine />,
    enabled: false,
  },
  {
    to: '/admin/reviews',
    label: 'Thẩm định mẫu in',
    description: 'Kiểm định hình học & Phê duyệt in 3D',
    icon: <FaCheckDouble />,
    enabled: true,
  },
  {
    to: '/admin/orders',
    label: 'Quản lý đơn hàng',
    description: 'Danh sách đơn hàng, vận chuyển & thanh toán',
    icon: <FaBox />,
    enabled: true,
  },
  {
    to: '/admin/fulfillment',
    label: 'Điều phối xưởng',
    description: 'Dây chuyền sản xuất & Kiểm định xưởng in',
    icon: <FaIndustry />,
    enabled: true,
  },
  {
    label: 'Giao dịch & Hoàn tiền',
    description: 'Đối soát thanh toán & Xử lý hoàn tiền',
    icon: <FaCreditCard />,
    enabled: false,
  },
  {
    label: 'Bảo hành & Khiếu nại',
    description: 'Tiếp nhận khiếu nại & Đền bù sản phẩm',
    icon: <FaShieldAlt />,
    enabled: false,
  },
  {
    label: 'Quản trị hệ thống',
    description: 'Quản lý tài khoản, quyền hạn & cấu hình',
    icon: <FaUsersCog />,
    enabled: false,
    adminOnly: true,
  },
];

const Sidebar = ({ collapsed, isLightMode }: SidebarProps) => {
  const location = useLocation();
  const currentRole = getRoleFromAccessToken();
  const isAdmin = isAdminRole(currentRole);

  const asideClass = [
    'fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r transition-all duration-200 lg:relative lg:inset-auto lg:h-screen',
    isLightMode
      ? 'border-slate-200 bg-white shadow-[12px_0_34px_rgba(15,23,42,0.08)]'
      : 'border-white/10 bg-[#090D14] shadow-[12px_0_34px_rgba(0,0,0,0.4)]',
    collapsed
      ? 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
      : 'w-72 translate-x-0',
  ].join(' ');

  const filteredNavItems = navItemsConfig.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className={asideClass}>
      {/* Brand Header */}
      <div
        className={`flex min-h-[72px] items-center gap-3 border-b px-5 ${
          isLightMode ? 'border-slate-200' : 'border-white/10 bg-[#0B0F17]'
        }`}
      >
        <div className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-cyan-950/40 border border-cyan-500/30 shadow-lg shadow-cyan-950/50">
          <img src={logoTheBoy} alt="THE BOYS" className="w-8 h-8 object-contain drop-shadow" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <div
              className={`truncate text-[15px] font-black leading-tight tracking-wide ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}
            >
              THE BOYS — Admin
            </div>
            <div
              className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                isLightMode ? 'text-cyan-600' : 'text-cyan-400'
              }`}
            >
              Trung Tâm Quản Trị
            </div>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Admin navigation">
        {!collapsed && (
          <div
            className={`px-2 pb-2 text-[10px] font-black uppercase tracking-[0.16em] ${
              isLightMode ? 'text-slate-400' : 'text-white/40'
            }`}
          >
            Phân Hệ Quản Trị
          </div>
        )}

        {filteredNavItems.map((item, idx) => {
          if (!item.enabled || !item.to) {
            return (
              <div
                key={idx}
                title={collapsed ? `${item.label} (Sắp có)` : item.description}
                className={[
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-semibold select-none opacity-45 cursor-not-allowed',
                  collapsed ? 'justify-center' : 'justify-between',
                  isLightMode ? 'text-slate-400 hover:bg-slate-50' : 'text-white/35 hover:bg-white/[0.02]',
                ].join(' ')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex shrink-0 text-base">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && (
                  <span className="shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/50">
                    Sắp có
                  </span>
                )}
              </div>
            );
          }

          const isActive = location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : item.description}
              className={[
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-bold no-underline transition-all duration-150',
                collapsed ? 'justify-center' : 'justify-start',
                isActive
                  ? isLightMode
                    ? 'bg-cyan-50 text-cyan-700 shadow-[inset_3px_0_0_#00f0ff]'
                    : 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-500/30 shadow-[inset_3px_0_0_#00f0ff]'
                  : isLightMode
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-white/60 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              <span className="inline-flex shrink-0 text-base">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Return Link + Operator Status */}
      <div
        className={`shrink-0 border-t p-3 space-y-2 ${
          isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#0B0F17]'
        }`}
      >
        {/* Switch to Staff Portal Link */}
        {!collapsed && <Link to="/manager/dashboard" className="block px-3 py-2 text-xs font-bold text-cyan-500">Cổng Quản lý Manager</Link>}
        <Link
          to="/staff/reviews"
          title="Chuyển sang Cổng Kỹ thuật viên Staff"
          className={[
            'flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-bold transition-all duration-150 no-underline',
            collapsed ? 'justify-center' : 'justify-start',
            isLightMode
              ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 shadow-sm'
              : 'bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]',
          ].join(' ')}
        >
          <span className="truncate">{collapsed ? 'Staff' : 'Cổng Kỹ Thuật Staff'}</span>
        </Link>

        {/* Return to Client Portal Link */}
        <Link
          to="/"
          title="Về trang khách hàng"
          className={[
            'flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-bold transition-all duration-150 no-underline',
            collapsed ? 'justify-center' : 'justify-start',
            isLightMode
              ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10',
          ].join(' ')}
        >
          <FaArrowLeft className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          {!collapsed && <span className="truncate">Về trang khách hàng</span>}
        </Link>

        {/* Operator Badge */}
        <div
          className={`flex items-center gap-3 rounded-xl border p-2 ${
            isLightMode ? 'border-slate-200 bg-white' : 'border-cyan-500/20 bg-cyan-950/20'
          }`}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm text-xs">
            <FaShieldAlt />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div
                className={`truncate text-xs font-black ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}
              >
                THE BOYS Hub
              </div>
              <div
                className={`mt-0.5 text-[10px] font-bold ${
                  isLightMode ? 'text-slate-500' : 'text-cyan-300/80 font-mono'
                }`}
              >
                {isAdmin ? 'System Administrator' : 'Operations Staff'}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
