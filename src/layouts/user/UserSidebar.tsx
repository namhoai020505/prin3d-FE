import { useState } from 'react';
import {
  Plus,
  LayoutTemplate,
  LayoutGrid,
  Globe,
  ShoppingBag,
  Code2,
  FileText,
  Gift,
  Bell,
} from 'lucide-react';
import g2cLogo from '../../assets/logo.png';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function UserSidebar({ activeTab = 'create', onTabChange }: SidebarProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const handleSelect = (tab: string) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[68px] md:w-[74px] bg-[#090b0c] border-r border-amber-500/10 flex flex-col items-center justify-between py-3 z-50 select-none shadow-[2px_0_20px_rgba(0,0,0,0.4)]">
      {/* Top Section: G2C Gold Logo & Primary Nav */}
      <div className="flex flex-col items-center w-full gap-3">
        {/* Golden G2C Logo */}
        <div
          className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#1c170d] to-[#0f0c07] p-[1.5px] border border-amber-500/40 cursor-pointer hover:scale-105 transition-transform shadow-[0_0_16px_rgba(245,158,11,0.25)] flex items-center justify-center overflow-hidden group"
          title="G2Cinema"
        >
          <img
            src={g2cLogo}
            alt="G2Cinema Logo"
            className="w-8 h-8 object-contain filter drop-shadow-[0_0_6px_rgba(245,158,11,0.5)] group-hover:brightness-110 transition-all"
          />
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col items-center w-full gap-2 mt-1">
          {/* 1. Tạo */}
          <button
            onClick={() => handleSelect('create')}
            className={`group flex flex-col items-center gap-1 w-full py-1 transition-colors ${
              currentTab === 'create' ? 'text-amber-300' : 'text-neutral-400 hover:text-amber-200'
            }`}
            title="Tạo"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                currentTab === 'create'
                  ? 'bg-amber-400/20 border border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
                  : 'bg-white/5 border border-white/10 text-amber-400 group-hover:border-amber-400/60'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-medium leading-none">Tạo</span>
          </button>

          {/* 2. Mẫu */}
          <button
            onClick={() => handleSelect('templates')}
            className={`group flex flex-col items-center gap-1 w-full py-1 transition-colors ${
              currentTab === 'templates' ? 'text-amber-300' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Mẫu"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                currentTab === 'templates'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'group-hover:bg-white/5'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium leading-none">Mẫu</span>
          </button>

          {/* 3. Tài sản */}
          <button
            onClick={() => handleSelect('assets')}
            className={`group flex flex-col items-center gap-1 w-full py-1 transition-colors ${
              currentTab === 'assets' ? 'text-amber-300' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Tài sản"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                currentTab === 'assets'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'group-hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium leading-none">Tài sản</span>
          </button>

          {/* Divider */}
          <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

          {/* 4. Cộng đồng */}
          <button
            onClick={() => handleSelect('community')}
            className={`group flex flex-col items-center gap-1 w-full py-1 transition-colors ${
              currentTab === 'community' ? 'text-amber-300' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Cộng đồng"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                currentTab === 'community'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'group-hover:bg-white/5'
              }`}
            >
              <Globe className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium leading-none">Cộng đồng</span>
          </button>

          {/* 5. Cửa hàng */}
          <button
            onClick={() => handleSelect('store')}
            className={`group flex flex-col items-center gap-1 w-full py-1 transition-colors ${
              currentTab === 'store' ? 'text-amber-300' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Cửa hàng"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                currentTab === 'store'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'group-hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium leading-none">Cửa hàng</span>
          </button>

          {/* 6. Nhà phát triển */}
          <button
            onClick={() => handleSelect('developer')}
            className={`group flex flex-col items-center gap-1 w-full py-1 transition-colors ${
              currentTab === 'developer' ? 'text-amber-300' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Nhà phát triển"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                currentTab === 'developer'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'group-hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-medium leading-none text-center px-1">
              Nhà phát triển
            </span>
          </button>

          {/* Divider */}
          <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

          {/* 7. Tài nguyên */}
          <button
            onClick={() => handleSelect('resources')}
            className={`group flex flex-col items-center gap-1 w-full py-1 transition-colors ${
              currentTab === 'resources' ? 'text-amber-300' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Tài nguyên"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                currentTab === 'resources'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'group-hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium leading-none">Tài nguyên</span>
          </button>
        </nav>
      </div>

      {/* Bottom Section: Gift, Notifications, Credits & Profile */}
      <div className="flex flex-col items-center w-full gap-2.5">
        {/* Gift box */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-300 hover:bg-white/5 transition-colors"
          title="Ưu đãi & Quà tặng"
        >
          <Gift className="w-4 h-4" />
        </button>

        {/* Bell with gold badge */}
        <button
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-300 hover:bg-white/5 transition-colors"
          title="Thông báo"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-black text-[9px] font-bold rounded-full flex items-center justify-center leading-none shadow-[0_0_8px_rgba(245,158,11,0.5)]">
            9
          </span>
        </button>

        {/* Divider */}
        <div className="w-6 h-[1px] bg-amber-500/15 my-0.5" />

        {/* Coins / Credits counter */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] inline-block" />
            120
          </div>
          <button className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/50 text-[9px] font-semibold text-amber-300 hover:bg-amber-400/25 transition-colors shadow-sm">
            Nâng cấp
          </button>
        </div>

        {/* User profile avatar */}
        <div
          className="w-8 h-8 rounded-full border border-amber-500/30 overflow-hidden cursor-pointer hover:border-amber-400 transition-colors mt-1 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]"
          title="Hồ sơ người dùng"
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </aside>
  );
}
