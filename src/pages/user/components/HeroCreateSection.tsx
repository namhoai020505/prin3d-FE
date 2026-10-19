import { useState, useRef, type ChangeEvent, type DragEvent, type MouseEvent } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  ArrowUp,
  ChevronDown,
  Settings,
  MoreHorizontal,
  X,
  Check,
} from 'lucide-react';

export default function HeroCreateSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Dropdown states
  const [detailLevel, setDetailLevel] = useState('Chi tiết cao');
  const [modelName, setModelName] = useState('TheBoys 7.1 - Flagship');
  const [showDetailDropdown, setShowDetailDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = (e: MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="relative w-full flex flex-col items-center pt-2 pb-8 px-4">
      {/* Background warm gold radial aura */}
      <div
        className="pointer-events-none absolute top-[-60px] left-1/2 -translate-x-1/2 w-[720px] max-w-[95vw] h-[360px] bg-amber-500/10 blur-[140px] rounded-full"
        aria-hidden="true"
      />

      {/* Main Title */}
      <h1 className="text-2xl md:text-[32px] font-bold text-white tracking-tight text-center mb-5 z-10">
        Chào, namhoai020505! Bạn sẽ tạo gì trong 3D?
      </h1>

      {/* Mode Tag: Tạo nhanh with Gold Accent (Chế độ tác nhân removed as requested) */}
      <div className="z-10 inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#17140b] border border-amber-500/35 rounded-full shadow-inner mb-6 text-xs font-semibold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Tạo nhanh</span>
      </div>

      {/* Upload Drag & Drop Container with Gold Glow */}
      <div className="w-full max-w-2xl z-10">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative w-full rounded-3xl border transition-all duration-300 p-10 flex flex-col items-center justify-center cursor-pointer min-h-[160px] ${
            isDragging
              ? 'border-amber-400 bg-amber-950/20 scale-[1.01] shadow-[0_0_30px_rgba(245,158,11,0.2)]'
              : 'border-amber-500/35 hover:border-amber-400/80 bg-[#0e0c07]/80 hover:bg-[#120f09]/90 shadow-[0_0_35px_rgba(245,158,11,0.07)]'
          }`}
        >
          {previewUrl ? (
            <div className="relative group/preview flex flex-col items-center">
              <img
                src={previewUrl}
                alt="Bản xem trước"
                className="max-h-32 rounded-xl object-contain shadow-lg border border-amber-400/30"
              />
              <button
                onClick={handleRemoveFile}
                className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg transition-transform hover:scale-110"
                title="Xóa ảnh"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="text-[11px] text-amber-300 font-medium mt-2">
                {selectedFile?.name} (Click để chọn ảnh khác)
              </p>
            </div>
          ) : (
            <>
              {/* Image upload icon in gold style */}
              <div className="relative mb-3 flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-300">
                  <ImageIcon className="w-5 h-5 text-amber-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-500 to-yellow-500 border border-[#0e0c07] rounded-full flex items-center justify-center text-black">
                  <ArrowUp className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>

              {/* Upload text */}
              <p className="text-xs text-neutral-300 font-medium group-hover:text-amber-200 transition-colors">
                Tải lên ảnh hoặc bản phác thảo
              </p>
            </>
          )}
        </div>

        {/* Action Controls Toolbar under Upload Box */}
        <div className="w-full mt-3 flex items-center justify-between gap-3 text-xs flex-wrap">
          {/* Left: 3 preview thumbnails + '...' */}
          <div className="flex items-center gap-1.5">
            {/* Thumbnail 1: 3D Chest / Bag */}
            <div
              className="w-7 h-7 rounded-lg overflow-hidden border border-white/15 hover:border-amber-400 cursor-pointer transition-all hover:scale-105"
              title="Mẫu hộp rương"
            >
              <img
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=60&auto=format&fit=crop&q=80"
                alt="Chest"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnail 2: 3D Burger */}
            <div
              className="w-7 h-7 rounded-lg overflow-hidden border border-white/15 hover:border-amber-400 cursor-pointer transition-all hover:scale-105"
              title="Mẫu hamburger"
            >
              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=60&auto=format&fit=crop&q=80"
                alt="Burger"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnail 3: 3D Suitcase */}
            <div
              className="w-7 h-7 rounded-lg overflow-hidden border border-white/15 hover:border-amber-400 cursor-pointer transition-all hover:scale-105"
              title="Mẫu vali"
            >
              <img
                src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60&auto=format&fit=crop&q=80"
                alt="Suitcase"
                className="w-full h-full object-cover"
              />
            </div>

            {/* More button '...' */}
            <button
              className="w-7 h-7 rounded-lg bg-neutral-900 border border-white/10 hover:border-amber-400/50 flex items-center justify-center text-neutral-400 hover:text-amber-300 transition-colors"
              title="Xem thêm mẫu"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Detail Dropdown, Model Dropdown (TheBoys), Settings, Generate Button */}
          <div className="flex items-center gap-2">
            {/* Detail dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDetailDropdown(!showDetailDropdown);
                  setShowModelDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#110f0b] hover:bg-[#18150f] border border-amber-500/20 text-neutral-300 hover:text-amber-200 transition-colors text-xs"
              >
                <span>{detailLevel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {showDetailDropdown && (
                <div className="absolute right-0 bottom-full mb-1 w-36 bg-[#16130d] border border-amber-500/25 rounded-lg shadow-2xl py-1 z-30">
                  {['Chi tiết cao', 'Chi tiết chuẩn', 'Siêu chi tiết'].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setDetailLevel(level);
                        setShowDetailDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:text-amber-300 hover:bg-amber-500/10 flex items-center justify-between"
                    >
                      <span>{level}</span>
                      {detailLevel === level && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model version dropdown: TheBoys */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowModelDropdown(!showModelDropdown);
                  setShowDetailDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#110f0b] hover:bg-[#18150f] border border-amber-500/20 text-neutral-300 hover:text-amber-200 transition-colors text-xs"
              >
                <span>{modelName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {showModelDropdown && (
                <div className="absolute right-0 bottom-full mb-1 w-48 bg-[#16130d] border border-amber-500/25 rounded-lg shadow-2xl py-1 z-30">
                  {['TheBoys 7.1 - Flagship', 'TheBoys 7.0 - Pro', 'TheBoys 6.5 - Fast'].map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        setModelName(model);
                        setShowModelDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:text-amber-300 hover:bg-amber-500/10 flex items-center justify-between"
                    >
                      <span>{model}</span>
                      {modelName === model && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings button */}
            <button
              className="p-1.5 rounded-lg bg-[#110f0b] hover:bg-[#18150f] border border-amber-500/20 text-neutral-400 hover:text-amber-300 transition-colors"
              title="Cài đặt mô hình"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Tạo ra Button in Gold Styling */}
            <button
              disabled={!selectedFile}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                selectedFile
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95'
                  : 'bg-[#181510] text-neutral-500 cursor-not-allowed border border-white/5'
              }`}
            >
              Tạo ra
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
