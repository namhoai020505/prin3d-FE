import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import {
  User as UserIcon,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Zap,
  Home,
  Box,
  Package,
  Tag,
  LayoutDashboard,
} from 'lucide-react';
import logoTheBoy from '../../assets/images/LOGOTheBoy.png';
import { AUTH_SESSION_EVENT, getAccessToken, getAuthFullName, isAdminRole, isStaffRole } from '../../lib/auth';
import { getMe, logout, revokeAllSessions, type CurrentUserDto } from '../../services/authService';
import NotificationBellV2 from '../../components/NotificationBellV2';

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [fullName, setFullName] = useState<string | null>(() => getAuthFullName());
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Sync auth state & fetch live credits
  useEffect(() => {
    const handleAuthChange = () => {
      setToken(getAccessToken());
      setFullName(getAuthFullName());
    };
    window.addEventListener(AUTH_SESSION_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleAuthChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (token) {
      void getMe()
        .then((profile) => {
          if (isMounted) setCurrentUser(profile);
        })
        .catch(() => {});
    } else {
      void Promise.resolve().then(() => {
        if (isMounted) setCurrentUser(null);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAccountMenuOpen]);

  const isLoggedIn = Boolean(token);
  const isManagementUser = Boolean(
    currentUser && (isAdminRole(currentUser.role) || isStaffRole(currentUser.role) || currentUser.role === 'admin' || currentUser.role === 'staff')
  );

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setIsAccountMenuOpen(!isAccountMenuOpen);
    } else {
      window.dispatchEvent(
        new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }),
      );
    }
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    await logout();
    navigate('/');
  };

  const handleRevokeAllSessions = async () => {
    setIsAccountMenuOpen(false);
    if (!window.confirm('Bạn có chắc muốn đăng xuất khỏi mọi thiết bị?')) return;
    await revokeAllSessions();
    navigate('/');
    window.dispatchEvent(
      new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }),
    );
  };

  const navItems = [
    {
      label: 'Trang chủ',
      path: '/',
      icon: Home,
      isActive: location.pathname === '/',
    },
    {
      label: 'Studio 3D',
      path: '/create',
      icon: Box,
      isActive: location.pathname.startsWith('/create'),
    },
    {
      label: 'Đơn in 3D',
      path: '/my-bookings',
      icon: Package,
      isActive: location.pathname.startsWith('/my-bookings'),
    },
    {
      label: 'Bảng giá in',
      path: '/ticket-prices',
      icon: Tag,
      isActive: location.pathname.startsWith('/ticket-prices'),
    },
    ...(isManagementUser
      ? [
          {
            label: 'Trung tâm quản trị',
            path: '/admin/orders',
            icon: LayoutDashboard,
            isActive: location.pathname.startsWith('/admin'),
          },
        ]
      : []),
  ];

  return (
    <>
      <aside
        data-choreo="sidebar"
        style={{ viewTransitionName: 'app-sidebar' }}
        className="app-sidebar fixed left-0 top-0 bottom-0 w-[64px] md:w-[72px] bg-[#070a0f]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col items-center justify-between pt-3.5 pb-4 md:pb-5 z-[60] select-none shadow-[4px_0_24px_rgba(0,0,0,0.5)] overflow-visible transition-colors duration-300"
      >
        {/* Top: LOGOTheBoy & User Profile */}
        <div className="flex flex-col items-center w-full gap-3">
          {/* LOGOTheBoy */}
          <div
            onClick={() => handleNavClick('/')}
            className="relative w-10 h-10 rounded-xl cursor-pointer hover:scale-105 transition-all flex items-center justify-center group"
            title="Idea2Model - Về trang chủ"
          >
            <img
              src={logoTheBoy}
              alt="Idea2Model Logo"
              className="w-9 h-9 object-contain rounded-lg filter drop-shadow-[0_0_8px_rgba(0,240,255,0.35)] group-hover:brightness-110 transition-all"
            />
            <Sparkles className="absolute -top-1 -left-1 w-3 h-3 text-cyan-300 pointer-events-none drop-shadow-[0_0_4px_rgba(0,240,255,0.75)]" />
          </div>

          {/* User profile button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleProfileClick}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm cursor-pointer group ${
                isLoggedIn
                  ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                  : 'border-white/15 bg-white/[0.05] hover:bg-white/15 hover:border-cyan-400/40 text-white/80 hover:text-white'
              }`}
              title={isLoggedIn ? `Tài khoản: ${fullName || 'Người dùng'}` : 'Đăng nhập / Đăng ký'}
            >
              {isLoggedIn ? (
                <span className="text-xs font-bold uppercase text-cyan-200">
                  {(fullName || 'U').slice(0, 1)}
                </span>
              ) : (
                <UserIcon className="w-4 h-4 stroke-[2] group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Account dropdown menu */}
            {isAccountMenuOpen && (
              <div
                ref={accountMenuRef}
                className="absolute left-full ml-3 top-0 w-60 bg-[#0c1017]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(0,240,255,0.2)] p-2 z-[70] text-xs text-white flex flex-col gap-1 backdrop-blur-2xl"
              >
                <div className="px-3 py-2.5 border-b border-white/10 space-y-1">
                  <p className="font-bold text-white truncate text-sm">{fullName || 'Người dùng'}</p>
                  <div className="flex items-center justify-between text-[11px] text-cyan-300 font-medium">
                    <span>Lượt Free: {currentUser?.freeTrialRemaining ?? 0}</span>
                    <span>Mua: {currentUser?.purchasedRemaining ?? 0}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left text-white/85 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Hồ sơ cá nhân</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/my-bookings');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left text-white/85 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Đơn in 3D của tôi</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/ticket-prices');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left text-white/85 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Bảng giá & Gói in 3D</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('idea2model:open-ai-consent-modal'));
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-cyan-950/40 text-left text-cyan-300 hover:text-cyan-200 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Điều khoản AI &amp; Bản quyền</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400/60" />
                </button>
                {isManagementUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate('/admin/orders');
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-left text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 flex items-center justify-between cursor-pointer font-bold shadow-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Trung tâm quản trị</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                )}
                <div className="h-[1px] bg-white/10 my-0.5" />
                <button
                  type="button"
                  onClick={handleRevokeAllSessions}
                  className="w-full px-3 py-2 rounded-lg hover:bg-rose-950/40 text-left text-rose-300 hover:text-rose-200 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Đăng xuất mọi thiết bị</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-8 h-[1px] bg-white/10 my-1" />

          {/* Central Vertical Nav Items */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.path} className="relative group flex items-center justify-center w-full">
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      item.isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,255,0.2)] before:absolute before:left-[-8px] before:top-2 before:bottom-2 before:w-[3px] before:bg-cyan-400 before:rounded-r-full before:shadow-[0_0_8px_#00f0ff]'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] border border-transparent'
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </button>

                  {/* Tooltip on right */}
                  <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#0c1017] border border-cyan-500/30 text-cyan-200 text-xs rounded-lg whitespace-nowrap shadow-[0_0_15px_rgba(0,240,255,0.15)] z-[70] transition-all duration-150 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 font-medium backdrop-blur-md">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: In-App Notification Bell */}
        <div className="flex flex-col items-center w-full gap-2">
          {isLoggedIn && <NotificationBellV2 placement="sidebar" />}
        </div>
      </aside>
    </>
  );
}
