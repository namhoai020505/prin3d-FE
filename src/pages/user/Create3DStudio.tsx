import { useState, useRef, useEffect, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Info,
  ChevronDown,
  Check,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  LayoutGrid,
  Layers,
  Box,
  Maximize2,
  Eye,
  Link2,
  Activity,
  User,
  Upload,
  X,
  Download,
} from 'lucide-react';
import { createImageGeneration, downloadGenerationFile, getGeneration, listGenerations, type GenerationStatus, type GenerationTask } from '../../services/generationService';
import { AUTH_SESSION_EVENT, getAccessToken, isAccessTokenExpired } from '../../lib/auth';
import { AI_MODELS, FACE_COUNTS, type FaceCount } from '../../constants/models';

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
  const [cameraAngle, setCameraAngle] = useState({ pitch: 24, yaw: -35 });
  const [isOrbiting, setIsOrbiting] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, pitch: 24, yaw: -35 });

  // Image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    locationState?.presetUrl || null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(
    locationState?.selectedFile || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Canvas 3D Grid & Gizmo Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Deep dark background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      // Dynamically compute the visible 3D workspace center based on open/closed panels
      const leftOffset = isLeftPanelOpen ? 346 : 24;
      const rightOffset = isRightPanelOpen ? 280 : 0;
      const visibleWorkspaceWidth = Math.max(200, width - leftOffset - rightOffset);
      const centerX = leftOffset + visibleWorkspaceWidth / 2;
      const centerY = height * 0.52;

      // Warm radial aura centered in visible workspace
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY - 40,
        width * 0.05,
        centerX,
        centerY,
        width * 0.6
      );
      bgGrad.addColorStop(0, '#15120a');
      bgGrad.addColorStop(1, '#07070a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (groundGridEnabled) {
        ctx.save();

        const pitchRad = (cameraAngle.pitch * Math.PI) / 180;
        const yawRad = (cameraAngle.yaw * Math.PI) / 180;

        // Draw 3D Ground Grid lines
        const gridSize = 24;
        const spacing = 38;
        const cosYaw = Math.cos(yawRad);
        const sinYaw = Math.sin(yawRad);
        const sinPitch = Math.sin(pitchRad);

        // Project a 3D ground point (X, 0, Z) to 2D screen
        const project = (gx: number, gz: number) => {
          const rx = gx * cosYaw - gz * sinYaw;
          const rz = gx * sinYaw + gz * cosYaw;

          const depth = 900 + rz * sinPitch;
          if (depth <= 100) return null;
          const scale = 700 / depth;

          const screenX = centerX + rx * scale;
          const screenY = centerY + rz * Math.cos(pitchRad) * scale * 0.65;
          return { x: screenX, y: screenY, depth };
        };

        // Draw grid lines
        for (let i = -gridSize; i <= gridSize; i++) {
          const coord = i * spacing;
          const isCenter = i === 0;

          // Lines along Z
          const p1 = project(coord, -gridSize * spacing);
          const p2 = project(coord, gridSize * spacing);

          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            if (isCenter) {
              ctx.strokeStyle = 'rgba(255, 209, 102, 0.85)';
              ctx.lineWidth = 1.5;
            } else if (i % 5 === 0) {
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
              ctx.lineWidth = 1;
            } else {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
              ctx.lineWidth = 0.8;
            }
            ctx.stroke();
          }

          // Lines along X
          const p3 = project(-gridSize * spacing, coord);
          const p4 = project(gridSize * spacing, coord);

          if (p3 && p4) {
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            if (isCenter) {
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
              ctx.lineWidth = 1.5;
            } else if (i % 5 === 0) {
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
              ctx.lineWidth = 1;
            } else {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
              ctx.lineWidth = 0.8;
            }
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // If active generated model exists, render a holographic 3D wireframe mesh in gold
      if (activeModelMesh) {
        ctx.save();
        const time = Date.now() * 0.001;
        const cx = centerX;
        const cy = centerY - 35;

        // Rotating 3D crystal / mesh wireframe
        const r = 85;
        const vertices = [
          { x: 0, y: -r * 1.3, z: 0 },
          { x: r, y: 0, z: r },
          { x: -r, y: 0, z: r },
          { x: -r, y: 0, z: -r },
          { x: r, y: 0, z: -r },
          { x: 0, y: r * 1.3, z: 0 },
        ];

        const rotY = time * 0.8;
        const projVerts = vertices.map((v) => {
          const rx = v.x * Math.cos(rotY) - v.z * Math.sin(rotY);
          const rz = v.x * Math.sin(rotY) + v.z * Math.cos(rotY);
          const pScale = 400 / (400 + rz);
          return {
            x: cx + rx * pScale,
            y: cy + (v.y + Math.sin(time * 2) * 8) * pScale,
          };
        });

        const edges = [
          [0, 1], [0, 2], [0, 3], [0, 4],
          [5, 1], [5, 2], [5, 3], [5, 4],
          [1, 2], [2, 3], [3, 4], [4, 1],
        ];

        // Draw glowing gold edges
        ctx.strokeStyle = '#FFD166';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;

        edges.forEach(([i, j]) => {
          ctx.beginPath();
          ctx.moveTo(projVerts[i].x, projVerts[i].y);
          ctx.lineTo(projVerts[j].x, projVerts[j].y);
          ctx.stroke();
        });

        // Glowing center gold core
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
        coreGrad.addColorStop(0, 'rgba(255, 209, 102, 0.45)');
        coreGrad.addColorStop(1, 'rgba(255, 209, 102, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [groundGridEnabled, cameraAngle, activeModelMesh, isLeftPanelOpen, isRightPanelOpen]);

  // Mouse orbit interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
    setIsOrbiting(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pitch: cameraAngle.pitch,
      yaw: cameraAngle.yaw,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isOrbiting) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setCameraAngle({
      yaw: dragStartRef.current.yaw + deltaX * 0.4,
      pitch: Math.max(5, Math.min(85, dragStartRef.current.pitch + deltaY * 0.3)),
    });
  };

  const handleMouseUp = () => {
    setIsOrbiting(false);
  };

  // Orientation Gizmo angle
  const gizmoYawRad = (cameraAngle.yaw * Math.PI) / 180;
  const gizmoPitchRad = (cameraAngle.pitch * Math.PI) / 180;

  const gizmoX = {
    x: 22 * Math.cos(gizmoYawRad),
    y: 22 * Math.sin(gizmoYawRad) * Math.sin(gizmoPitchRad),
  };
  const gizmoZ = {
    x: 22 * -Math.sin(gizmoYawRad),
    y: 22 * Math.cos(gizmoYawRad) * Math.sin(gizmoPitchRad),
  };
  const gizmoY = {
    x: 0,
    y: -22 * Math.cos(gizmoPitchRad),
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none bg-[#0a0a0f] flex"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 3D Viewport Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* Top Floating Controls: Ground Grid Toggle & 3D Gizmo */}
      <div
        className={`absolute top-4 z-20 flex items-center gap-3 transition-all duration-300 ${
          isRightPanelOpen ? 'right-4 sm:right-[296px]' : 'right-14'
        }`}
      >
        {/* Ground Grid Switch */}
        <div className="flex items-center gap-2 bg-[#14120c]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/20 shadow-lg">
          <span className="text-[11px] font-medium text-amber-200">Lưới sàn 3D</span>
          <button
            type="button"
            onClick={() => setGroundGridEnabled((prev) => !prev)}
            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              groundGridEnabled ? 'bg-[#FFD166]' : 'bg-neutral-700'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-black transition-transform ${
                groundGridEnabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* 3D Axis Orientation Gizmo */}
        <div
          className="relative w-10 h-10 rounded-full bg-[#14120c]/85 backdrop-blur-md border border-amber-500/20 shadow-lg flex items-center justify-center cursor-pointer hover:border-[#FFD166] transition-colors"
          onClick={() => setCameraAngle({ pitch: 24, yaw: -35 })}
          title="Đặt lại góc nhìn camera"
        >
          <svg className="w-8 h-8" viewBox="-30 -30 60 60">
            <circle cx="0" cy="0" r="2.5" fill="#f59e0b" />
            <line x1="0" y1="0" x2={gizmoX.x} y2={gizmoX.y} stroke="#FFD166" strokeWidth="2" />
            <circle cx={gizmoX.x} cy={gizmoX.y} r="3" fill="#FFD166" />
            <line x1="0" y1="0" x2={gizmoY.x} y2={gizmoY.y} stroke="#10b981" strokeWidth="2" />
            <circle cx={gizmoY.x} cy={gizmoY.y} r="3" fill="#10b981" />
            <line x1="0" y1="0" x2={gizmoZ.x} y2={gizmoZ.y} stroke="#38bdf8" strokeWidth="2" />
            <circle cx={gizmoZ.x} cy={gizmoZ.y} r="3" fill="#38bdf8" />
          </svg>
        </div>
      </div>

      {/* Left Floating Panel: Geometry Generation */}
      {isLeftPanelOpen ? (
        <div
          ref={leftPanelRef}
          className="absolute top-4 left-4 z-20 w-[330px] max-w-[calc(100vw-5rem)] max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar bg-[#14120d]/90 backdrop-blur-md border border-amber-500/20 rounded-2xl p-4 shadow-2xl shadow-black/80 text-white flex flex-col gap-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-white tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD166]" />
              <span>Tạo hình mô hình 3D</span>
            </h2>
            <button
              onClick={() => setIsLeftPanelOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Thu gọn bảng"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-[#0b0a07] p-1 rounded-xl flex gap-1 border border-amber-500/15">
            <button
              type="button"
              disabled
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center cursor-not-allowed opacity-55 ${
                generationMode === 'text'
                  ? 'bg-[#221c10] text-[#FFD166] shadow-sm border border-amber-500/35'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Text-to-3D (sớm)
            </button>
            <button
              onClick={() => setGenerationMode('image')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                generationMode === 'image'
                  ? 'bg-[#221c10] text-[#FFD166] shadow-sm border border-amber-500/35'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Image-to-3D
            </button>
          </div>

          {/* Content Area */}
          {generationMode === 'text' ? (
            <div className="bg-[#18150f] border border-amber-500/20 rounded-xl p-3 flex flex-col justify-between min-h-[145px] focus-within:border-[#FFD166]/60 transition-colors">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value.slice(0, 500))}
                placeholder="Nhập mô tả chi tiết mô hình 3D bạn muốn tạo. Ví dụ: Tượng mèo may mắn mạ vàng phong cách stylized..."
                className="w-full h-24 bg-transparent resize-none outline-none text-xs text-white placeholder:text-neutral-500 leading-relaxed"
              />
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-amber-300 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  <span>Hướng dẫn</span>
                </button>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {promptText.length}/500
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#18150f] border border-amber-500/20 rounded-xl p-3 flex flex-col items-center justify-center min-h-[145px]">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {uploadedImage ? (
                <div className="relative w-full h-28 rounded-lg overflow-hidden group">
                  <img src={uploadedImage} alt="Input" className="w-full h-full object-contain bg-black/40" />
                  <button
                    onClick={() => {
                      if (uploadedImage.startsWith('blob:')) {
                        URL.revokeObjectURL(uploadedImage);
                      }
                      setUploadedImage(null);
                      setUploadedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/80 rounded-full hover:bg-red-600 text-white cursor-pointer transition-colors"
                    title="Xóa ảnh"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-[#FFD166] cursor-pointer p-4 text-center transition-colors"
                >
                  <Upload className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-xs font-medium">Tải ảnh đầu vào (Image-to-3D)</span>
                  <span className="text-[10px] text-neutral-500">Hỗ trợ PNG, JPEG, WEBP tối đa 15MB</span>
                </div>
              )}
            </div>
          )}

          {/* Model Selection Dropdown */}
          <div className="relative flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[11px] text-neutral-300 font-medium">
              <span>Mô hình AI</span>
              <Info className="w-3 h-3 text-neutral-400" />
            </div>
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="w-full px-3 py-2 bg-[#18150f] border border-amber-500/20 rounded-xl text-xs text-white flex items-center justify-between hover:border-[#FFD166]/50 transition-colors cursor-pointer"
            >
              <span className="font-medium truncate">{selectedModel}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#16130e] border border-amber-500/30 rounded-xl shadow-2xl py-1 z-30 max-h-56 overflow-y-auto no-scrollbar">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.name);
                      setIsModelDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:text-[#FFD166] hover:bg-amber-500/10 flex flex-col gap-0.5 cursor-pointer border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold">{model.name}</span>
                      {selectedModel === model.name && <Check className="w-3.5 h-3.5 text-[#FFD166]" />}
                    </div>
                    <span className="text-[10px] text-neutral-500 line-clamp-1">{model.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Texture Switch */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-[11px] text-neutral-300 font-medium">
              <span>Tạo Texture màu sắc</span>
              <Info className="w-3 h-3 text-neutral-400" />
            </div>
            <button
              type="button"
              onClick={() => setShouldTexture(!shouldTexture)}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                shouldTexture ? 'bg-[#FFD166]' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-black transition-transform ${
                  shouldTexture ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Model Face Count */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] text-neutral-300 font-medium">Độ phân giải lưới (Face Count)</span>
            <div className="bg-[#18150f] border border-amber-500/20 rounded-xl p-1 flex items-center justify-between text-xs">
              {FACE_COUNTS.map((count, idx) => (
                <div key={count} className="flex items-center flex-1 justify-center">
                  <button
                    type="button"
                    onClick={() => setFaceCount(count)}
                    className={`w-full py-1 text-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      faceCount === count
                        ? 'border border-[#FFD166] text-[#FFD166] bg-amber-500/15 shadow-[0_0_10px_rgba(255,209,102,0.3)]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                  {idx < 3 && <span className="text-neutral-700 select-none px-1">|</span>}
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-neutral-500">
            Hệ thống hỗ trợ tạo mô hình 3D từ ảnh. Bật texture nếu bạn muốn AI tạo bề mặt màu sắc cùng hình khối.
          </p>

          {generationError && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-rose-200">
              {generationError}
            </p>
          )}

          {/* Generate Now Button (G2C Gold Theme) */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full mt-2 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-black bg-gradient-to-r from-[#FFD166] via-[#f59e0b] to-[#d97706] hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,209,102,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>{isGenerating ? `Đang tạo (${generationProgress}%)...` : 'Tạo model từ ảnh'}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsLeftPanelOpen(true)}
          className="absolute top-4 left-4 z-20 p-2.5 rounded-xl bg-[#14120d]/90 border border-amber-500/20 text-neutral-300 hover:text-[#FFD166] shadow-xl backdrop-blur-md cursor-pointer"
          title="Mở bảng tạo hình 3D"
        >
          <PanelLeft className="w-5 h-5 text-[#FFD166]" />
        </button>
      )}

      {/* Right Floating / Docked Panel: Assets & Inspector */}
      {isRightPanelOpen ? (
        <div className="absolute top-0 right-0 bottom-0 w-[280px] max-w-[80vw] bg-[#110f0b]/95 border-l border-amber-500/20 flex flex-col z-20 backdrop-blur-md shadow-2xl transition-all duration-300">
          {/* Top Header Tabs & Close Button */}
          <div className="p-3 pb-2 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRightTab('Assets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  rightTab === 'Assets'
                    ? 'bg-gradient-to-r from-[#FFD166] to-[#f59e0b] text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tài sản
              </button>
              <button
                onClick={() => setRightTab('Layer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  rightTab === 'Layer'
                    ? 'bg-gradient-to-r from-[#FFD166] to-[#f59e0b] text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Layer
              </button>
              <button
                onClick={() => setRightTab('Property')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  rightTab === 'Property'
                    ? 'bg-gradient-to-r from-[#FFD166] to-[#f59e0b] text-black shadow-md'
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

          {/* Secondary Tool Icons Bar */}
          <div className="border-t border-b border-amber-500/15 px-3 py-2 flex items-center justify-between text-neutral-400">
            <button className="hover:text-[#FFD166] transition-colors" title="Chế độ lưới">
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-[#FFD166] transition-colors" title="Các lớp">
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-[#FFD166] transition-colors" title="Khung bao 3D">
              <Box className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-[#FFD166] transition-colors" title="Phóng to">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-[#FFD166] transition-colors" title="Ẩn/Hiện">
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-[#FFD166] transition-colors" title="Liên kết">
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-[#FFD166] transition-colors" title="Xương chuyển động">
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button className="hover:text-[#FFD166] transition-colors" title="Tư thế">
              <User className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tab Body - List starts from top without awkward vertical centering */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col text-left">
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto gap-2 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/[0.04] border border-amber-500/20 flex items-center justify-center text-amber-500/50 shadow-inner">
                  <Box className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="text-xs text-neutral-400 font-medium">
                  Chưa có mô hình nào
                </p>
                <p className="text-[11px] text-neutral-500 max-w-[200px]">
                  Tải ảnh lên bảng bên trái và nhấn &quot;Tạo model từ ảnh&quot; để bắt đầu.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2.5">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setActiveModelMesh(asset)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      activeModelMesh?.id === asset.id
                        ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_15px_rgba(255,209,102,0.25)]'
                        : 'bg-white/[0.03] border-white/10 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate">{asset.name}</span>
                      <span className={`text-[10px] font-medium ${asset.status === 'succeeded' ? 'text-emerald-300' : asset.status === 'failed' ? 'text-rose-300' : 'text-[#FFD166]'}`}>
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
                      <div className="mt-2 flex gap-2">
                        {asset.glbUrl && (
                          <button
                            type="button"
                            onClick={(event) => void handleDownload(event, asset, 'glb')}
                            disabled={downloadingFile === `${asset.id}-glb`}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
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
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            <Download className="h-3 w-3" />
                            {downloadingFile === `${asset.id}-stl` ? 'Đang tải...' : 'Tải STL'}
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
          className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-[#14120d]/90 border border-amber-500/20 text-neutral-300 hover:text-[#FFD166] shadow-xl backdrop-blur-md cursor-pointer"
          title="Mở bảng Tài sản & Lớp"
        >
          <PanelRight className="w-5 h-5 text-[#FFD166]" />
        </button>
      )}
    </div>
  );
}
