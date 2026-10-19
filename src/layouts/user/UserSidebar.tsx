import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Bot,
  Image as ImageIcon,
  Box,
  Layers,
  Activity,
  LayoutGrid,
  Sparkles,
  Gift,
  Bell,
} from 'lucide-react';
import logoTheBoy from '../../assets/LOGOTheBoy.png';
import LoginModal from '../../components/LoginModal';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function UserSidebar({ activeTab, onTabChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Active item determined by route or prop
  const isCreateActive =
    activeTab === 'create' ||
    activeTab === 'model' ||
    location.pathname === '/create';

  const handleNav = (tab: string, path?: string) => {
    onTabChange?.(tab);
    if (path) {
      navigate(path);
    }
  };

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-[68px] md:w-[72px] bg-[#090a0d] border-r border-amber-500/15 flex flex-col items-center justify-between py-3 z-50 select-none shadow-[2px_0_20px_rgba(0,0,0,0.6)]">
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
              alt="Idea2Model LOGOTheBoy"
              className="w-9 h-9 object-contain rounded-lg filter drop-shadow-[0_0_8px_rgba(255,209,102,0.4)] group-hover:brightness-110 transition-all"
            />
            {/* Subtle Gold sparkle on top-left of logo */}
            <Sparkles className="absolute -top-1 -left-1 w-3 h-3 text-[#FFD166] pointer-events-none drop-shadow-[0_0_4px_#FFD166]" />
          </div>

          {/* User profile button - opens Login Modal */}
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="w-9 h-9 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] hover:bg-amber-500/15 hover:border-[#FFD166] flex items-center justify-center text-amber-300 hover:text-white transition-all shadow-sm cursor-pointer group"
            title="Tài khoản cá nhân"
          >
            <UserIcon className="w-4 h-4 stroke-[2] group-hover:scale-110 transition-transform" />
          </button>

          {/* Divider */}
          <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

          {/* Navigation list */}
          <nav className="flex flex-col items-center w-full gap-2">
            {/* 1. Agent */}
            <button
              type="button"
              onClick={() => handleNav('agent')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors"
              title="Agent"
            >
              <Bot className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Agent</span>
            </button>

            {/* 2. Hình ảnh */}
            <button
              type="button"
              onClick={() => handleNav('image')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors"
              title="Hình ảnh"
            >
              <div className="relative">
                <ImageIcon className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
                <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-400" />
              </div>
              <span className="text-[10px] font-medium leading-none">Hình ảnh</span>
            </button>

            {/* 3. Mô hình / Tạo (Active G2C Gold when on /create) */}
            <button
              type="button"
              onClick={() => handleNav('create', '/create')}
              className={`group flex flex-col items-center gap-1 w-full py-1 transition-all ${
                isCreateActive
                  ? 'text-[#FFD166]'
                  : 'text-neutral-400 hover:text-amber-200'
              }`}
              title="Tạo mô hình 3D"
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
                    ? 'text-[#FFD166] drop-shadow-[0_0_6px_rgba(255,209,102,0.5)]'
                    : ''
                }`}
              >
                Mô hình
              </span>
            </button>

            {/* 4. In ấn */}
            <button
              type="button"
              onClick={() => handleNav('print')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors"
              title="In ấn 3D"
            >
              <Layers className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">In ấn</span>
            </button>

            {/* 5. Hoạt hình */}
            <button
              type="button"
              onClick={() => handleNav('animation')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors"
              title="Hoạt hình"
            >
              <Activity className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Hoạt hình</span>
            </button>

            {/* Divider */}
            <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

            {/* 6. Tài sản */}
            <button
              type="button"
              onClick={() => handleNav('assets')}
              className="group flex flex-col items-center gap-1 w-full py-1 text-neutral-400 hover:text-amber-200 transition-colors"
              title="Tài sản"
            >
              <LayoutGrid className="w-5 h-5 stroke-[1.8] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium leading-none">Tài sản</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: Sparkle, Gift, Bell, Coins, Upgrade & Avatar */}
        <div className="flex flex-col items-center w-full gap-2">
          {/* Sparkle icon */}
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#FFD166] hover:bg-white/5 transition-colors"
            title="Tính năng AI"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Gift icon with gold dot */}
          <button
            type="button"
            className="relative w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#FFD166] hover:bg-white/5 transition-colors"
            title="Ưu đãi & Quà tặng"
          >
            <Gift className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FFD166] shadow-[0_0_6px_#FFD166]" />
          </button>

          {/* Bell with gold badge 9 */}
          <button
            type="button"
            className="relative w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#FFD166] hover:bg-white/5 transition-colors"
            title="Thông báo"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-gradient-to-r from-amber-400 to-[#FFD166] text-black text-[9px] font-black rounded-full flex items-center justify-center leading-none shadow-[0_0_8px_rgba(255,209,102,0.6)]">
              9
            </span>
          </button>

          {/* Divider */}
          <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

          {/* Coin counter 🪙 120 */}
          <div className="flex items-center gap-1 text-[#FFD166] font-bold text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD166] shadow-[0_0_8px_#f59e0b] inline-block" />
            <span>120</span>
          </div>

          {/* Nâng cấp Gold Pill Button */}
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFD166] via-[#f59e0b] to-[#d97706] text-black text-[9px] font-black shadow-[0_0_12px_rgba(255,209,102,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Nâng cấp
          </button>

          {/* Circular Avatar - also opens Login Modal */}
          <div
            onClick={() => setIsLoginModalOpen(true)}
            className="w-8 h-8 rounded-full border border-amber-500/40 overflow-hidden cursor-pointer hover:border-[#FFD166] hover:shadow-[0_0_10px_rgba(255,209,102,0.5)] transition-all mt-1 bg-amber-950 flex items-center justify-center shadow-md"
            title="Hồ sơ cá nhân"
          >
            <img
              src="https://api.dicebear.com/7.x/bottts/svg?seed=Idea2ModelTheBoy"
              alt="User Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </aside>

      {/* Login Popup Dialog */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}
