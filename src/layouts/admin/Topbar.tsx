import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaMoon, FaPowerOff, FaSun } from 'react-icons/fa';
import { logout } from '../../services/authService';
import NotificationBellV2 from '../../components/NotificationBellV2';

interface TopbarProps {
  sidebarCollapsed: boolean;
  isLightMode: boolean;
  onToggle: () => void;
  onToggleTheme: () => void;
}

const Topbar = ({
  sidebarCollapsed,
  isLightMode,
  onToggle,
  onToggleTheme,
}: TopbarProps) => {
  const navigate = useNavigate();
  const fullName = localStorage.getItem('fullName') || 'Quản trị viên';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const iconButtonClass = [
    'grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition cursor-pointer',
    isLightMode
      ? 'border-slate-200 bg-white text-slate-600 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-700'
      : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white',
  ].join(' ');

  return (
    <header
      className={[
        'sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-4 border-b px-6 backdrop-blur-xl transition-colors',
        isLightMode
          ? 'border-slate-200 bg-white/90 text-slate-950'
          : 'border-white/10 bg-[#0B0F17]/90 text-white',
      ].join(' ')}
    >
      <button
        onClick={onToggle}
        className={iconButtonClass}
        title={sidebarCollapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
        type="button"
      >
        <FaBars />
      </button>

      <div className="min-w-0">
        <strong className="block truncate text-base font-black text-white">
          Trung Tâm Điều Hành &amp; Sản Xuất In 3D V2 — THE BOYS
        </strong>
        <span
          className={`mt-0.5 hidden truncate text-xs font-semibold sm:block ${
            isLightMode ? 'text-slate-500' : 'text-white/60'
          }`}
        >
          Giám sát chuỗi cung ứng 2 trục, duyệt kỹ thuật in 3D, đối soát PayOS &amp; bảo hành 7 ngày
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* In-App Notifications V2 Bell */}
        <NotificationBellV2 placement="topbar" />

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isLightMode ? 'Chuyển sang dark mode' : 'Chuyển sang light mode'}
          title={isLightMode ? 'Dark mode' : 'Light mode'}
          className={[
            'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-wide transition cursor-pointer',
            isLightMode
              ? 'border-slate-200 bg-slate-950 text-white hover:bg-slate-800'
              : 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-950/60',
          ].join(' ')}
        >
          {isLightMode ? <FaMoon /> : <FaSun />}
          <span className="hidden sm:inline">{isLightMode ? 'Dark' : 'Light'}</span>
        </button>

        {/* Profile Link */}
        <Link
          to="/profile"
          className={[
            'hidden min-h-10 items-center gap-2 rounded-xl border px-2.5 py-1 no-underline transition md:flex cursor-pointer',
            isLightMode
              ? 'border-slate-200 bg-white text-slate-950 hover:border-cyan-400'
              : 'border-white/10 bg-white/5 text-white hover:border-cyan-400/50 hover:bg-white/10',
          ].join(' ')}
          title="Hồ sơ"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-black text-black shadow">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="max-w-32 truncate text-xs font-black">{fullName}</div>
            <div className={`text-[10px] font-bold ${isLightMode ? 'text-slate-500' : 'text-cyan-400 font-mono'}`}>
              Administrator
            </div>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={[
            'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition cursor-pointer',
            isLightMode
              ? 'border-red-100 bg-red-50 text-red-700 hover:border-red-600 hover:bg-red-600 hover:text-white'
              : 'border-red-500/20 bg-red-500/10 text-rose-300 hover:bg-rose-600 hover:text-white',
          ].join(' ')}
          type="button"
        >
          <FaPowerOff />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
