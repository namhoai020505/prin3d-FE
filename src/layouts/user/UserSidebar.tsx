import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Bot,
  Box,
  Layers,
  Activity,
  LayoutGrid,
  Sparkles,
  Bell,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import logoTheBoy from '../../assets/LOGOTheBoy.png';
import LoginModal from '../../components/LoginModal';
import { AUTH_SESSION_EVENT, getAccessToken, getAuthFullName } from '../../lib/auth';
import { logout } from '../../services/authService';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function UserSidebar({ activeTab, onTabChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [fullName, setFullName] = useState<string | null>(() => getAuthFullName());
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Sync auth state
  useEffect(() => {
    const handleAuthChange = () => {
      setToken(getAccessToken());
      setFullName(getAuthFullName());
    };
    window.addEventListener(AUTH_SESSION_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleAuthChange);
  }, []);

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

  // Active item determined by route or prop
  const isCreateActive =
    activeTab === 'create' ||
    activeTab === 'model' ||
    location.pathname === '/create';

  const isHomeActive = location.pathname === '/';

  const showFeatureNotice = (featureName: string) => {
    setToastNotice(`Tính năng "${featureName}" đang được phát triển.`);
    setTimeout(() => setToastNotice(null), 2500);
  };

  const handleNav = (tab: string, path?: string, featureName?: string) => {
    onTabChange?.(tab);
    if (path) {
      navigate(path);
    } else if (featureName) {
      showFeatureNotice(featureName);
    }
  };

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setIsAccountMenuOpen(!isAccountMenuOpen);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-[64px] md:w-[72px] bg-[#090a0d] border-r border-amber-500/15 flex flex-col items-center justify-between py-3 z-50 select-none shadow-[2px_0_20px_rgba(0,0,0,0.6)] overflow-y-auto overflow-x-hidden no-scrollbar">
        {/* Top Section: LOGOTheBoy & Navigation */}
        <div className="flex flex-col items-center w-full gap-2.5">
          {/* LOGOTheBoy at top */}
          <div
            onClick={() => navigate('/')}
            className="relative w-10 h-10 rounded-xl cursor-pointer hover:scale-105 transition-all flex items-center justify-center group"
            title="Idea2Model - Về trang chủ"
          >
            <img
              src={logoTheBoy}
              alt="Idea2Model Logo"
              className="w-9 h-9 object-contain rounded-lg filter drop-shadow-[0_0_8px_rgba(255,209,102,0.4)] group-hover:brightness-110 transition-all"
            />
            {/* Gold sparkle on top-left of logo */}
            <Sparkles className="absolute -top-1 -left-1 w-3 h-3 text-[#FFD166] pointer-events-none drop-shadow-[0_0_4px_#FFD166]" />
          </div>

          {/* User profile button - dynamic based on auth status */}
          <div className="relative">
            <button
              type="button"
              onClick={handleProfileClick}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm cursor-pointer group ${
                isLoggedIn
                  ? 'border-amber-400 bg-amber-400/15 text-[#FFD166] hover:bg-amber-400/25'
                  : 'border-amber-500/30 bg-amber-500/[0.06] hover:bg-amber-500/15 hover:border-[#FFD166] text-amber-300 hover:text-white'
              }`}
              title={isLoggedIn ? `Tài khoản: ${fullName || 'Người dùng'}` : 'Đăng nhập / Đăng ký'}
            >
              {isLoggedIn ? (
                <span className="text-xs font-bold uppercase text-[#FFD166]">
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
                className="absolute left-full ml-3 top-0 w-52 bg-[#12141c] border border-amber-500/30 rounded-2xl shadow-2xl p-2 z-[60] text-xs text-white flex flex-col gap-1 backdrop-blur-xl"
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="font-bold text-white truncate">{fullName || 'Người dùng'}</p>
                  <p className="text-[10px] text-amber-400 font-medium">Tài khoản chuẩn</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left text-neutral-300 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Hồ sơ cá nhân</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/my-bookings');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left text-neutral-300 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Lịch sử & Đơn hàng</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigate('/my-vouchers');
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-white/5 text-left text-neutral-300 hover:text-white flex items-center justify-between cursor-pointer"
                >
                  <span>Mã ưu đãi của tôi</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </button>
                <div className="h-[1px] bg-white/10 my-0.5" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-lg hover:bg-red-500/10 text-left text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

          {/* Navigation list */}
          <nav className="flex flex-col items-center w-full gap-2">
            {/* 1. Trang chủ / Tạo nhanh */}
            <button
              type="button"
              onClick={() => handleNav('home', '/')}
              className={`group flex flex-col items-center gap-1 w-full py-1 transition-all cursor-pointer ${
                isHomeActive ? 'text-[#FFD166]' : 'text-neutral-400 hover:text-amber-200'
              }`}
              title="Trang chủ"
            >
              <Sparkles className={`w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform ${isHomeActive ? 'text-[#FFD166] drop-shadow-[0_0_8px_#FFD166]' : ''}`} />
              <span className={`text-[10px] font-medium leading-none ${isHomeActive ? 'font-bold text-[#FFD166]' : ''}`}>
                Trang chủ
              </span>
            </button>

            {/* 2. Mô hình / Studio 3D */}
            <button
              type="button"
              onClick={() => handleNav('create', '/create')}
              className={`group flex flex-col items-center gap-1 w-full py-1 transition-all cursor-pointer ${
                isCreateActive ? 'text-[#FFD166]' : 'text-neutral-400 hover:text-amber-200'
              }`}
              title="Studio Tạo mô hình 3D"
            >
              <div className="relative">
                <Box
                  className={`w-5 h-5 stroke-[2] transition-transform group-hover:scale-110 ${
                    isCreateActive
                      ? 'text-[#FFD166] filter drop-shadow-[0_0_10px_rgba(255,209,102,0.7)]'
                      : ''
                  }`}
                />
                <Sparkles
                  className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 ${
                    isCreateActive ? 'text-amber-300' : 'text-neutral-400'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold leading-none ${
                  isCreateActive
                    ? 'text-[#FFD166] drop-shadow-[0_0_6px_rgba(255,209,102,0.5)] font-bold'
                    : ''
                }`}
              >
                Mô hình
              </span>
            </button>

            {/* 3. In ấn 3D */}
            <button
              type="button"
              onClick={() => handleNav('print', undefined, 'In ấn 3D')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors cursor-pointer"
              title="Dịch vụ in 3D (Sắp ra mắt)"
            >
              <Layers className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">In ấn</span>
            </button>

            {/* 4. Hoạt hình */}
            <button
              type="button"
              onClick={() => handleNav('animation', undefined, 'Hoạt hình 3D')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors cursor-pointer"
              title="Hoạt hình & Rigging (Sắp ra mắt)"
            >
              <Activity className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Hoạt hình</span>
            </button>

            {/* 5. Agent AI */}
            <button
              type="button"
              onClick={() => handleNav('agent', undefined, 'AI Agent')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors cursor-pointer"
              title="Trợ lý thiết kế 3D Agent"
            >
              <Bot className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Agent</span>
            </button>

            {/* Divider */}
            <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

            {/* 6. Tài sản / Assets */}
            <button
              type="button"
              onClick={() => handleNav('assets', isCreateActive ? undefined : '/create')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors cursor-pointer"
              title="Kho tài sản mô hình"
            >
              <LayoutGrid className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Tài sản</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Coins, Upgrade & Status */}
        <div className="flex flex-col items-center w-full gap-2 mt-4">
          {/* Notification / Bell */}
          <button
            type="button"
            onClick={() => {
              if (isLoggedIn) {
                navigate('/profile');
              } else {
                setIsLoginModalOpen(true);
              }
            }}
            className="relative w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#FFD166] hover:bg-white/5 transition-colors cursor-pointer"
            title="Thông báo"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

          {/* Credits Counter */}
          <div className="flex flex-col items-center gap-1" title="Số lượt tạo model có sẵn">
            <div className="flex items-center gap-1 text-[#FFD166] font-bold text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD166] shadow-[0_0_8px_#f59e0b] inline-block" />
              <span>{isLoggedIn ? '100' : 'Free'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isLoggedIn) {
                  showFeatureNotice('Nâng cấp gói Pro');
                } else {
                  setIsLoginModalOpen(true);
                }
              }}
              className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFD166] via-[#f59e0b] to-[#d97706] text-black text-[9px] font-black shadow-[0_0_12px_rgba(255,209,102,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              Nâng cấp
            </button>
          </div>

          {/* User Avatar Circle */}
          <div
            onClick={handleProfileClick}
            className={`w-8 h-8 rounded-full border overflow-hidden cursor-pointer transition-all mt-1 flex items-center justify-center shadow-md ${
              isLoggedIn
                ? 'border-amber-400 bg-amber-950/80 hover:shadow-[0_0_10px_rgba(255,209,102,0.5)]'
                : 'border-white/20 bg-neutral-900 hover:border-amber-400'
            }`}
            title={isLoggedIn ? `Đang đăng nhập: ${fullName}` : 'Đăng nhập tài khoản'}
          >
            {isLoggedIn ? (
              <span className="text-xs font-bold text-amber-300 uppercase">
                {(fullName || 'U').slice(0, 1)}
              </span>
            ) : (
              <UserIcon className="w-4 h-4 text-neutral-400" />
            )}
          </div>
        </div>
      </aside>

      {/* Floating toast notification for upcoming features */}
      {toastNotice && (
        <div className="fixed bottom-5 left-20 z-50 px-4 py-2 bg-[#16130d] border border-amber-500/40 text-amber-200 text-xs rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastNotice}
        </div>
      )}

      {/* Login Popup Dialog */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
