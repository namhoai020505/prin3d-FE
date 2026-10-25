import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from 'react';
import { useVTNavigate as useNavigate } from '../../../hooks/useVTNavigate';
import {
  Sparkles,
  Box,
  Plus,
  ChevronDown,
  Settings,
  X,
  Check,
  Layers,
} from 'lucide-react';
import {
  AI_MODELS,
  DETAIL_LEVELS,
  FACE_COUNTS,
  MODEL_PRESETS,
  type FaceCount,
  type ModelPreset,
} from '../../../constants/models';
import { getAccessToken } from '../../../lib/auth';
import { useParallax } from '../../../hooks/useParallax';

interface DetailOption {
  label: string;
  faceCount: FaceCount;
  desc: string;
}

const DETAIL_OPTIONS: DetailOption[] = [
  { label: 'Chi tiết cao', faceCount: '1.5M', desc: 'Lưới đa giác dày, tối ưu in 3D SLA/FDM' },
  { label: 'Siêu chi tiết', faceCount: '1M', desc: 'Cân bằng hoàn hảo bề mặt và tốc độ' },
  { label: 'Chi tiết chuẩn', faceCount: '500k', desc: 'Phù hợp dựng cảnh & kiểm duyệt nhanh' },
  { label: 'Tối ưu Game', faceCount: '50k', desc: 'Lưới nhẹ chuẩn thời gian thực' },
];

// Custom useTypewriter hook (speed default 32ms, startDelay default 450ms)
function useTypewriter(text: string, speed = 32, startDelay = 450) {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = window.setTimeout(() => {
      setStarted(true);
    }, startDelay);
    return () => window.clearTimeout(startTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    if (index >= text.length) return;

    const interval = window.setInterval(() => {
      setIndex((prev) => {
        if (prev >= text.length) {
          window.clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => window.clearInterval(interval);
  }, [started, index, text, speed]);

  return {
    displayed: text.slice(0, index),
    done: index >= text.length,
  };
}

const TYPEWRITER_COPY =
  'Biến ảnh chụp và bản phác thảo 2D thành mô hình 3D sắc nét, sẵn sàng xuất file STL/OBJ và đặt in 3D thực tế.';

const PILL_ACTIONS = [
  { label: 'Tạo 3D từ ảnh 2D', action: 'studio' },
  { label: 'Thử mẫu 3D có sẵn', action: 'preset' },
  { label: 'Đặt in 3D SLA / FDM', action: 'studio' },
  { label: 'Thư viện cộng đồng 3D', action: 'community' },
] as const;

export default function HeroCreateSection() {
  const navigate = useNavigate();
  const layer1Offset = useParallax({ speed: -0.1, maxOffset: 40 });
  const layer2Offset = useParallax({ speed: 0.05, maxOffset: 25 });
  const isLoggedIn = Boolean(getAccessToken());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPresetTitle, setSelectedPresetTitle] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [presetCycleIdx, setPresetCycleIdx] = useState(0);

  // Navbar & Pill states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Dropdown states
  const [detailLevel, setDetailLevel] = useState<string>(DETAIL_LEVELS[0]);
  const [selectedFaceCount, setSelectedFaceCount] = useState<FaceCount>(FACE_COUNTS[0]);
  const [modelName, setModelName] = useState<string>(AI_MODELS[0].name);
  const [showDetailDropdown, setShowDetailDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const { displayed, done } = useTypewriter(TYPEWRITER_COPY, 28, 400);

  // Reveal action pill buttons 400ms after page load
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPillsVisible(true);
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowDetailDropdown(false);
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedPresetTitle(null);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setSelectedPresetTitle(null);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = (e: MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setSelectedPresetTitle(null);
    if (previewUrl) {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyPreset = (preset: ModelPreset) => {
    setPreviewUrl(preset.imageUrl);
    setSelectedFile(null);
    setSelectedPresetTitle(preset.title);
    setModelName(preset.model);
  };

  const handleQuickDemoPrefill = () => {
    const preset = MODEL_PRESETS[presetCycleIdx % MODEL_PRESETS.length];
    setPresetCycleIdx((prev) => prev + 1);
    handleApplyPreset(preset);
  };

  const handleGoToLogin = () => {
    window.dispatchEvent(
      new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }),
    );
  };

  const handleStartGeneration = () => {
    navigate('/create', {
      state: {
        presetUrl: previewUrl,
        selectedFile,
        modelName,
        detailLevel,
        faceCount: selectedFaceCount,
      },
    });
  };

  const handleCopyEmail = () => {
    void navigator.clipboard?.writeText('studio@idea2model.com');
    setCopiedEmail(true);
    window.setTimeout(() => setCopiedEmail(false), 1800);
  };

  const scrollToCommunity = () => {
    const el = document.getElementById('community-showcase');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePillAction = (action: 'studio' | 'preset' | 'community') => {
    if (action === 'studio') {
      handleStartGeneration();
    } else if (action === 'preset') {
      handleQuickDemoPrefill();
    } else {
      scrollToCommunity();
    }
  };

  return (
    <section className="relative z-[1] w-full min-h-screen flex flex-col justify-between px-5 sm:px-8 md:px-10 pt-4 pb-8 overflow-visible">
      {/* TOP NAVBAR (z-index: 10) — Synchronized with THE BOYS · Idea2Model */}
      <header className="relative z-10 w-full flex items-center justify-between py-2 sm:py-3">
        {/* Logo (left) */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <span
            className="text-[20px] sm:text-[24px] font-bold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            THE BOYS®
          </span>
          <span
            className="text-[22px] sm:text-[26px] text-white select-none"
            style={{ letterSpacing: '-0.02em' }}
            aria-hidden="true"
          >
            ✳︎
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono-mesh uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/12 border border-white/20 text-zinc-200">
            Idea2Model 3D
          </span>
        </div>

        {/* Desktop nav links: 3 links cleanly spaced with whitespace-nowrap */}
        <nav className="hidden md:flex items-center text-[15px] lg:text-[17px] font-medium text-white whitespace-nowrap">
          {[
            { label: 'Studio 3D', onClick: handleStartGeneration },

            { label: 'Thư viện mẫu', onClick: scrollToCommunity },
            { label: 'Bảng giá in', onClick: () => navigate('/ticket-prices') },
          ].map((item, idx, arr) => (
            <span key={item.label} className="inline-flex items-center">
              <button
                type="button"
                onClick={item.onClick}
                className="hover:opacity-65 transition-opacity cursor-pointer"
              >
                {item.label}
              </button>
              {idx < arr.length - 1 && <span className="mr-2.5 text-white/50">,</span>}
            </span>
          ))}
        </nav>

        {/* Desktop CTA (right, hidden below md) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartGeneration}
            className="text-[16px] lg:text-[18px] font-semibold text-white underline underline-offset-4 hover:opacity-65 transition-opacity cursor-pointer"
          >
            Mở Studio 3D
          </button>
          {!isLoggedIn && (
            <button
              type="button"
              onClick={handleGoToLogin}
              className="liquid-glass inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/90 hover:text-white hover:border-white/40 transition-all cursor-pointer shadow-sm ml-1"
            >
              <span>Đăng nhập</span>
            </button>
          )}
        </div>

        {/* Mobile hamburger (visible below md) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Mở menu điều hướng"
          className="md:hidden relative z-20 flex flex-col justify-center items-center gap-[5px] p-2 cursor-pointer"
        >
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 ${
              mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 ${
              mobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white transition-all duration-300 ${
              mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </header>

      {/* Mobile overlay (z-index: 9) */}
      <div
        className={`fixed inset-0 z-[9] bg-[#0e0e12]/95 backdrop-blur-xl flex flex-col justify-center items-start px-8 gap-7 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {[
          { label: 'Studio 3D', action: handleStartGeneration },
          { label: 'In 3D SLA/FDM', action: handleStartGeneration },
          { label: 'Thư viện mẫu', action: scrollToCommunity },
          { label: 'Đơn hàng', action: () => navigate('/my-bookings') },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              item.action();
            }}
            className="text-[28px] font-medium text-white hover:opacity-60 transition-opacity cursor-pointer"
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            handleStartGeneration();
          }}
          className="text-[28px] font-semibold text-white underline underline-offset-4 hover:opacity-60 transition-opacity cursor-pointer"
        >
          Mở Studio 3D
        </button>
        {!isLoggedIn && (
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleGoToLogin();
            }}
            className="text-[28px] font-medium text-cyan-400 hover:text-cyan-300 transition-opacity cursor-pointer"
          >
            Đăng nhập
          </button>
        )}
      </div>

      {/* LEFT-ALIGNED HERO STACK:
          Positioned on the left column so the 3D character on the right (70% center) is 100% unobstructed */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto my-auto py-4">
        <div className="w-full max-w-[656px] mr-auto flex flex-col items-start gap-5">
          {/* Layer 1 & 2: Parallax Ambient Flare + Bold Display Headline */}
          <div
            style={{ transform: `translateY(${layer1Offset}px)` }}
            className="pointer-events-none absolute -left-20 -top-10 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl -z-10"
            aria-hidden="true"
          />
          <div className="w-full">
            <div
              className="pointer-events-none select-none mb-2.5 transition-transform duration-150"
              style={{
                fontSize: 'clamp(32px, 4.5vw, 56px)',

                fontWeight: 900,
                lineHeight: 1.1,
                transform: `translateY(${layer2Offset}px)`,
                color: '#fff',

              }}
            >
              <span className="text-cyan-400 font-mono tracking-widest text-xs uppercase block font-semibold mb-2">01 // AI SPATIAL MESH &amp; 3D PRINTING STUDIO</span>Biến Ảnh 2D Thành <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-200">Mô Hình 3D</span>


            </div>

            <p
              className="text-white font-medium"
              style={{
                fontSize: 'clamp(17px, 2.2vw, 22px)',
                lineHeight: 1.4,
                minHeight: '60px',
              }}
            >
              {displayed}
              {!done && (
                <span className="inline-block w-[2px] h-[1.1em] bg-cyan-400 align-middle ml-[2px] animate-cursor-blink" />
              )}
            </p>
          </div>

          {/* 2. THE BOYS 3D UPLOAD CONSOLE — Left-aligned & Synchronized Crimson/Burgundy Frosted Glass */}
          <div className="w-full">
            {/* Tạo nhanh Header */}
            <div className="flex items-center justify-end mb-2.5">
              <button
                type="button"
                onClick={handleStartGeneration}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 h-[32px] rounded-full bg-white/14 hover:bg-white text-white hover:text-[#2a0408] border border-white/25 backdrop-blur-md text-xs font-semibold transition-all duration-200 shadow-[0_4px_14px_rgba(20,2,5,0.3)] cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Tạo nhanh</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/*"
              className="hidden"
            />

            {/* Synchronized Crimson/Burgundy Frosted Glass Console Shell */}
            <div
              ref={dropzoneRef}
              onPointerMove={(e) => {
                if (!dropzoneRef.current) return;
                const rect = dropzoneRef.current.getBoundingClientRect();
                dropzoneRef.current.style.setProperty(
                  '--mx',
                  `${(e.clientX - rect.left).toFixed(1)}px`
                );
                dropzoneRef.current.style.setProperty(
                  '--my',
                  `${(e.clientY - rect.top).toFixed(1)}px`
                );
              }}
              className={`relative w-full rounded-[20px] p-3.5 sm:p-4 bg-[#121217]/75 backdrop-blur-2xl border transition-all duration-300 shadow-[0_24px_60px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.18)] ${
                isDragging
                  ? 'border-white bg-[#1a1a24]/85'
                  : 'border-white/20 hover:border-white/35'
              }`}
            >
              {/* Subtle cursor-following white spotlight */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[20px] overflow-hidden z-0"
                style={{
                  background:
                    'radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 0.08), transparent 70%)',
                }}
                aria-hidden="true"
              />

              {/* Interactive Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative z-10 w-full rounded-[14px] border border-dashed transition-all duration-300 px-5 py-6 sm:py-7 flex flex-col items-center justify-center cursor-pointer min-h-[148px] ${
                  isDragging
                    ? 'border-white bg-white/15'
                    : 'border-white/25 hover:border-white/55 bg-black/35 hover:bg-black/50'
                }`}
              >
                {previewUrl ? (
                  <div className="relative group/preview flex flex-col items-center">
                    <div className="relative rounded-xl overflow-hidden border border-white/35 bg-black/60 shadow-[0_12px_30px_rgba(0,0,0,0.65)] p-1.5">
                      <img
                        src={previewUrl}
                        alt="Bản xem trước"
                        className="max-h-24 rounded-lg object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-[#181820] hover:bg-white text-white hover:text-[#09090b] border border-white/40 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-white font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-white/15 border border-white/30 font-mono-mesh text-[10.5px]">
                        {selectedFaceCount}
                      </span>
                      <span className="text-white/95">
                        {selectedFile?.name || selectedPresetTitle || 'Mẫu ảnh đã chọn'}
                      </span>
                      <span className="text-zinc-400">· Nhấp để đổi</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 3D Cube / Upload Icon synchronized with Obsidian Glass */}
                    <div className="relative flex items-center justify-center">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-white/20 to-black/60 border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_18px_rgba(0,0,0,0.4)] flex items-center justify-center text-white">
                        <Box className="w-5 h-5 stroke-[1.75] text-white" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#09090b] flex items-center justify-center text-[#09090b] shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Integrated Single-Row Console Control Bar (100% contained inside box, zero overlap) */}
              <div
                ref={toolbarRef}
                className="relative z-20 w-full mt-3 pt-2.5 border-t border-white/15 flex items-center justify-end gap-2 text-xs flex-wrap sm:flex-nowrap"
              >
                {/* Burgundy Glass Dropdowns, Settings Gear, and Crisp White CTA */}
                <div className="flex items-center justify-end gap-2 shrink-0 ml-auto flex-wrap sm:flex-nowrap">
                  {/* Detail & Mesh Resolution Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailDropdown(!showDetailDropdown);
                        setShowModelDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 h-[32px] rounded-[9px] bg-white/10 hover:bg-white/18 border border-white/20 hover:border-white/45 text-white transition-all text-[11.5px] cursor-pointer whitespace-nowrap"
                    >
                      <Layers className="w-3 h-3 text-white/90 shrink-0" />
                      <span>{detailLevel}</span>
                      <span className="px-1.5 py-0.2 rounded bg-white/20 text-white font-mono-mesh text-[10px] font-semibold">
                        {selectedFaceCount}
                      </span>
                      <ChevronDown className="w-3 h-3 text-rose-100/75 shrink-0" />
                    </button>

                    {showDetailDropdown && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-60 bg-[#260408]/95 backdrop-blur-2xl border border-white/25 rounded-2xl shadow-[0_20px_50px_rgba(14,1,3,0.9)] p-1.5 z-50">
                        <div className="px-2.5 py-1.5 text-[10px] font-mono-mesh uppercase tracking-wider text-rose-100/70 border-b border-white/10">
                          Độ phân giải lưới (Mesh Polycount)
                        </div>
                        {DETAIL_OPTIONS.map((opt) => {
                          const isActive =
                            detailLevel === opt.label && selectedFaceCount === opt.faceCount;
                          return (
                            <button
                              key={opt.faceCount}
                              type="button"
                              onClick={() => {
                                setDetailLevel(opt.label);
                                setSelectedFaceCount(opt.faceCount);
                                setShowDetailDropdown(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                isActive
                                  ? 'bg-white/18 text-white'
                                  : 'text-white/90 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold">{opt.label}</span>
                                <span className="text-[10px] text-zinc-400">{opt.desc}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/25 font-mono-mesh text-[10.5px] text-white">
                                  {opt.faceCount}
                                </span>
                                {isActive && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* AI Engine Selector Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModelDropdown(!showModelDropdown);
                        setShowDetailDropdown(false);
                      }}
                      className="flex items-center justify-between gap-1.5 px-2.5 h-[32px] w-[136px] rounded-[9px] bg-white/10 hover:bg-white/18 border border-white/20 hover:border-white/45 text-white transition-all text-[11.5px] cursor-pointer whitespace-nowrap overflow-hidden"
                    >
                      <span className="truncate">{modelName}</span>
                      <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
                    </button>

                    {showModelDropdown && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-64 bg-[#14141a]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-1.5 z-50">
                        <div className="px-2.5 py-1.5 text-[10px] font-mono-mesh uppercase tracking-wider text-zinc-400 border-b border-white/10">
                          AI Spatial Mesh Engine
                        </div>
                        {AI_MODELS.map((model) => {
                          const isActive = modelName === model.name;
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                setModelName(model.name);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                                isActive
                                  ? 'bg-white/18 text-white'
                                  : 'text-white/90 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-semibold">{model.name}</span>
                                <div className="flex items-center gap-1.5">
                                  {model.badge && (
                                    <span className="px-1.5 py-0.2 rounded bg-white/20 border border-white/30 text-[9.5px] font-semibold text-white">
                                      {model.badge}
                                    </span>
                                  )}
                                  {isActive && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                              </div>
                              <span className="text-[10px] text-zinc-400 line-clamp-1">
                                {model.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Settings Gear Button */}
                  <button
                    type="button"
                    onClick={handleStartGeneration}
                    className="w-[32px] h-[32px] rounded-[9px] bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/45 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Mở cài đặt nâng cao trong Studio 3D"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {/* Primary CTA Button ("Tạo ra") — Flush inside the glass box */}
                  <button
                    type="button"
                    onClick={handleStartGeneration}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 h-[32px] rounded-[9px] bg-white hover:bg-zinc-100 text-[#09090b] font-bold text-xs shadow-[0_4px_14px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#09090b] stroke-[2.2]" />
                    <span>Tạo ra</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Project Action Pill Buttons (Fade-in + slide-up 400ms after load) */}
          <div
            className="flex flex-wrap gap-y-1 pt-0.5"
            style={{
              opacity: pillsVisible ? 1 : 0,
              transform: pillsVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {PILL_ACTIONS.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => handlePillAction(pill.action)}
                className="inline-flex items-center justify-center bg-white text-[#09090b] border border-white/20 rounded-full text-[12.5px] sm:text-[13.5px] font-semibold px-4 py-[0.35em] mr-2 mb-2 whitespace-nowrap hover:bg-[#181820] hover:text-white hover:border-white/50 transition-colors duration-200 cursor-pointer"
              >
                {pill.label}
              </button>
            ))}

            {/* 1 outline pill button: Hỗ trợ in 3D: studio@idea2model.com */}
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center gap-2 text-cyan-200 bg-cyan-950/40 backdrop-blur-md border border-cyan-400/40 rounded-full text-[12.5px] sm:text-[13.5px] px-4 py-[0.35em] mb-2 whitespace-nowrap hover:bg-cyan-500/20 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              <span>
                {copiedEmail ? (
                  'Đã sao chép studio@idea2model.com'
                ) : (
                  <>
                    Hỗ trợ in 3D:{' '}
                    <span className="underline underline-offset-2">
                      studio@idea2model.com
                    </span>
                  </>
                )}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="4"
                  width="6.5"
                  height="6.5"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M8 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
