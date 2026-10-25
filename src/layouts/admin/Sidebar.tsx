import { Link, useLocation } from 'react-router-dom';
import {
  FaBox,
  FaChartLine,
  FaCube,
  FaShieldAlt,
  FaTicketAlt,
} from 'react-icons/fa';
import logoTheBoy from '../../assets/LOGOTheBoy.png';

interface SidebarProps {
  collapsed: boolean;
  isLightMode: boolean;
}

const navItems = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard V2',
    description: 'Trung tâm điều hành 6 phân khu V2',
    icon: <FaChartLine />,
  },
  {
    to: '/create',
    label: 'Studio 3D',
    description: 'Trải nghiệm AI Studio 3D',
    icon: <FaCube />,
  },
  {
    to: '/ticket-prices',
    label: 'Biểu Phí In 3D',
    description: 'Bảng giá & Gói sản xuất SLA/FDM',
    icon: <FaBox />,
  },
  {
    to: '/my-bookings',
    label: 'Đơn In 3D',
    description: 'Quản lý đơn hàng & Timeline',
    icon: <FaTicketAlt />,
  },
] as const;

const Sidebar = ({ collapsed, isLightMode }: SidebarProps) => {
  const location = useLocation();

  const asideClass = [
    'fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r transition-all duration-200 lg:relative lg:inset-auto lg:h-screen',
    isLightMode
      ? 'border-slate-200 bg-white shadow-[12px_0_34px_rgba(15,23,42,0.08)]'
      : 'border-white/10 bg-[#090D14] shadow-[12px_0_34px_rgba(0,0,0,0.4)]',
    collapsed
      ? 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
      : 'w-72 translate-x-0',
  ].join(' ');

  return (
    <aside className={asideClass}>
      {/* Brand Header */}
      <div className={`flex min-h-[72px] items-center gap-3 border-b px-5 ${
        isLightMode ? 'border-slate-200' : 'border-white/10 bg-[#0B0F17]'
      }`}>
        <div className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-cyan-950/40 border border-cyan-500/30 shadow-lg shadow-cyan-950/50">
          <img src={logoTheBoy} alt="THE BOYS" className="w-8 h-8 object-contain drop-shadow" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <div className={`truncate text-[15px] font-black leading-tight tracking-wide ${
              isLightMode ? 'text-slate-900' : 'text-white'
            }`}>
              THE BOYS — Admin V2
            </div>
            <div className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
              isLightMode ? 'text-cyan-600' : 'text-cyan-400'
            }`}>
              Điều Hành &amp; Sản Xuất 3D
            </div>
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Admin navigation">
        {!collapsed && (
          <div className={`px-2 pb-2 text-[10px] font-black uppercase tracking-[0.16em] ${
            isLightMode ? 'text-slate-400' : 'text-white/40'
          }`}>
            Phân Hệ Quản Trị
          </div>
        )}

        {navItems.map((item) => {
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

      {/* Operator Footer Card */}
      <div className={`shrink-0 border-t p-3 ${
        isLightMode ? 'border-slate-200' : 'border-white/10 bg-[#0B0F17]'
      }`}>
        <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${
          isLightMode ? 'border-slate-200 bg-slate-50' : 'border-cyan-500/20 bg-cyan-950/20'
        }`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md">
            <FaShieldAlt />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className={`truncate text-xs font-black ${
                isLightMode ? 'text-slate-900' : 'text-white'
              }`}>
                THE BOYS Hub
              </div>
              <div className={`mt-0.5 text-[10px] font-bold ${
                isLightMode ? 'text-slate-500' : 'text-cyan-300/80 font-mono'
              }`}>
                System Operator
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
