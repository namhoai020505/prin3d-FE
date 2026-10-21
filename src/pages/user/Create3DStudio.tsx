import { useState, useRef, useEffect, useCallback, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  LayoutGrid,
  Layers,
  Box,
  Maximize2,
  Compass,
  Upload,
  X,
  Download,
  Lock,
  Unlock,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { createImageGeneration, downloadGenerationFile, getGeneration, listGenerations, type GenerationStatus, type GenerationTask } from '../../services/generationService';
import { AUTH_SESSION_EVENT, getAccessToken, isAccessTokenExpired } from '../../lib/auth';
import { AI_MODELS, FACE_COUNTS, type FaceCount } from '../../constants/models';
import Studio3DViewport from './components/Studio3DViewport';

interface GeneratedAsset {
  id: string;
  name: string;
  date: string;
  status: GenerationStatus;
  stage: string;
  progress: number;
  errorMessage?: string | null;
  glbUrl?: string | null;
  stlUrl?: string | null;
}

const toAsset = (task: GenerationTask): GeneratedAsset => ({
  id: task.id,
  name: task.modelName?.trim() || '3D model',
  date: new Date(task.createdAtUtc).toLocaleString('vi-VN'),
  status: task.status,
  stage: task.stage,
  progress: task.progress,
  errorMessage: task.errorMessage,
  glbUrl: task.glbUrl,
  stlUrl: task.stlUrl,
});

const isTerminalStatus = (status: GenerationStatus) =>
  ['succeeded', 'failed', 'expired', 'needsAttention'].includes(status);

const statusLabel = (status: GenerationStatus) => ({
  queued: 'Đang xếp hàng',
  processing: 'Đang tạo mô hình',
  meshOptimizing: 'Đang tối ưu mesh',
  succeeded: 'Hoàn tất',
  failed: 'Thất bại',
  expired: 'Đã hết hạn',
  needsAttention: 'Cần kiểm tra',
}[status]);

const QUICK_PRESETS = [
  {
    label: 'Chibi Mech',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=700&auto=format&fit=crop&q=80',
  },
  {
    label: 'Mèo Thần Tài',
    url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=700&auto=format&fit=crop&q=80',
  },
  {
    label: 'Cyber Helmet',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=700&auto=format&fit=crop&q=80',
  },
];

export default function Create3DStudio() {
  const location = useLocation();
  const locationState = location.state as {
    presetUrl?: string;
    selectedFile?: File;
    modelName?: string;
    detailLevel?: string;
    faceCount?: FaceCount;
  } | null;

  // Mode selection: 'text' | 'image'
  const [generationMode, setGenerationMode] = useState<'text' | 'image'>('image');
  const [promptText, setPromptText] = useState('');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 900);

  // Model settings
  const [selectedModel, setSelectedModel] = useState(
    locationState?.modelName || AI_MODELS[0].name
  );
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [shouldTexture, setShouldTexture] = useState(false);
  const [faceCount, setFaceCount] = useState<FaceCount>(() =>
    locationState?.faceCount && FACE_COUNTS.includes(locationState.faceCount)
      ? locationState.faceCount
      : FACE_COUNTS[0]
  );

  // Ground Grid & Viewport settings
  const [groundGridEnabled, setGroundGridEnabled] = useState(true);

  // Image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    locationState?.presetUrl || null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(
    locationState?.selectedFile || null
  );
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // 3D Model Dimensions, Scale & Bounding Box Inspector States
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [isDimensionsPanelOpen, setIsDimensionsPanelOpen] = useState(true);
  const [isUniformScale, setIsUniformScale] = useState(true);
  const [scalePercent, setScalePercent] = useState(100);
  const [baseDimensions, setBaseDimensions] = useState({ x: 85, y: 120, z: 85 });
  const [dimensions, setDimensions] = useState({ x: 85, y: 120, z: 85 });
  const [dimInputs, setDimInputs] = useState<{ x: string; y: string; z: string }>({
    x: '85',
    y: '120',
    z: '85',
  });
  const [meshScale, setMeshScale] = useState({ x: 1, y: 1, z: 1 });

  const onBaseDimensionsCalculated = useCallback((dims: { x: number; y: number; z: number }) => {
    setBaseDimensions(dims);
    setDimensions(dims);
    setDimInputs({
      x: String(dims.x),
      y: String(dims.y),
      z: String(dims.z),
    });
    setScalePercent(100);
    setMeshScale({ x: 1, y: 1, z: 1 });
  }, []);

  const applyDimension = useCallback(
    (axis: 'x' | 'y' | 'z', val: number, syncInputs = true) => {
      if (isUniformScale) {
        const baseVal = baseDimensions[axis] || 1;
        const ratio = val / baseVal;
        const newDims = {
          x: Math.round(baseDimensions.x * ratio),
          y: Math.round(baseDimensions.y * ratio),
          z: Math.round(baseDimensions.z * ratio),
        };
        newDims[axis] = val;
        setDimensions(newDims);
        if (syncInputs) {
          setDimInputs({
            x: String(newDims.x),
            y: String(newDims.y),
            z: String(newDims.z),
          });
        }
        setScalePercent(Math.round(ratio * 100));
        setMeshScale({ x: ratio, y: ratio, z: ratio });
      } else {
        const newDims = { ...dimensions, [axis]: val };
        setDimensions(newDims);
        if (syncInputs) {
          setDimInputs((prev) => ({ ...prev, [axis]: String(val) }));
        }
        const scaleX = baseDimensions.x ? newDims.x / baseDimensions.x : 1;
        const scaleY = baseDimensions.y ? newDims.y / baseDimensions.y : 1;
        const scaleZ = baseDimensions.z ? newDims.z / baseDimensions.z : 1;
        setMeshScale({ x: scaleX, y: scaleY, z: scaleZ });
      }
    },
    [baseDimensions, dimensions, isUniformScale]
  );

  const handleInputChange = useCallback(
    (axis: 'x' | 'y' | 'z', strVal: string) => {
      const cleanStr = strVal.replace(/[^0-9]/g, '');
      setDimInputs((prev) => ({ ...prev, [axis]: cleanStr }));
      if (!cleanStr) return;
      const num = parseInt(cleanStr, 10);
      if (!isNaN(num) && num >= 5 && num <= 1000) {
        applyDimension(axis, num, false);
      }
    },
    [applyDimension]
  );

  const commitDimension = useCallback(
    (axis: 'x' | 'y' | 'z') => {
      const currentStr = dimInputs[axis];
      let num = parseInt(currentStr, 10);
      if (isNaN(num) || num < 5) {
        num = Math.max(5, dimensions[axis] || 5);
      } else if (num > 1000) {
        num = 1000;
      }
      applyDimension(axis, num, true);
    },
    [dimInputs, dimensions, applyDimension]
  );

  const stepDimension = useCallback(
    (axis: 'x' | 'y' | 'z', delta: number) => {
      const currentVal = dimensions[axis] || 5;
      const newVal = Math.max(5, Math.min(1000, currentVal + delta));
      applyDimension(axis, newVal, true);
    },
    [dimensions, applyDimension]
  );

  const handleScalePercentChange = useCallback(
    (percent: number) => {
      const clamped = Math.max(10, Math.min(500, Math.round(percent)));
      setScalePercent(clamped);
      const ratio = clamped / 100;
      const newDims = {
        x: Math.round(baseDimensions.x * ratio),
        y: Math.round(baseDimensions.y * ratio),
        z: Math.round(baseDimensions.z * ratio),
      };
      setDimensions(newDims);
      setDimInputs({
        x: String(newDims.x),
        y: String(newDims.y),
        z: String(newDims.z),
      });
      setMeshScale({ x: ratio, y: ratio, z: ratio });
    },
    [baseDimensions]
  );

  const resetDimensions = useCallback(() => {
    setDimensions({ ...baseDimensions });
    setDimInputs({
      x: String(baseDimensions.x),
      y: String(baseDimensions.y),
      z: String(baseDimensions.z),
    });
    setScalePercent(100);
    setMeshScale({ x: 1, y: 1, z: 1 });
  }, [baseDimensions]);

  const volumeCm3 = Math.max(1, Math.round(((dimensions.x * dimensions.y * dimensions.z) * 0.35) / 1000));
  const estimatedGrams = Math.max(1, Math.round(volumeCm3 * 1.24 * 0.35));
  const isWithinStandardPrintBed = dimensions.x <= 220 && dimensions.z <= 220 && dimensions.y <= 250;

  // Paste image from clipboard support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            setUploadedFile(file);
            setUploadedImage(URL.createObjectURL(file));
            setGenerationMode('image');
            setGenerationError('');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Right panel tabs: 'Assets' | 'Layer' | 'Property'
  const [rightTab, setRightTab] = useState<'Assets' | 'Layer' | 'Property'>('Assets');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [activeModelMesh, setActiveModelMesh] = useState<GeneratedAsset | null>(null);
  const [generationError, setGenerationError] = useState('');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [authSessionRevision, setAuthSessionRevision] = useState(0);
  const pollTimers = useRef<number[]>([]);

  // If a file was passed via location.state, create object URL
  useEffect(() => {
    const file = locationState?.selectedFile;
    if (file && !uploadedImage) {
      void Promise.resolve().then(() => {
        setUploadedImage(URL.createObjectURL(file));
      });
    }
  }, [locationState, uploadedImage]);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leftPanelRef.current && !leftPanelRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelDropdownOpen]);

  // Handle image upload
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (uploadedImage && uploadedImage.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedImage);
      }
      setUploadedFile(file);
      setUploadedImage(URL.createObjectURL(file));
      setGenerationError('');
    }
  };

  const updateAsset = (task: GenerationTask) => {
    const nextAsset = toAsset(task);
    setAssets((current) => {
      const exists = current.some((asset) => asset.id === nextAsset.id);
      return exists
        ? current.map((asset) => (asset.id === nextAsset.id ? nextAsset : asset))
        : [nextAsset, ...current];
    });
    setActiveModelMesh((current) => current?.id === nextAsset.id ? nextAsset : current);
    setGenerationProgress(nextAsset.progress);
    return nextAsset;
  };

  const pollGeneration = async (id: string) => {
    try {
      const task = await getGeneration(id);
      updateAsset(task);

      if (isTerminalStatus(task.status)) {
        setIsGenerating(false);
        if (task.status !== 'succeeded') {
          setGenerationError(task.errorMessage || 'Không thể tạo mô hình. Vui lòng thử lại.');
        }
        return;
      }

      const timer = window.setTimeout(() => void pollGeneration(id), 3_000);
      pollTimers.current.push(timer);
    } catch {
      setIsGenerating(false);
      setGenerationError('Không thể cập nhật trạng thái tạo mô hình. Vui lòng tải lại trang.');
    }
  };

  const handleGenerate = async () => {
    setGenerationError('');
    const token = getAccessToken();
    if (!token || isAccessTokenExpired(token)) {
      setGenerationError('Hãy đăng nhập trước khi tạo mô hình 3D.');
      return;
    }
    if (!uploadedFile && !uploadedImage) {
      setGenerationError('Hãy tải lên ảnh PNG, JPEG hoặc WEBP (tối đa 15 MB) để tạo 3D.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    try {
      let fileToUpload = uploadedFile;
      // If user selected a preset URL, fetch as file blob
      if (!fileToUpload && uploadedImage) {
        const res = await fetch(uploadedImage);
        const blob = await res.blob();
        fileToUpload = new File([blob], 'preset-image.jpg', { type: blob.type || 'image/jpeg' });
      }

      if (!fileToUpload) {
        throw new Error('Chưa có file ảnh hợp lệ');
      }

      const task = await createImageGeneration({
        image: fileToUpload,
        modelName: promptText.trim().slice(0, 200) || selectedModel,
        shouldTexture,
      });
      const asset = updateAsset(task);
      setActiveModelMesh(asset);
      void pollGeneration(task.id);
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { detail?: string; title?: string; message?: string } } }).response?.data?.detail
        || (error as { response?: { data?: { title?: string } } }).response?.data?.title
        || (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setGenerationError(message || 'Không thể gửi yêu cầu tạo mô hình. Kiểm tra backend và kết nối.');
      setIsGenerating(false);
    }
  };

  const handleDownload = async (
    event: ReactMouseEvent<HTMLButtonElement>,
    asset: GeneratedAsset,
    kind: 'glb' | 'stl',
  ) => {
    event.stopPropagation();
    const url = kind === 'glb' ? asset.glbUrl : asset.stlUrl;
    if (!url) return;

    const key = `${asset.id}-${kind}`;
    setDownloadingFile(key);
    setGenerationError('');
    try {
      await downloadGenerationFile(url, `${asset.name.replace(/[^a-z0-9_-]/gi, '_') || 'model'}.${kind}`);
    } catch {
      setGenerationError(`Không thể tải file ${kind.toUpperCase()}. Hãy đăng nhập lại rồi thử lại.`);
    } finally {
      setDownloadingFile(null);
    }
  };

  useEffect(() => {
    const handleAuthSessionChanged = () => setAuthSessionRevision((current) => current + 1);
    window.addEventListener(AUTH_SESSION_EVENT, handleAuthSessionChanged);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleAuthSessionChanged);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || isAccessTokenExpired(token)) {
      void Promise.resolve().then(() => {
        setAssets([]);
        setActiveModelMesh(null);
      });
      return;
    }

    void listGenerations()
      .then((tasks) => {
        const loadedAssets = tasks.map(toAsset);
        setAssets(loadedAssets);
        const activeTask = tasks.find((task) => !isTerminalStatus(task.status));
        if (activeTask) {
          setIsGenerating(true);
          setGenerationProgress(activeTask.progress);
          void pollGeneration(activeTask.id);
        }
      })
      .catch(() => setGenerationError('Không tải được danh sách mô hình từ backend.'));

    return () => {
      pollTimers.current.forEach((timer) => window.clearTimeout(timer));
      pollTimers.current = [];
    };
  }, [authSessionRevision]);

  useEffect(() => () => {
    if (uploadedImage && uploadedImage.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedImage);
    }
  }, [uploadedImage]);

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-[#06080d] flex">
      {/* Three.js 3D Viewport with OrbitControls, Blender Orientation Gizmo, Shading modes & Realtime Stats */}
      <Studio3DViewport
        faceCount={faceCount}
        shouldTexture={shouldTexture}
        groundGridEnabled={groundGridEnabled}
        onToggleGroundGrid={() => setGroundGridEnabled((prev) => !prev)}
        isLeftPanelOpen={isLeftPanelOpen}
        isRightPanelOpen={isRightPanelOpen}
        activeModelGlbUrl={activeModelMesh?.glbUrl}
        activeModelName={activeModelMesh?.name}
        isGenerating={isGenerating}
        showBoundingBox={showBoundingBox}
        onToggleBoundingBox={() => setShowBoundingBox((prev) => !prev)}
        meshScale={meshScale}
        onBaseDimensionsCalculated={onBaseDimensionsCalculated}
      />

      {/* Left Column Stack: Tạo hình mô hình 3D (trên) & Kích thước & Scale (dưới) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 w-[336px] max-w-[calc(100vw-5rem)] max-h-[calc(100vh-2rem)] pointer-events-none">
        {/* Panel 1: Tạo hình mô hình 3D */}
        {isLeftPanelOpen ? (
          <div
            ref={leftPanelRef}
            className="pointer-events-auto w-full max-h-[58vh] overflow-y-auto no-scrollbar bg-[#0a0d13]/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-4 shadow-2xl shadow-black/90 text-white flex flex-col gap-3.5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-[13px] font-semibold text-white tracking-wide">
                  Tạo hình mô hình 3D
                </h2>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-300 font-mono">
                  AI 7.1
                </span>
              </div>
              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Thu gọn bảng"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="bg-black/45 p-1 rounded-xl flex gap-1 border border-white/10">
              <button
                type="button"
                disabled
                className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium text-neutral-500 cursor-not-allowed opacity-60 text-center"
              >
                Text-to-3D <span className="text-[9px] opacity-70">(sớm)</span>
              </button>
              <button
                onClick={() => setGenerationMode('image')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${generationMode === 'image'
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                Image-to-3D
              </button>
            </div>

            {/* Content Area */}
            {generationMode === 'text' ? (
              <div className="bg-black/35 border border-white/10 rounded-xl p-3 flex flex-col justify-between min-h-[145px] focus-within:border-cyan-400/50 transition-colors">
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value.slice(0, 500))}
                  placeholder="Nhập mô tả chi tiết mô hình 3D bạn muốn tạo. Ví dụ: Tượng mèo may mắn mạ vàng phong cách stylized..."
                  className="w-full h-24 bg-transparent resize-none outline-none text-xs text-white placeholder:text-neutral-500 leading-relaxed"
                />
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-cyan-300 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3 text-cyan-400" />
                    <span>Hướng dẫn</span>
                  </button>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {promptText.length}/500
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (uploadedImage && uploadedImage.startsWith('blob:')) {
                        URL.revokeObjectURL(uploadedImage);
                      }
                      setUploadedFile(file);
                      setUploadedImage(URL.createObjectURL(file));
                      setGenerationError('');
                    }
                  }}
                  className={`bg-black/40 border border-dashed rounded-xl p-3 flex flex-col items-center justify-center min-h-[135px] transition-all ${isDraggingFile
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-white/15 hover:border-cyan-400/50 hover:bg-black/55'
                    }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {uploadedImage ? (
                    <div className="relative w-full h-28 rounded-lg overflow-hidden group">
                      <img src={uploadedImage} alt="Input" className="w-full h-full object-contain bg-black/50" />
                      <button
                        onClick={() => {
                          if (uploadedImage.startsWith('blob:')) {
                            URL.revokeObjectURL(uploadedImage);
                          }
                          setUploadedImage(null);
                          setUploadedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/85 rounded-full hover:bg-rose-600 text-white cursor-pointer transition-colors"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-cyan-300 cursor-pointer p-3 text-center transition-colors w-full"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-cyan-300 group-hover:border-cyan-400/40 transition-colors">
                        <Upload className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <span className="text-xs font-medium text-white/90">Kéo thả ảnh hoặc nhấp để tải</span>
                      <span className="text-[10px] text-neutral-500">Hỗ trợ PNG, JPG, WEBP · Dán Ctrl+V</span>
                    </div>
                  )}
                </div>

                {/* Quick Preset Chips */}
                {!uploadedImage && (
                  <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-neutral-500 whitespace-nowrap">Thử mẫu:</span>
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setUploadedImage(preset.url);
                          setUploadedFile(null);
                          setGenerationError('');
                        }}
                        className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/12 border border-white/10 hover:border-cyan-400/40 text-[10px] text-zinc-300 hover:text-white transition-all whitespace-nowrap cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Model Selection Dropdown */}
            <div className="relative flex flex-col gap-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-300 font-medium">
                <span>Mô hình AI</span>
                <Info className="w-3 h-3 text-neutral-500" />
              </div>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="w-full px-3 py-2 bg-black/40 border border-white/12 rounded-xl text-xs text-white flex items-center justify-between hover:border-cyan-400/45 transition-colors cursor-pointer"
              >
                <span className="font-medium truncate">{selectedModel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0e121a]/95 border border-white/15 rounded-xl shadow-2xl py-1 z-30 max-h-56 overflow-y-auto no-scrollbar backdrop-blur-xl">
                  {AI_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.name);
                        setIsModelDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:text-cyan-300 hover:bg-cyan-500/10 flex flex-col gap-0.5 cursor-pointer border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold">{model.name}</span>
                        {selectedModel === model.name && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <span className="text-[10px] text-neutral-500 line-clamp-1">{model.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Texture Switch */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1 text-[11px] text-neutral-300 font-medium">
                <span>Tạo Texture màu sắc</span>
                <Info className="w-3 h-3 text-neutral-500" />
              </div>
              <button
                type="button"
                onClick={() => setShouldTexture(!shouldTexture)}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${shouldTexture ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' : 'bg-neutral-800'
                  }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-black transition-transform ${shouldTexture ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                />
              </button>
            </div>

            {/* Model Face Count */}
            <div className="flex flex-col gap-1.5 pt-0.5">
              <span className="text-[11px] text-neutral-300 font-medium">Độ phân giải lưới (Face Count)</span>
              <div className="bg-black/40 border border-white/10 rounded-xl p-1 flex items-center justify-between text-xs">
                {FACE_COUNTS.map((count, idx) => (
                  <div key={count} className="flex items-center flex-1 justify-center">
                    <button
                      type="button"
                      onClick={() => setFaceCount(count)}
                      className={`w-full py-1 text-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${faceCount === count
                          ? 'border border-cyan-400/70 text-cyan-300 bg-cyan-500/15 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                      {count}
                    </button>
                    {idx < 3 && <span className="text-neutral-800 select-none px-0.5">|</span>}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-neutral-500">
              Hệ thống tối ưu lưới đa giác chuẩn in 3D SLA/FDM. Bật texture nếu bạn cần xuất file màu cho game/VR.
            </p>

            {generationError && (
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-rose-200">
                {generationError}
              </p>
            )}

            {/* Generate Now Button (Cyan-Emerald Glow) */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full mt-1.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-[#041014] bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(6,182,212,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-[#041014]" />
              <span>{isGenerating ? `Đang tạo (${generationProgress}%)...` : 'Tạo model từ ảnh'}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsLeftPanelOpen(true)}
            className="pointer-events-auto p-2.5 rounded-xl bg-[#0c1017]/90 border border-white/12 text-zinc-300 hover:text-cyan-400 shadow-xl backdrop-blur-xl cursor-pointer self-start"
            title="Mở bảng tạo hình 3D"
          >
            <PanelLeft className="w-5 h-5 text-cyan-400" />
          </button>
        )}

        {/* Card 2: Kích thước & Scale (Nằm ngay dưới phần Tạo hình mô hình 3D) */}
        <div className="pointer-events-auto w-full">
          {!isDimensionsPanelOpen ? (
            <button
              type="button"
              onClick={() => setIsDimensionsPanelOpen(true)}
              className="w-full bg-[#0b0f17]/90 backdrop-blur-2xl border border-white/12 hover:border-cyan-400/40 rounded-xl px-3.5 py-2.5 shadow-2xl flex items-center justify-between text-xs text-white transition-all hover:scale-[1.01] cursor-pointer group"
              title="Mở bảng kích thước & Scale 3D"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                  <Box className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left font-mono">
                  <span className="text-[10px] text-zinc-400 font-sans">Kích thước & Scale</span>
                  <span className="text-xs font-semibold text-cyan-300">
                    {dimensions.x} × {dimensions.z} × {dimensions.y} <span className="text-[10px] text-zinc-400">mm</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 font-mono">
                  {scalePercent}%
                </span>
                <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </button>
          ) : (
            <div className="w-full bg-[#0c111c]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3.5 shadow-2xl text-white flex flex-col gap-3 shadow-black/85">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                    <Box className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Kích thước & Scale
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Toggle Bounding Box Helper */}
                  <button
                    type="button"
                    onClick={() => setShowBoundingBox((prev) => !prev)}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-medium transition-all cursor-pointer ${showBoundingBox
                        ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    title={showBoundingBox ? 'Ẩn khung đo 3D (Phím B)' : 'Hiện khung đo 3D (Phím B)'}
                  >
                    Khung 3D
                  </button>

                  {/* Collapse Panel Button */}
                  <button
                    type="button"
                    onClick={() => setIsDimensionsPanelOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Thu gọn bảng"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3 Axes Editable Inputs with Aspect Ratio Lock */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  {/* X - Width */}
                  <div className="flex items-center justify-between bg-black/45 border border-white/10 rounded-lg px-2.5 py-1 focus-within:border-[#f43f5e] transition-colors">
                    <span className="text-[10px] font-bold text-[#f43f5e] font-mono">X (Rộng)</span>
                    <div className="flex items-center gap-1 font-mono">
                      <button
                        type="button"
                        onClick={() => stepDimension('x', -5)}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                        title="Giảm 5mm"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dimInputs.x}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleInputChange('x', e.target.value)}
                        onBlur={() => commitDimension('x')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-14 bg-transparent text-right text-xs font-semibold text-white outline-none selection:bg-[#f43f5e]/40"
                        placeholder="mm"
                      />
                      <button
                        type="button"
                        onClick={() => stepDimension('x', 5)}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                        title="Tăng 5mm"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-zinc-500 font-sans">mm</span>
                    </div>
                  </div>

                  {/* Z - Depth */}
                  <div className="flex items-center justify-between bg-black/45 border border-white/10 rounded-lg px-2.5 py-1 focus-within:border-[#06b6d4] transition-colors">
                    <span className="text-[10px] font-bold text-[#06b6d4] font-mono">Z (Sâu)</span>
                    <div className="flex items-center gap-1 font-mono">
                      <button
                        type="button"
                        onClick={() => stepDimension('z', -5)}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                        title="Giảm 5mm"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dimInputs.z}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleInputChange('z', e.target.value)}
                        onBlur={() => commitDimension('z')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-14 bg-transparent text-right text-xs font-semibold text-white outline-none selection:bg-[#06b6d4]/40"
                        placeholder="mm"
                      />
                      <button
                        type="button"
                        onClick={() => stepDimension('z', 5)}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                        title="Tăng 5mm"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-zinc-500 font-sans">mm</span>
                    </div>
                  </div>

                  {/* Y - Height */}
                  <div className="flex items-center justify-between bg-black/45 border border-white/10 rounded-lg px-2.5 py-1 focus-within:border-[#10b981] transition-colors">
                    <span className="text-[10px] font-bold text-[#10b981] font-mono">Y (Cao)</span>
                    <div className="flex items-center gap-1 font-mono">
                      <button
                        type="button"
                        onClick={() => stepDimension('y', -5)}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                        title="Giảm 5mm"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dimInputs.y}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleInputChange('y', e.target.value)}
                        onBlur={() => commitDimension('y')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-14 bg-transparent text-right text-xs font-semibold text-white outline-none selection:bg-[#10b981]/40"
                        placeholder="mm"
                      />
                      <button
                        type="button"
                        onClick={() => stepDimension('y', 5)}
                        className="w-4 h-4 rounded bg-white/5 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                        title="Tăng 5mm"
                      >
                        +
                      </button>
                      <span className="text-[10px] text-zinc-500 font-sans">mm</span>
                    </div>
                  </div>
                </div>

                {/* Uniform Aspect Ratio Lock Button */}
                <button
                  type="button"
                  onClick={() => setIsUniformScale((prev) => !prev)}
                  className={`self-stretch px-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${isUniformScale
                      ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  title={isUniformScale ? 'Đang khoá tỉ lệ đồng dạng (Nhấp để mở khoá)' : 'Đang scale tự do từng trục (Nhấp để khoá tỉ lệ)'}
                >
                  {isUniformScale ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span className="text-[8.5px] font-mono uppercase tracking-tighter">
                    {isUniformScale ? 'Khoá' : 'Tự do'}
                  </span>
                </button>
              </div>

              {/* Scale % Presets & Quick Buttons */}
              <div className="flex flex-col gap-1.5 bg-black/30 p-2 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-cyan-400" /> Tỉ lệ Scale
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{scalePercent}%</span>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  {[50, 100, 150, 200].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleScalePercentChange(p)}
                      className={`py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${scalePercent === p
                          ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 font-bold'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Print Metrics & Build Bed Check */}
              <div className="flex flex-col gap-1.5 bg-white/[0.03] p-2 rounded-xl border border-white/5 text-[10.5px]">
                <div className="flex items-center justify-between text-zinc-300 font-mono">
                  <span className="text-zinc-500 font-sans">Thể tích & Khối lượng:</span>
                  <span className="text-zinc-200">
                    ~<strong className="text-cyan-300">{volumeCm3}</strong> cm³ · ~<strong className="text-emerald-300">{estimatedGrams}g</strong> PLA
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-zinc-500 font-sans">Khổ in tiêu chuẩn:</span>
                  {isWithinStandardPrintBed ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Chuẩn (≤ 220mm)
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> Cần thu nhỏ
                    </span>
                  )}
                </div>
              </div>

              {/* Reset Original Size Button */}
              <button
                type="button"
                onClick={resetDimensions}
                className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-cyan-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại kích thước gốc</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Floating / Docked Panel: Assets & Inspector */}
      {isRightPanelOpen ? (
        <div className="absolute top-0 right-0 bottom-0 w-[290px] max-w-[85vw] bg-[#0a0d13]/92 border-l border-white/10 flex flex-col z-20 backdrop-blur-2xl shadow-2xl transition-all duration-300 text-white">
          {/* Top Header Tabs & Close Button */}
          <div className="p-3 pb-2 flex items-center justify-between gap-1.5 border-b border-white/8">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRightTab('Assets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${rightTab === 'Assets'
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                <span>Tài sản</span>
                {assets.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                    {assets.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightTab('Layer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${rightTab === 'Layer'
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                Layer
              </button>
              <button
                onClick={() => setRightTab('Property')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${rightTab === 'Property'
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                Thuộc tính
              </button>
            </div>

            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Thu gọn bảng phải"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Viewport Utility Bar */}
          <div className="border-b border-white/8 px-3 py-2 flex items-center justify-between text-neutral-400 text-xs">
            <button
              onClick={() => setGroundGridEnabled((prev) => !prev)}
              className={`p-1 rounded hover:text-cyan-300 transition-colors ${groundGridEnabled ? 'text-cyan-400' : ''}`}
              title={groundGridEnabled ? 'Ẩn lưới sàn 3D' : 'Hiện lưới sàn 3D'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('studio-camera-view', { detail: 'iso' }))}
              className="p-1 rounded hover:text-cyan-300 transition-colors cursor-pointer"
              title="Đặt lại góc nhìn camera Isometric"
            >
              <Box className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('studio-camera-view', { detail: 'top' }))}
              className="p-1 rounded hover:text-cyan-300 transition-colors cursor-pointer"
              title="Góc nhìn từ trên xuống (Top View)"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('studio-camera-view', { detail: 'bottom' }))}
              className="p-1 rounded hover:text-cyan-300 transition-colors cursor-pointer"
              title="Góc nhìn từ dưới lên (Bottom View - Trục Z đáy)"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  void document.documentElement.requestFullscreen().catch(() => { });
                } else {
                  void document.exitFullscreen().catch(() => { });
                }
              }}
              className="p-1 rounded hover:text-cyan-300 transition-colors cursor-pointer"
              title="Bật/Tắt Toàn màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
            <span className="text-[10px] text-cyan-400 font-mono px-1">
              3D Orbit
            </span>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col text-left no-scrollbar">
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto gap-2.5 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 shadow-inner">
                  <Box className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="text-xs text-white/90 font-medium">
                  Chưa có mô hình nào
                </p>
                <p className="text-[11px] text-neutral-500 max-w-[210px] leading-relaxed">
                  Tải ảnh hoặc chọn mẫu nhanh ở bảng bên trái và nhấn &quot;Tạo model từ ảnh&quot;.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2.5">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setActiveModelMesh(asset)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${activeModelMesh?.id === asset.id
                        ? 'bg-cyan-950/25 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-white/[0.03] border-white/8 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate">{asset.name}</span>
                      <span className={`text-[10px] font-medium ${asset.status === 'succeeded'
                          ? 'text-emerald-300'
                          : asset.status === 'failed'
                            ? 'text-rose-300'
                            : 'text-cyan-300'
                        }`}>
                        {statusLabel(asset.status)}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      {asset.status === 'succeeded' ? 'Hoàn tất' : `${asset.stage} · ${asset.progress}%`} · {asset.date}
                    </span>
                    {asset.errorMessage && (
                      <span className="text-[10px] text-rose-300 block mt-1 leading-relaxed">{asset.errorMessage}</span>
                    )}
                    {(asset.glbUrl || asset.stlUrl) && (
                      <div className="mt-2.5 flex gap-2">
                        {asset.glbUrl && (
                          <button
                            type="button"
                            onClick={(event) => void handleDownload(event, asset, 'glb')}
                            disabled={downloadingFile === `${asset.id}-glb`}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            {downloadingFile === `${asset.id}-glb` ? 'Đang tải...' : 'Tải GLB'}
                          </button>
                        )}
                        {asset.stlUrl && (
                          <button
                            type="button"
                            onClick={(event) => void handleDownload(event, asset, 'stl')}
                            disabled={downloadingFile === `${asset.id}-stl`}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                          >
                            <Download className="h-3 w-3" />
                            {downloadingFile === `${asset.id}-stl` ? 'Đang tải...' : 'Tải STL in 3D'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsRightPanelOpen(true)}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-[#0c1017]/90 border border-white/12 text-zinc-300 hover:text-cyan-400 shadow-xl backdrop-blur-xl cursor-pointer"
          title="Mở bảng Tài sản & Lớp"
        >
          <PanelRight className="w-5 h-5 text-cyan-400" />
        </button>
      )}
    </div>
  );
}
