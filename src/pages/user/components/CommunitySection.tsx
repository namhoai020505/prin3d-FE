import { useState } from 'react';
import {
  Gamepad2,
  BookOpen,
  Search,
  Plus,
} from 'lucide-react';
import { FaRunning } from 'react-icons/fa';

interface CommunityCardItem {
  id: string;
  title?: string;
  subtitle?: string;
  highlightWord?: string;
  imageUrl: string;
  hasRunnerBadge?: boolean;
  tag?: string;
  author?: string;
}

const communityItems: CommunityCardItem[] = [
  {
    id: '1',
    title: 'Chibi Figures',
    subtitle: 'Now for',
    highlightWord: 'Two',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&auto=format&fit=crop&q=80',
    tag: 'Chibi 3D Figures',
    author: '3DCreator',
  },
  {
    id: '2',
    title: 'ZENKAI3D',
    subtitle: 'STUDIO',
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80',
    tag: 'Anime Collectible',
    author: 'ZenkaiStudio',
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    tag: 'Realistic Character',
    author: 'StudioHumanoid',
  },
  {
    id: '4',
    hasRunnerBadge: true,
    imageUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=500&auto=format&fit=crop&q=80',
    tag: 'Game Animation',
    author: 'MotionNinja',
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
    tag: 'Action Character',
    author: 'ValkyrieArt',
  },
];

export default function CommunitySection() {
  const [activeFilter, setActiveFilter] = useState('Đề xuất');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    'Đề xuất',
    'In 3D Printing: In Đa Chiều',
    'Phát triển trò chơi',
  ];

  return (
    <section className="w-full px-4 md:px-8 mt-2 pb-12 select-none">
      {/* Header Row: Title, Filters, Search, New Post Button in Gold Theme */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-amber-500/10 flex-wrap">
        {/* Left: Section Title */}
        <div className="flex items-center gap-6">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Cộng đồng</span>
          </h2>

          {/* Filter options */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? 'text-amber-300 font-bold border-b-2 border-amber-400 pb-0.5'
                    : 'text-neutral-400 hover:text-amber-200'
                }`}
              >
                {filter}
              </button>
            ))}

            {/* Gamepad Icon */}
            <button
              className="text-neutral-400 hover:text-amber-300 transition-colors cursor-pointer p-1"
              title="Trò chơi"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            {/* Separator */}
            <span className="text-amber-500/20">|</span>

            {/* Mẫu (Templates) */}
            <button
              className="flex items-center gap-1.5 text-neutral-400 hover:text-amber-300 transition-colors cursor-pointer"
              title="Mẫu cộng đồng"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Mẫu</span>
            </button>

            {/* Separator */}
            <span className="text-amber-500/20">|</span>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm"
                className="pl-8 pr-3 py-1 bg-[#12100b] hover:bg-[#18150f] focus:bg-[#18150f] border border-amber-500/20 focus:border-amber-400/50 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-500 outline-none w-28 md:w-36 focus:w-44 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Right: + Bài đăng mới Button in G2C Gold Metallic */}
        <button className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all active:scale-95 cursor-pointer ml-auto">
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Bài đăng mới</span>
        </button>
      </div>

      {/* Mobile Filters view for smaller screens */}
      <div className="flex lg:hidden items-center gap-3 py-3 overflow-x-auto text-xs text-neutral-400 border-b border-amber-500/10 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`whitespace-nowrap px-3 py-1 rounded-full transition-colors ${
              activeFilter === filter
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 font-semibold'
                : 'hover:text-amber-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Cards Gallery Grid (5 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
        {communityItems.map((item, index) => (
          <div
            key={item.id}
            className="group relative rounded-2xl overflow-hidden bg-[#0d0c09] border border-amber-500/15 hover:border-amber-400/70 transition-all duration-300 aspect-[3/4] flex flex-col justify-end p-4 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-amber-950/30"
          >
            {/* Background Image */}
            <img
              src={item.imageUrl}
              alt={item.title || `3D Model ${index + 1}`}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90 group-hover:brightness-100"
            />

            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

            {/* Runner Badge on Card 4 */}
            {item.hasRunnerBadge && (
              <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-md">
                <FaRunning className="w-3.5 h-3.5 text-amber-300" />
              </div>
            )}

            {/* Card 1: Chibi Figures custom styled overlay with Gold */}
            {item.id === '1' && (
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="text-sm md:text-base font-bold text-amber-300 drop-shadow-md">
                  Chibi Figures
                </div>
                <div className="text-xs md:text-sm font-semibold text-white drop-shadow-md">
                  Now for{' '}
                  <span className="text-amber-400 font-extrabold drop-shadow-[0_0_8px_#f59e0b]">
                    Two
                  </span>
                </div>
              </div>
            )}

            {/* Card 2: Zenkai3D Studio custom styled overlay */}
            {item.id === '2' && (
              <div className="relative z-10 flex flex-col items-start">
                <div className="text-xs md:text-sm font-black tracking-wider text-amber-300 uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                  ZENKAI3D
                </div>
                <div className="text-[10px] font-bold tracking-widest text-white/80 uppercase">
                  STUDIO
                </div>
              </div>
            )}

            {/* Card 3, 4, 5 default subtle tag on hover */}
            {!item.title && (
              <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/30 text-[10px] font-medium text-amber-200">
                  {item.tag}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
