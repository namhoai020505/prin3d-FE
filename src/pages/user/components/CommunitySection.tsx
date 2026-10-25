import {
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useVTNavigate as useNavigate } from '../../../hooks/useVTNavigate';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Search,
  Plus,
  Sparkles,
  X,
  Download,
  Box,
  Layers,
  Cpu,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { COMMUNITY_FILTERS, type FaceCount } from '../../../constants/models';

export interface CommunityCardItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  tag: string;
  categories: string[];
  author: string;
  likes: number;
  faceCount: string;
  vertexCount: string;
  topology: string;
  uvStatus: string;
  printSpec: string;
  fileFormats: string;
  prompt: string;
}

const COMMUNITY_ITEMS: CommunityCardItem[] = [
  {
    id: '1',
    title: 'Chibi Mech Warrior',
    subtitle: 'Mô hình robot mini mạ đồng stylized chuẩn in SLA',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=700&auto=format&fit=crop&q=80',
    tag: 'Chibi 3D Figures',
    categories: ['Đề xuất', 'Nhân vật hoạt hình', 'In 3D Printing: In Đa Chiều'],
    author: 'StudioZenkai',
    likes: 342,
    faceCount: '1.2M',
    vertexCount: '604,280',
    topology: 'Quad-Dominant Manifold',
    uvStatus: '4K UDIM Unwrapped',
    printSpec: 'Watertight · Hollowed 2.0mm',
    fileFormats: 'STL · OBJ · GLB',
    prompt: 'Chibi mech warrior robot figurine, stylized armor, studio crimson accents, 3D printing ready',
  },
  {
    id: '2',
    title: 'Cyber Cyberpunk Helmet',
    subtitle: 'Nón giáp tương lai phong cách Cyberpunk đa mảnh ghép',
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=80',
    tag: 'In 3D Printing',
    categories: ['Đề xuất', 'In 3D Printing: In Đa Chiều', 'Phát triển trò chơi'],
    author: 'NeoCraft3D',
    likes: 512,
    faceCount: '1.5M',
    vertexCount: '752,910',
    topology: 'High-Density Tri/Quad',
    uvStatus: 'PBR Metallic-Roughness',
    printSpec: 'Watertight · Split 6 Parts',
    fileFormats: 'STL · OBJ · 3MF',
    prompt: 'Sci-fi futuristic helmet with neon visor, high detail polygon mesh, wearable cosplay prop',
  },
  {
    id: '3',
    title: 'Dragon Ancient Bust',
    subtitle: 'Tượng rồng cổ đại chạm khắc vảy nổi độ phân giải siêu cao',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=700&auto=format&fit=crop&q=80',
    tag: 'Art Collectible',
    categories: ['Đề xuất', 'Nghệ thuật số', 'In 3D Printing: In Đa Chiều'],
    author: 'MythosLab',
    likes: 278,
    faceCount: '2.0M',
    vertexCount: '1,012,400',
    topology: 'ZRemesh Sculpt SDF',
    uvStatus: '8K Displacement Map',
    printSpec: 'Watertight · Resin SLA 8K',
    fileFormats: 'STL · OBJ · ZTL',
    prompt: 'Ancient dragon stone bust sculpture, realistic scales and horns, museum quality 3D render',
  },
  {
    id: '4',
    title: 'Low-Poly Racing Hovercraft',
    subtitle: 'Phương tiện bay sci-fi tối ưu hóa lưới đa giác cho Game Engine',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=700&auto=format&fit=crop&q=80',
    tag: 'Game Asset',
    categories: ['Đề xuất', 'Phát triển trò chơi'],
    author: 'PixelForge',
    likes: 195,
    faceCount: '50k',
    vertexCount: '25,840',
    topology: 'Clean Game-Ready Quads',
    uvStatus: '2K Atlas Baked Normal',
    printSpec: 'Manifold · FDM Supportless',
    fileFormats: 'FBX · OBJ · STL',
    prompt: 'Retro futuristic hovercraft vehicle, optimized 50k poly count for real-time game engines',
  },
  {
    id: '5',
    title: 'Valkyrie Anime Action Figure',
    subtitle: 'Tượng nữ chiến binh anime tỉ lệ 1/7 kèm bệ đỡ đôi cánh',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=80',
    tag: 'Anime Collectible',
    categories: ['Đề xuất', 'Nhân vật hoạt hình', 'Nghệ thuật số'],
    author: 'ValkyrieArt',
    likes: 689,
    faceCount: '1.8M',
    vertexCount: '908,650',
    topology: 'Sub-D Garage Kit Mesh',
    uvStatus: '4K Stylized Cel/PBR',
    printSpec: 'Watertight · Keyed Joints',
    fileFormats: 'STL · OBJ · GLB',
    prompt: 'Anime female warrior action figure with dual wings and display base, garage kit 1/7 scale',
  },
  {
    id: '6',
    title: 'Mecha Exoskeleton Armor',
    subtitle: 'Bộ giáp cơ khí hạng nặng tối ưu rigging & in 3D khớp động',
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=700&auto=format&fit=crop&q=80',
    tag: 'Game Asset',
    categories: ['Phát triển trò chơi', 'In 3D Printing: In Đa Chiều'],
    author: 'KuroMecha',
    likes: 418,
    faceCount: '500k',
    vertexCount: '254,120',
    topology: 'Articulated Quad Mesh',
    uvStatus: '4K PBR Hard-Surface',
    printSpec: 'Ball-Joint Articulated · FDM/SLA',
    fileFormats: 'FBX · STL · GLB',
    prompt: 'Heavy mecha exoskeleton suit with articulated joints, hard-surface 3D model',
  },
  {
    id: '7',
    title: 'Kitsune Spirit Guardian',
    subtitle: 'Tượng linh hồ chín đuôi phong cách điêu khắc nghệ thuật số',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=700&auto=format&fit=crop&q=80',
    tag: 'Nhân vật hoạt hình',
    categories: ['Nhân vật hoạt hình', 'Nghệ thuật số'],
    author: 'AkiraSculpt',
    likes: 530,
    faceCount: '1.5M',
    vertexCount: '760,400',
    topology: 'High-Res Sculpt Mesh',
    uvStatus: '4K Hand-Painted Albedo',
    printSpec: 'Watertight · Resin SLA 8K',
    fileFormats: 'STL · OBJ · GLB',
    prompt: 'Nine-tailed fox spirit guardian figurine, dynamic swirling tails, anime resin statue',
  },
  {
    id: '8',
    title: 'Obsidian Celestial Monolith',
    subtitle: 'Tác phẩm điêu khắc trừu tượng hình học chuẩn in 3D trưng bày',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=700&auto=format&fit=crop&q=80',
    tag: 'Nghệ thuật số',
    categories: ['Nghệ thuật số', 'In 3D Printing: In Đa Chiều'],
    author: 'AetherForm',
    likes: 264,
    faceCount: '1.0M',
    vertexCount: '502,110',
    topology: 'Procedural Voronoi SDF',
    uvStatus: 'Procedural Triplanar',
    printSpec: 'Supportless · SLA/SLS Ready',
    fileFormats: 'STL · OBJ · 3MF',
    prompt: 'Abstract celestial monolith sculpture with intricate parametric lattice structure',
  },
];

interface BoundingBoxSnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function CommunitySection() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>(COMMUNITY_FILTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<CommunityCardItem | null>(null);
  const [originRect, setOriginRect] = useState<BoundingBoxSnapshot | null>(null);
  const [showWireframeOverlay, setShowWireframeOverlay] = useState(true);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Sliding Underline Indicator state
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 56,
  });

  // Card refs and Lightbox modal ref for Archetype C FLIP transition
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lightboxModalRef = useRef<HTMLDivElement>(null);
  const lightboxBackdropRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);

  // Measure active category tab for smooth sliding underline
  const updateSlidingUnderline = useCallback(() => {
    const container = tabsContainerRef.current;
    const activeBtn = tabButtonRefs.current[activeFilter];
    if (!container || !activeBtn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setUnderlineStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [activeFilter]);

  useLayoutEffect(() => {
    updateSlidingUnderline();
  }, [updateSlidingUnderline]);

  useEffect(() => {
    window.addEventListener('resize', updateSlidingUnderline);
    return () => window.removeEventListener('resize', updateSlidingUnderline);
  }, [updateSlidingUnderline]);

  // Filter items based on active category tab and search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = COMMUNITY_ITEMS.filter((item) => {
      const matchesFilter = item.categories.includes(activeFilter);
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.faceCount.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
    return matched;
  }, [activeFilter, searchQuery]);

  // 3D Card Pointer-Move Tilt + Specular Sheen
  const handleCardPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;

    const rotY = px * 13;
    const rotX = py * -11;

    el.style.setProperty('--card-mx', `${x.toFixed(1)}px`);
    el.style.setProperty('--card-my', `${y.toFixed(1)}px`);
    el.style.transform = `perspective(820px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleCardPointerLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'perspective(820px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  // Open FLIP Lightbox capturing First bounding rect
  const handleCardClick = (item: CommunityCardItem) => {
    const cardEl = cardRefs.current[item.id];
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      setOriginRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setOriginRect(null);
    }
    isClosingRef.current = false;
    setDownloadNotice(null);
    setSelectedItem(item);
  };

  // Execute FLIP Bounding-Rect expansion animation on mount
  useLayoutEffect(() => {
    if (!selectedItem || !lightboxModalRef.current) return;
    const modalEl = lightboxModalRef.current;
    const backdropEl = lightboxBackdropRef.current;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (backdropEl) {
      backdropEl.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 380,
        easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        fill: 'forwards',
      });
    }

    if (originRect) {
      const lastRect = modalEl.getBoundingClientRect();
      const dx =
        originRect.left +
        originRect.width / 2 -
        (lastRect.left + lastRect.width / 2);
      const dy =
        originRect.top +
        originRect.height / 2 -
        (lastRect.top + lastRect.height / 2);
      const sx = Math.max(0.2, originRect.width / Math.max(1, lastRect.width));
      const sy = Math.max(0.2, originRect.height / Math.max(1, lastRect.height));

      modalEl.animate(
        [
          {
            transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`,
            opacity: 0.45,
          },
          {
            transform: 'translate3d(0px, 0px, 0px) scale(1, 1)',
            opacity: 1,
          },
        ],
        {
          duration: 540,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        }
      );
    }
  }, [selectedItem, originRect]);

  // Reverse FLIP animation on close
  const handleCloseLightbox = useCallback(() => {
    if (!selectedItem || isClosingRef.current) return;
    const modalEl = lightboxModalRef.current;
    const backdropEl = lightboxBackdropRef.current;
    const cardEl = cardRefs.current[selectedItem.id];

    if (
      !modalEl ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setSelectedItem(null);
      return;
    }

    isClosingRef.current = true;
    const destRect = cardEl ? cardEl.getBoundingClientRect() : originRect;

    if (backdropEl) {
      backdropEl.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 300,
        easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        fill: 'forwards',
      });
    }

    if (destRect) {
      const currentRect = modalEl.getBoundingClientRect();
      const dx =
        destRect.left +
        destRect.width / 2 -
        (currentRect.left + currentRect.width / 2);
      const dy =
        destRect.top +
        destRect.height / 2 -
        (currentRect.top + currentRect.height / 2);
      const sx = Math.max(0.2, destRect.width / Math.max(1, currentRect.width));
      const sy = Math.max(0.2, destRect.height / Math.max(1, currentRect.height));

      const anim = modalEl.animate(
        [
          {
            transform: 'translate3d(0px, 0px, 0px) scale(1, 1)',
            opacity: 1,
          },
          {
            transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`,
            opacity: 0,
          },
        ],
        {
          duration: 320,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        }
      );
      anim.onfinish = () => {
        setSelectedItem(null);
        isClosingRef.current = false;
      };
    } else {
      setSelectedItem(null);
      isClosingRef.current = false;
    }
  }, [selectedItem, originRect]);

  // Close Lightbox on Escape key
  useEffect(() => {
    if (!selectedItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseLightbox();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem, handleCloseLightbox]);

  const handleOpenInStudio = (item: CommunityCardItem) => {
    const mappedFaceCount: FaceCount =
      item.faceCount === '50k'
        ? '50k'
        : item.faceCount === '1.5M'
          ? '1.5M'
          : '1.5M';

    setSelectedItem(null);
    navigate('/create', {
      state: {
        presetUrl: item.imageUrl,
        modelName: 'TheBoys 7.1 - Flagship',
        faceCount: mappedFaceCount,
      },
    });
  };

  const handleDownloadMesh = (item: CommunityCardItem) => {
    const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const objContent = [
      `# THE BOYS 7.1 Spatial Mesh Export`,
      `# Model: ${item.title}`,
      `# Author: @${item.author}`,
      `# Face Count: ${item.faceCount} (${item.topology})`,
      `o ${slug}`,
      `v -0.500000 -0.500000 0.500000`,
      `v 0.500000 -0.500000 0.500000`,
      `v -0.500000 0.500000 0.500000`,
      `v 0.500000 0.500000 0.500000`,
      `v -0.500000 0.500000 -0.500000`,
      `v 0.500000 0.500000 -0.500000`,
      `v -0.500000 -0.500000 -0.500000`,
      `v 0.500000 -0.500000 -0.500000`,
      `f 1 2 4 3`,
      `f 3 4 6 5`,
      `f 5 6 8 7`,
      `f 7 8 2 1`,
      `f 2 8 6 4`,
      `f 7 1 3 5`,
    ].join('\n');

    const blob = new Blob([objContent], { type: 'model/obj;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}-${item.faceCount}.obj`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice(`Đã xuất gói lưới 3D (${slug}-${item.faceCount}.obj)`);
  };

  return (
    <section
      id="community-showcase"
      className="relative z-20 -ml-[64px] md:-ml-[72px] pl-[64px] md:pl-[72px] w-[calc(100%+64px)] md:w-[calc(100%+72px)] select-none"
    >
      {/* Dải chuyển màu mượt mà từ video chuyển dần thành màu đen than chì sâu, không có đường viền cắt ngang */}
      <div
        className="w-full h-44 sm:h-64 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(9, 9, 11, 0.25) 20%, rgba(9, 9, 11, 0.65) 50%, rgba(9, 9, 11, 0.92) 80%, #09090b 100%)',
        }}
        aria-hidden="true"
      />

      {/* Phần nội dung Cộng đồng trên nền than chì đặc, che chắn hoàn toàn video phía sau */}
      <div
        className="w-full pt-4 pb-16"
        style={{
          background: '#09090b',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 md:px-10"
        >
        {/* Header & Filter Bar */}
        <div
          data-choreo="filter-bar"
          className="flex items-center justify-between gap-4 pb-3.5 border-b border-white/18 flex-wrap"
        >
          {/* Left: Section Title & Animated Sliding Underline Category Tabs */}
          <div className="flex items-center gap-6 flex-wrap">
            <h2 className="text-xl md:text-[22px] font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Cộng đồng sáng tạo 3D</span>
            </h2>

            {/* Desktop Category Tabs with Sliding White Underline & Soft Glass Pill Indicator */}
            <div
              ref={tabsContainerRef}
              className="hidden lg:flex items-center gap-5 text-xs font-medium relative py-1"
            >
              {COMMUNITY_FILTERS.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    ref={(el) => {
                      tabButtonRefs.current[filter] = el;
                    }}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`relative px-2.5 py-1.5 rounded-full transition-colors duration-300 cursor-pointer whitespace-nowrap z-10 ${
                      isActive
                        ? 'text-white font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="desktop-community-tab-glow"
                        className="absolute inset-0 rounded-full bg-white/10 border border-white/15 -z-10"
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 32,
                        }}
                      />
                    )}
                    {filter}
                  </button>
                );
              })}

              {/* Animated Sliding White/Rose Underline Indicator */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)]"
                style={{
                  width: `${underlineStyle.width}px`,
                  transform: `translate3d(${underlineStyle.left}px, 0, 0)`,
                  transition:
                    'transform 420ms var(--ease-expo), width 420ms var(--ease-expo)',
                }}
              />
            </div>
          </div>

          {/* Right: Search Pill + Crisp White Button "+ Đăng mô hình" */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mẫu, tác giả..."
                className="pl-8 pr-3.5 py-1.5 h-[36px] bg-[#0c1017]/65 hover:bg-[#111622]/80 focus:bg-[#111622]/90 border border-white/22 focus:border-white/65 rounded-full text-xs text-white placeholder:text-slate-400 outline-none w-36 sm:w-44 focus:w-56 transition-all duration-300"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-300 hover:text-white cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/create')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 h-[36px] rounded-full bg-white hover:bg-cyan-50 text-[#041014] font-bold text-xs shadow-[0_6px_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#041014] stroke-[2.8]" />
              <span>Đăng mô hình</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Filter Bar with Smooth Sliding Pill */}
        <div className="flex lg:hidden items-center gap-2 py-3 overflow-x-auto text-xs border-b border-white/15 no-scrollbar">
          {COMMUNITY_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`relative whitespace-nowrap px-3.5 py-1.5 rounded-full transition-colors duration-300 cursor-pointer z-10 ${
                  isActive
                    ? 'text-[#041014] font-semibold'
                    : 'text-slate-400 hover:text-white bg-white/10 border border-white/18'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-community-tab-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-sm -z-10"
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                )}
                {filter}
              </button>
            );
          })}
        </div>

        {/* 5-Column 3D Depth-Shaded Card Grid with Smooth Layout & Enter/Exit Transitions */}
        <LayoutGroup id="community-cards-grid">
          <motion.div
            layout
            transition={{
              layout: {
                type: 'spring',
                stiffness: 290,
                damping: 28,
                mass: 0.85,
              },
            }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-5 relative min-h-[280px]"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{
                    opacity: 0,
                    scale: 0.88,
                    y: 22,
                    filter: 'blur(8px)',
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    filter: 'blur(0px)',
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.86,
                    y: 14,
                    filter: 'blur(6px)',
                  }}
                  transition={{
                    layout: {
                      type: 'spring',
                      stiffness: 310,
                      damping: 28,
                      mass: 0.8,
                    },
                    opacity: { duration: 0.32, delay: idx * 0.035, ease: 'easeOut' },
                    scale: {
                      duration: 0.38,
                      delay: idx * 0.035,
                      ease: [0.16, 1, 0.3, 1],
                    },
                    y: {
                      duration: 0.38,
                      delay: idx * 0.035,
                      ease: [0.16, 1, 0.3, 1],
                    },
                    filter: { duration: 0.3, delay: idx * 0.035, ease: 'easeOut' },
                  }}
                  className="w-full"
                >
                  <div
                    ref={(el) => {
                      cardRefs.current[item.id] = el;
                    }}
                    data-choreo="card"
                    data-cursor="card"
                    onClick={() => handleCardClick(item)}
                    onPointerMove={handleCardPointerMove}
                    onPointerLeave={handleCardPointerLeave}
                    className="showcase-card-3d group flex flex-col justify-end p-3.5"
                  >
                    {/* Card Artwork */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out brightness-90 group-hover:brightness-105"
                    />

                    {/* Dynamic Pointer-Tracking Specular Sheen */}
                    <div className="showcase-card-sheen" aria-hidden="true" />

                    {/* Bottom Deep Dark Obsidian Gradient Scrim */}
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070a0f] via-[#070a0f]/45 to-transparent"
                      aria-hidden="true"
                    />

                    {/* Top Row: Category Glass Pill (Left) & Monospace Polycount Badge (Right) */}
                    <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-1.5 text-[10px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0a0e17]/75 backdrop-blur-md border border-white/20 group-hover:border-white/50 font-medium text-white/95 transition-colors truncate">
                        {item.tag}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#0a0e17]/80 backdrop-blur-md border border-white/20 font-mono-mesh font-semibold text-white shrink-0">
                        {item.faceCount}
                      </span>
                    </div>

                    {/* Bottom Content Footer: Title + Author */}
                    <div className="relative z-10 flex flex-col gap-0.5 pt-8">
                      <h3 className="text-xs sm:text-[13.5px] font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">bởi @{item.author}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity font-mono-mesh">
                          <Eye className="w-3 h-3" />
                          3D
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        <AnimatePresence>
          {filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full py-16 flex flex-col items-center justify-center text-center text-slate-400"
            >
              <p className="text-sm">
                Không tìm thấy mô hình 3D phù hợp với từ khóa &quot;{searchQuery}&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('Đề xuất');
                }}
                className="mt-3 px-4 py-1.5 bg-white text-[#041014] rounded-full text-xs font-semibold hover:bg-cyan-50 transition-colors cursor-pointer"
              >
                Xem tất cả mô hình
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>

      {/* FLIP BOUNDING-RECT LIGHTBOX (Archetype C) */}
      {selectedItem && (
        <div
          ref={lightboxBackdropRef}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#03060a]/85 backdrop-blur-xl"
          onClick={handleCloseLightbox}
        >
          <div
            ref={lightboxModalRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-[20px] bg-[#0a0e17]/95 backdrop-blur-2xl border border-white/25 shadow-[0_32px_90px_rgba(10,1,2,0.92),inset_0_0_0_1px_rgba(255,255,255,0.12)] text-white overflow-hidden grid grid-cols-1 md:grid-cols-12"
            style={{ transformOrigin: 'center center' }}
          >
            {/* Left Column: 3D Viewport Preview & Wireframe Inspection */}
            <div className="relative md:col-span-6 min-h-[280px] md:min-h-[420px] bg-[#03060a] overflow-hidden flex flex-col justify-between p-4 border-b md:border-b-0 md:border-r border-white/15">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="absolute inset-0 w-full h-full object-cover brightness-95"
              />

              {/* Toggleable 3D Topology Wireframe Mesh Overlay */}
              {showWireframeOverlay && (
                <svg
                  viewBox="0 0 400 460"
                  className="pointer-events-none absolute inset-0 w-full h-full opacity-55 mix-blend-screen"
                  fill="none"
                >
                  <defs>
                    <radialGradient id="lightbox-wf-glow" cx="50%" cy="50%" r="55%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                      <stop offset="70%" stopColor="#00F0FF" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#03060a" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="200" cy="230" r="145" stroke="url(#lightbox-wf-glow)" strokeWidth="1" />
                  <ellipse cx="200" cy="230" rx="145" ry="52" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.9" strokeDasharray="3 3" />
                  <ellipse cx="200" cy="230" rx="62" ry="145" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.9" strokeDasharray="3 3" />
                  <polygon
                    points="200,70 330,155 330,305 200,390 70,305 70,155"
                    stroke="#ffffff"
                    strokeOpacity="0.4"
                    strokeWidth="0.9"
                  />
                  <line x1="70" y1="155" x2="330" y2="305" stroke="#ffffff" strokeOpacity="0.26" strokeWidth="0.75" />
                  <line x1="330" y1="155" x2="70" y2="305" stroke="#ffffff" strokeOpacity="0.26" strokeWidth="0.75" />
                  <line x1="200" y1="70" x2="200" y2="390" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.75" />
                </svg>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03060a] via-transparent to-[#03060a]/50" />

              {/* Top Overlay Badges */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#0a0e17]/85 backdrop-blur-md border border-white/25 text-[11px] font-semibold text-white">
                  {selectedItem.tag}
                </span>

                <button
                  type="button"
                  onClick={() => setShowWireframeOverlay((v) => !v)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-mono-mesh border backdrop-blur-md transition-colors cursor-pointer ${
                    showWireframeOverlay
                      ? 'bg-white text-[#041014] border-white font-semibold'
                      : 'bg-[#0a0e17]/75 border-white/20 text-slate-300 hover:text-white'
                  }`}
                >
                  {showWireframeOverlay ? 'WIREFRAME: ON' : 'WIREFRAME: OFF'}
                </button>
              </div>

              {/* Bottom Telemetry Strip */}
              <div className="relative z-10 flex items-center justify-between text-[11px] bg-[#0a0e17]/85 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-white" />
                  <span className="text-slate-400">Face Count:</span>
                  <span className="font-mono-mesh font-bold text-white">
                    {selectedItem.faceCount}
                  </span>
                </div>
                <span className="font-mono-mesh text-[10.5px] text-slate-300">
                  {selectedItem.fileFormats}
                </span>
              </div>
            </div>

            {/* Right Column: 3D Topology Specs & Action Bar */}
            <div className="md:col-span-6 p-5 sm:p-6 flex flex-col justify-between gap-4">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10.5px] font-mono-mesh uppercase tracking-wider text-cyan-300 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>THE BOYS 7.1 · INSPECT MESH</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                      {selectedItem.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      bởi <span className="text-white font-semibold">@{selectedItem.author}</span> · {selectedItem.likes} lượt thích
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseLightbox}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Đóng (ESC)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  {selectedItem.subtitle}
                </p>

                {/* 3D Topology & Mesh Specs Grid */}
                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
                    <span className="text-[10px] text-slate-400 uppercase font-mono-mesh flex items-center gap-1">
                      <Layers className="w-3 h-3 text-white" />
                      Face Count
                    </span>
                    <p className="text-sm font-bold text-white font-mono-mesh mt-0.5">
                      {selectedItem.faceCount} Faces
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
                    <span className="text-[10px] text-slate-400 uppercase font-mono-mesh flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-white" />
                      Vertices
                    </span>
                    <p className="text-sm font-bold text-white font-mono-mesh mt-0.5">
                      {selectedItem.vertexCount}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono-mesh">
                      Cấu trúc Topology
                    </span>
                    <p className="text-xs font-semibold text-white mt-0.5 truncate">
                      {selectedItem.topology}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono-mesh flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                      Chuẩn In 3D
                    </span>
                    <p className="text-xs font-semibold text-white mt-0.5 truncate">
                      {selectedItem.printSpec}
                    </p>
                  </div>
                </div>

                {/* Prompt Box */}
                <div className="mt-3.5 p-3 rounded-xl bg-[#141418]/80 border border-white/15 text-[11px] text-zinc-300 font-mono-mesh leading-relaxed">
                  <span className="text-[10px] uppercase text-white block mb-0.5 font-sans font-bold">
                    Spatial Prompt:
                  </span>
                  &quot;{selectedItem.prompt}&quot;
                </div>

                {downloadNotice && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-medium">
                    {downloadNotice}
                  </div>
                )}
              </div>

              {/* Action Bar: "Mở trong Studio 3D" / "Tải file STL/OBJ" */}
              <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenInStudio(selectedItem)}
                  className="flex-1 py-2.5 px-4 h-[40px] rounded-xl bg-white hover:bg-zinc-100 text-[#09090b] font-bold text-xs flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(255,255,255,0.2)] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#09090b]" />
                  <span>Mở trong Studio 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMesh(selectedItem)}
                  className="py-2.5 px-4 h-[40px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/50 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file STL/OBJ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
