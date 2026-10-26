import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import {
  User as UserIcon,
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
import {
  AUTH_SESSION_EVENT,
  getAccessToken,
  getAuthFullName,
  getRoleFromAccessToken,
  isAdminRole,
  isManagerRole,
  isStaffRole,
} from '../../lib/auth';
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
  const roleFromToken = getRoleFromAccessToken(token);
  const isManagementUser = Boolean(
    (currentUser && (isAdminRole(currentUser.role) || isStaffRole(currentUser.role) || isManagerRole(currentUser.role))) ||
    (roleFromToken && (isAdminRole(roleFromToken) || isStaffRole(roleFromToken) || isManagerRole(roleFromToken)))
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

  const managementPath = isStaffRole(currentUser?.role || roleFromToken) ? '/staff/reviews' : '/admin/orders';

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
            path: managementPath,
            icon: LayoutDashboard,
            isActive: location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff'),
          },
        ]
      : []),
  ];

  return (
    <>
      <aside
        data-choreo="sidebar"
        style={{ viewTransitionName: 'app-sidebar' }}
        className="app-sidebar fixed left-0 top-0 bottom-0 w-[64px] md:w-[72px] bg-[#FFFFFF] border-r border-[#E2D9D0] flex flex-col items-center justify-between pt-3.5 pb-4 md:pb-5 z-[60] select-none shadow-[2px_0_12px_rgba(0,0,0,0.03)] overflow-visible transition-colors duration-300"
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
              className="w-8 h-8 object-contain rounded-lg filter group-hover:brightness-105 transition-all"
            />
          </div>

          {/* User profile button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleProfileClick}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm cursor-pointer group ${
                isLoggedIn
                  ? 'border-[#B83B2A]/30 bg-[#FDF2F0] text-[#B83B2A] hover:bg-[#fce9e6]'
                  : 'border-[#E2D9D0] bg-[#FFFFFF] hover:bg-[#EFEAE2] text-[#7A706C] hover:text-[#231F1E]'
              }`}
              title={isLoggedIn ? `Tài khoản: ${fullName || 'Người dùng'}` : 'Đăng nhập / Đăng ký'}
            >
              {isLoggedIn ? (
                <span className="text-xs font-bold uppercase text-[#B83B2A]">
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
                className="absolute left-full ml-3 top-0 w-60 bg-[#FFFFFF] border border-[#E2D9D0] rounded-2xl shadow-[0_12px_36px_rgba(35,31,30,0.12)] p-2 z-[70] text-xs text-[#231F1E] flex flex-col gap-1 backdrop-blur-md"
              >
                <div className="px-3 py-2.5 border-b border-[#E2D9D0] space-y-1 bg-[#EFEAE2]/30 rounded-t-xl">
                  <p className="font-bold text-[#231F1E] truncate text-sm">{fullName || 'Người dùng'}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#B83B2A] font-medium">
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
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#EFEAE2] text-left text-[#7A706C] hover:text-[#231F1E] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Hồ sơ cá nhân</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7A706C]/60" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/my-bookings');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#EFEAE2] text-left text-[#7A706C] hover:text-[#231F1E] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Đơn in 3D của tôi</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7A706C]/60" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/ticket-prices');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#EFEAE2] text-left text-[#7A706C] hover:text-[#231F1E] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Bảng giá & Gói in 3D</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7A706C]/60" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('idea2model:open-ai-consent-modal'));
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#FDF2F0] text-left text-[#7A706C] hover:text-[#B83B2A] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#B83B2A]" />
                    <span>Điều khoản AI &amp; Bản quyền</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#B83B2A]/60" />
                </button>
                {isManagementUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      navigate(managementPath);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#FDF2F0] hover:bg-[#fce9e6] text-left text-[#B83B2A] border border-[#B83B2A]/30 flex items-center justify-between cursor-pointer font-bold shadow-sm transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#B83B2A]" />
                      <span>Trung tâm quản trị</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#B83B2A]" />
                  </button>
                )}
                <div className="h-[1px] bg-[#E2D9D0] my-0.5" />
                <button
                  type="button"
                  onClick={handleRevokeAllSessions}
                  className="w-full px-3 py-2 rounded-lg hover:bg-rose-50 text-left text-rose-600 flex items-center gap-2 cursor-pointer font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Đăng xuất mọi thiết bị</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#EFEAE2] text-left text-[#7A706C] hover:text-[#231F1E] flex items-center gap-2 cursor-pointer font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-8 h-[1px] bg-[#E2D9D0] my-1" />

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
                        ? 'bg-[#FDF2F0] text-[#B83B2A] border border-[#B83B2A]/30 shadow-sm before:absolute before:left-[-8px] before:top-2 before:bottom-2 before:w-[3px] before:bg-[#B83B2A] before:rounded-r-full'
                        : 'text-[#7A706C] hover:text-[#231F1E] hover:bg-[#EFEAE2] border border-transparent'
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </button>

                  {/* Tooltip on right */}
                  <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#231F1E] text-white text-xs rounded-lg whitespace-nowrap shadow-md z-[70] transition-all duration-150 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 font-medium">
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
