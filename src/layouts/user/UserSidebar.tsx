import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Sparkles,
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
        className="fixed left-0 top-0 bottom-0 w-[64px] md:w-[72px] bg-black/20 backdrop-blur-2xl border-r border-white/12 flex flex-col items-center justify-between py-3 z-50 select-none shadow-[4px_0_24px_rgba(0,0,0,0.3)] overflow-y-auto overflow-x-hidden no-scrollbar transition-colors duration-300"
      >
        {/* Top Section: LOGOTheBoy & Navigation */}
        <div className="flex flex-col items-center w-full gap-2.5">
          {/* LOGOTheBoy at top */}
          <div
            onClick={handleLogoClick}
            className="relative w-10 h-10 rounded-xl cursor-pointer hover:scale-105 transition-all flex items-center justify-center group"
            title="Idea2Model - Về trang chủ"
          >
            <img
              src={logoTheBoy}
              alt="Idea2Model Logo"
              className="w-9 h-9 object-contain rounded-lg filter drop-shadow-[0_0_8px_rgba(255,255,255,0.28)] group-hover:brightness-110 transition-all"
            />
            <Sparkles className="absolute -top-1 -left-1 w-3 h-3 text-white pointer-events-none drop-shadow-[0_0_4px_rgba(255,255,255,0.75)]" />
          </div>

          {/* User profile button - dynamic based on auth status */}
          <div className="relative">
            <button
              type="button"
              onClick={handleProfileClick}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm cursor-pointer group ${
                isLoggedIn
                  ? 'border-white/40 bg-white/15 text-white hover:bg-white/25'
                  : 'border-white/20 bg-white/[0.06] hover:bg-white/15 hover:border-white/40 text-white/80 hover:text-white'
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
                className="absolute left-full ml-3 top-0 w-52 bg-[#2b0509]/95 border border-white/20 rounded-2xl shadow-2xl p-2 z-[60] text-xs text-white flex flex-col gap-1 backdrop-blur-2xl"
              >
                <div className="px-3 py-2 border-b border-white/10 space-y-1">
                  <p className="font-bold text-white truncate">{fullName || 'Người dùng'}</p>
                  <div className="flex items-center justify-between text-[10px] text-rose-200/80 font-medium">
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
                <div className="h-[1px] bg-white/10 my-0.5" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left text-rose-200 hover:text-white flex items-center gap-2 cursor-pointer font-medium"
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
