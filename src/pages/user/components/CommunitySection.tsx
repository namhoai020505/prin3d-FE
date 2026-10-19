import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { COMMUNITY_FILTERS } from '../../../constants/models';

interface CommunityCardItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  tag: string;
  category: string;
  author: string;
  likes: number;
  faceCount: string;
  prompt: string;
}

const communityItems: CommunityCardItem[] = [
  {
    id: '1',
    title: 'Chibi Mech Warrior',
    subtitle: 'Mô hình robot mini mạ đồng stylized',
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    tag: 'Chibi 3D Figures',
    category: 'Đề xuất',
    author: 'StudioZenkai',
    likes: 342,
    faceCount: '1.2M',
    prompt: 'Chibi mech warrior robot figurine, stylized armor, golden accents, 3D printing ready',
  },
  {
    id: '2',
    title: 'Cyber Cyberpunk Helmet',
    subtitle: 'Nón giáp tương lai phong cách Cyberpunk 2077',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    tag: 'In 3D Printing',
    category: 'In 3D Printing: In Đa Chiều',
    author: 'NeoCraft3D',
    likes: 512,
    faceCount: '1.5M',
    prompt: 'Sci-fi futuristic helmet with neon visor, high detail polygon mesh, wearable prop',
  },
  {
    id: '3',
    title: 'Dragon Ancient Bust',
    subtitle: 'Tượng rồng cổ đại chạm khắc đá cẩm thạch',
    imageUrl: 'https://images.unsplash.com/photo-1569701813229-33284b643e3c?w=600&auto=format&fit=crop&q=80',
    tag: 'Art Collectible',
    category: 'Đề xuất',
    author: 'MythosLab',
    likes: 278,
    faceCount: '2.0M',
    prompt: 'Ancient dragon stone bust sculpture, realistic scales and horns, museum quality render',
  },
  {
    id: '4',
    title: 'Low-Poly Racing Hovercraft',
    subtitle: 'Phương tiện bay phong cách game low-poly retro',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    tag: 'Game Asset',
    category: 'Phát triển trò chơi',
    author: 'PixelForge',
    likes: 195,
    faceCount: '50k',
    prompt: 'Retro futuristic hovercraft vehicle, optimized low poly count for mobile games',
  },
  {
    id: '5',
    title: 'Valkyrie Anime Action Figure',
    subtitle: 'Tượng nữ chiến binh anime tỉ lệ 1/7 có bệ đỡ',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    tag: 'Anime Collectible',
    category: 'Đề xuất',
    author: 'ValkyrieArt',
    likes: 689,
    faceCount: '1.8M',
    prompt: 'Anime female warrior action figure with dual wings and display base, garage kit style',
  },
];

export default function CommunitySection() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>(COMMUNITY_FILTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CommunityCardItem | null>(null);

  // Filter items based on active tab and search query
  const filteredItems = useMemo(() => {
    return communityItems.filter((item) => {
      const matchesFilter =
        activeFilter === 'Đề xuất' || item.category === activeFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  const handleRemix = (item: CommunityCardItem) => {
    setSelectedItem(null);
    navigate('/create', {
      state: {
        presetUrl: item.imageUrl,
        modelName: 'TheBoys 7.1 - Flagship',
      },
    });
  };

  return (
    <section className="w-full px-4 md:px-8 mt-2 pb-12 select-none">
      {/* Header Row: Title, Filters, Search, New Post Button in Gold Theme */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-amber-500/10 flex-wrap">
        {/* Left: Section Title & Filters */}
        <div className="flex items-center gap-6 flex-wrap">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Cộng đồng sáng tạo 3D</span>
          </h2>

          {/* Desktop Filter options */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
            {COMMUNITY_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`transition-colors cursor-pointer py-1 ${
                  activeFilter === filter
                    ? 'text-[#FFD166] font-bold border-b-2 border-[#FFD166] pb-0.5'
                    : 'text-neutral-400 hover:text-amber-200'
                }`}
              >
                {filter}
              </button>
            ))}

            {/* Separator */}
            <span className="text-amber-500/20">|</span>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mẫu, tác giả..."
                className="pl-8 pr-3 py-1 bg-[#12100b] hover:bg-[#18150f] focus:bg-[#18150f] border border-amber-500/20 focus:border-amber-400/50 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-500 outline-none w-28 md:w-36 focus:w-44 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Right: + Bài đăng mới Button */}
        <button
          type="button"
          onClick={() => navigate('/create')}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all active:scale-95 cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Đăng mô hình</span>
        </button>
      </div>

      {/* Mobile Filters view for smaller screens */}
      <div className="flex lg:hidden items-center gap-2 py-3 overflow-x-auto text-xs text-neutral-400 border-b border-amber-500/10 no-scrollbar">
        {COMMUNITY_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`whitespace-nowrap px-3 py-1 rounded-full transition-colors ${
              activeFilter === filter
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 font-semibold'
                : 'hover:text-amber-200 bg-white/5 border border-white/5'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Cards Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="group relative rounded-2xl overflow-hidden bg-[#0d0c09] border border-amber-500/15 hover:border-amber-400/70 transition-all duration-300 aspect-[3/4] flex flex-col justify-end p-3.5 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-amber-950/30"
          >
            {/* Background Image */}
            <img
              src={item.imageUrl}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90 group-hover:brightness-100"
            />

            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* Top Tag & Stats */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-white/90">
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 font-medium text-amber-200">
                {item.tag}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-md font-mono text-neutral-300">
                {item.faceCount}
              </span>
            </div>

            {/* Card Content Footer */}
            <div className="relative z-10 flex flex-col gap-0.5">
              <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-[#FFD166] transition-colors truncate">
                {item.title}
              </h3>
              <p className="text-[10px] text-neutral-400 truncate">
                bởi @{item.author}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="w-full py-16 flex flex-col items-center justify-center text-center text-neutral-500">
          <p className="text-sm">Không tìm thấy mô hình phù hợp với từ khóa &quot;{searchQuery}&quot;.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('Đề xuất');
            }}
            className="mt-3 px-3 py-1 bg-amber-400/15 text-amber-300 rounded-lg text-xs hover:bg-amber-400/25 transition-colors"
          >
            Xem tất cả
          </button>
        </div>
      )}

      {/* Model Detail Popup Dialog */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-[#12141c] border border-amber-500/30 p-6 shadow-2xl shadow-black/90 text-white flex flex-col gap-4 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFD166]" />
                <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                  Mô hình cộng đồng
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="relative w-full h-56 rounded-xl overflow-hidden bg-black/50 border border-white/10">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 flex gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-amber-300 border border-amber-400/30 font-medium">
                  {selectedItem.tag}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-neutral-300 border border-white/10">
                  {selectedItem.faceCount} faces
                </span>
              </div>
            </div>

            {/* Info */}
            <div>
              <h3 className="text-lg font-bold text-white">{selectedItem.title}</h3>
              <p className="text-xs text-neutral-400 mt-1">{selectedItem.subtitle}</p>
              <div className="mt-3 p-3 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-neutral-300 leading-relaxed font-mono">
                <p className="text-[10px] text-neutral-500 font-sans mb-1 uppercase font-bold">Prompt tạo mẫu:</p>
                &quot;{selectedItem.prompt}&quot;
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">
                Đăng bởi <span className="text-amber-300 font-medium">@{selectedItem.author}</span> · {selectedItem.likes} lượt thích
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleRemix(selectedItem)}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-black bg-gradient-to-r from-[#FFD166] via-[#f59e0b] to-[#d97706] hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(255,209,102,0.35)] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Mở trong Studio để tạo mẫu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
