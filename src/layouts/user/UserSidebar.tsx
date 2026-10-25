import { useState, useEffect, useRef } from 'react';
import { useVTNavigate as useNavigate } from '../../hooks/useVTNavigate';
import {
  User as UserIcon,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import logoTheBoy from '../../assets/images/LOGOTheBoy.png';
import { AUTH_SESSION_EVENT, getAccessToken, getAuthFullName } from '../../lib/auth';
import { getMe, logout, type CurrentUserDto } from '../../services/authService';

export default function UserSidebar() {
  const navigate = useNavigate();
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



  const handleProfileClick = () => {
    if (isLoggedIn) {
      setIsAccountMenuOpen(!isAccountMenuOpen);
    } else {
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        document.startViewTransition(() => {
          navigate('/login', { viewTransition: true });
        });
      } else {
        navigate('/login', { viewTransition: true });
      }
    }
  };

  const handleLogoClick = () => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        navigate('/', { viewTransition: true });
      });
    } else {
      navigate('/', { viewTransition: true });
    }
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    await logout();
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        navigate('/', { viewTransition: true });
      });
    } else {
      navigate('/', { viewTransition: true });
    }
  };

  return (
    <>
      <aside
        data-choreo="sidebar"
        className="fixed left-0 top-0 bottom-0 w-[64px] md:w-[72px] bg-[#F6F3EE] border-r border-[#E2D9D0] flex flex-col items-center justify-between py-3 z-50 select-none shadow-sm overflow-y-auto overflow-x-hidden no-scrollbar transition-colors duration-300"
      >
        {/* Top Section: LOGOTheBoy & Navigation */}
        <div className="flex flex-col items-center w-full gap-2.5">
          {/* LOGOTheBoy at top */}
          <div
            onClick={handleLogoClick}
            className="relative w-10 h-10 rounded-xl cursor-pointer hover:scale-105 transition-all flex items-center justify-center group bg-[#FDF2F0] border border-[#B83B2A]/40 shadow-sm"
            title="Idea2Model - Về trang chủ"
          >
            <img
              src={logoTheBoy}
              alt="Idea2Model Logo"
              className="w-7 h-7 object-contain rounded-lg filter group-hover:brightness-105 transition-all"
            />

          </div>

          {/* User profile button - dynamic based on auth status */}
          <div className="relative">
            <button
              type="button"
              onClick={handleProfileClick}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm cursor-pointer group ${
                isLoggedIn
                  ? 'border-[#B83B2A]/40 bg-[#FDF2F0] text-[#B83B2A] hover:bg-[#B83B2A] hover:text-white'
                  : 'border-[#E2D9D0] bg-[#FFFFFF] hover:bg-[#F6F3EE] hover:border-[#B83B2A] text-[#7A706C] hover:text-[#231F1E]'
              }`}
              title={isLoggedIn ? `Tài khoản: ${fullName || 'Người dùng'}` : 'Đăng nhập / Đăng ký'}
            >
              {isLoggedIn ? (
                <span className="text-xs font-bold uppercase text-white">
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
                className="absolute left-full ml-3 top-0 w-52 bg-[#FFFFFF] border border-[#E2D9D0] rounded-2xl shadow-xl p-2 z-[60] text-xs text-[#231F1E] flex flex-col gap-1 backdrop-blur-md"
              >
                <div className="px-3 py-2 border-b border-[#E2D9D0] space-y-1">
                  <p className="font-bold text-[#231F1E] truncate">{fullName || 'Người dùng'}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#7A706C] font-mono">
                    <span>Lượt Free: {currentUser?.freeTrialRemaining ?? 0}</span>
                    <span>Mua: {currentUser?.purchasedRemaining ?? 0}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/profile', { viewTransition: true });
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#F6F3EE] text-left text-[#231F1E] flex items-center justify-between cursor-pointer"
                >
                  <span>Hồ sơ cá nhân</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7A706C]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/my-bookings', { viewTransition: true });
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#F6F3EE] text-left text-[#231F1E] flex items-center justify-between cursor-pointer"
                >
                  <span>Đơn in 3D của tôi</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7A706C]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/ticket-prices', { viewTransition: true });
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#F6F3EE] text-left text-[#231F1E] flex items-center justify-between cursor-pointer"
                >
                  <span>Bảng giá & Gói in 3D</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#7A706C]" />
                </button>
                <div className="h-[1px] bg-[#E2D9D0] my-0.5" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-lg hover:bg-[#FDF2F0] text-left text-[#B83B2A] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}
