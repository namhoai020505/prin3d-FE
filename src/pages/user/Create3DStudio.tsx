import { useState, useRef, useEffect, useCallback, useMemo, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
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
  AlertTriangle,
  RotateCcw,
  Scissors,
  Zap,
} from 'lucide-react';
import {
  createImageGeneration,
  downloadGenerationFile,
  getGeneration,
  getGenerationModelBlobUrl,
  listGenerations,
  parseGenerationError,
  type GenerationStatus,
  type GenerationTask,
} from '../../services/generationService';
import { AUTH_SESSION_EVENT, getAccessToken, isAccessTokenExpired } from '../../lib/auth';
import { getMe } from '../../services/authService';
import { AI_MODELS, FACE_COUNTS, type FaceCount } from '../../constants/models';
import Studio3DViewport, { type ModelMetrics } from './components/Studio3DViewport';
import PrintOrderModal from './components/PrintOrderModal';
import CreditTopUpModal from './components/CreditTopUpModal';

interface GeneratedAsset {
  id: string;
  versionId?: string | null;
  name: string;
  date: string;
  status: GenerationStatus;
  stage: string;
  progress: number;
  errorMessage?: string | null;
  glbUrl?: string | null;
  stlUrl?: string | null;
  fileType?: 'glb' | 'gltf' | 'fbx' | 'obj';
  localFiles?: File[] | null;
  customFaces?: string;
  isApprovedForPrinting?: boolean;
  reviewStatus?: string;
}

const toAsset = (task: GenerationTask): GeneratedAsset => ({
  id: task.id,
  versionId: task.versionId ?? null,
  name: task.modelName?.trim() || '3D model',
  date: new Date(task.createdAtUtc).toLocaleString('vi-VN'),
  status: task.status,
  stage: task.stage,
  progress: task.progress,
  errorMessage: task.errorMessage,
  glbUrl: task.glbUrl,
  stlUrl: task.stlUrl,
  fileType: 'glb',
  isApprovedForPrinting: task.isApprovedForPrinting || task.latestPrintReview?.decision === 'Approved',
  reviewStatus: task.reviewStatus || task.latestPrintReview?.decision,
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

  // Mode selection: 'image' | 'text' | 'file'
  const [generationMode, setGenerationMode] = useState<'image' | 'text' | 'file'>('image');
  const [promptText, setPromptText] = useState('');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Local 3D File loading & metrics states
  const [local3DFiles, setLocal3DFiles] = useState<File[] | null>(null);
  const [activeFileType, setActiveFileType] = useState<'glb' | 'gltf' | 'fbx' | 'obj'>('glb');
  const [modelRealMetrics, setModelRealMetrics] = useState<ModelMetrics | null>(null);
  const [isDragging3D, setIsDragging3D] = useState(false);
  const file3DInputRef = useRef<HTMLInputElement>(null);

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

  // Ground Grid & Viewport settings (Default hidden for clean PBR model presentation)
  const [groundGridEnabled, setGroundGridEnabled] = useState(false);

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

  // 3D Model Dimensions, Scale & Bounding Box Inspector States (Default clean presentation)
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [isDimensionsPanelOpen, setIsDimensionsPanelOpen] = useState(false);
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

  // 3D Print Order & PayOS VietQR Modal States
  const [isPrintOrderModalOpen, setIsPrintOrderModalOpen] = useState(false);
  const [orderTargetAsset, setOrderTargetAsset] = useState<GeneratedAsset | null>(null);

  // Credit Quota & Top-Up States
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  const fetchUserCredit = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token || isAccessTokenExpired(token)) {
        setCreditBalance(null);
        return;
      }
      const me = await getMe();
      if (me) {
        const total = (me.freeTrialRemaining ?? 0) + (me.purchasedRemaining ?? 0);
        setCreditBalance(total);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchUserCredit();
  }, [fetchUserCredit]);

  useEffect(() => {
    const handleAuthChanged = () => {
      void fetchUserCredit();
    };
    window.addEventListener(AUTH_SESSION_EVENT, handleAuthChanged);
    return () => window.removeEventListener(AUTH_SESSION_EVENT, handleAuthChanged);
  }, [fetchUserCredit]);

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

  const scaleRatio = scalePercent / 100;

  const boxVolumeCm3 = useMemo(() => {
    return Math.max(1, Math.round((dimensions.x * dimensions.y * dimensions.z) / 1000));
  }, [dimensions]);

  const volumeCm3 = useMemo(() => {
    const currentBoxVol = Math.max(1, (dimensions.x * dimensions.y * dimensions.z) / 1000);
    if (modelRealMetrics?.volumeCm3) {
      const scaled = modelRealMetrics.volumeCm3 * Math.pow(scaleRatio, 3);
      // Realistic volume boundary: 15% - 45% of bounding box (~250 - 450 cm³ for 116x120x113mm)
      if (scaled > currentBoxVol * 0.55 || scaled < currentBoxVol * 0.1) {
        return Math.max(1, Math.round(currentBoxVol * 0.28));
      }
      return Math.max(1, Math.round(scaled));
    }
    return Math.max(1, Math.round(boxVolumeCm3 * 0.28));
  }, [modelRealMetrics, scaleRatio, dimensions, boxVolumeCm3]);

  // Material Selection State for Quick Picker & Pricing
  const [selectedMaterial, setSelectedMaterial] = useState<'PLA' | 'Resin SLA' | 'ABS'>('PLA');

  // Surface area estimation (cm²)
  const surfaceAreaCm2 = useMemo(() => {
    if (modelRealMetrics?.surfaceAreaCm2) {
      return Math.max(1, Math.round(modelRealMetrics.surfaceAreaCm2 * Math.pow(scaleRatio, 2)));
    }
    return Math.max(1, Math.round(2 * ((dimensions.x * dimensions.y) + (dimensions.y * dimensions.z) + (dimensions.x * dimensions.z)) * 0.75 / 100));
  }, [modelRealMetrics, scaleRatio, dimensions]);

  const displayFaceCount = useMemo(() => {
    if (modelRealMetrics?.faces) {
      const f = modelRealMetrics.faces;
      if (f >= 1000000) return `${(f / 1000000).toFixed(1)}M`;
      if (f >= 1000) return `${Math.round(f / 1000)}k`;
      return `${f}`;
    }
    return faceCount;
  }, [modelRealMetrics, faceCount]);

  const materialConfig = useMemo(() => {
    switch (selectedMaterial) {
      case 'Resin SLA':
        return { name: 'Resin SLA', tag: 'Chi tiết cao', setupFee: 50000, infill: 0.85, density: 1.15, pricePerCm3: 6500, surfaceRate: 300, desc: 'Bề mặt siêu mịn, không lộ vân in.' };
      case 'ABS':
        return { name: 'Nhựa Kỹ Thuật ABS', tag: 'Bền cơ học', setupFee: 40000, infill: 0.40, density: 1.05, pricePerCm3: 3500, surfaceRate: 200, desc: 'Chịu lực va đập và nhiệt tốt.' };
      case 'PLA':
      default:
        return { name: 'PLA Tiêu Chuẩn', tag: 'Phổ biến', setupFee: 35000, infill: 0.25, density: 1.25, pricePerCm3: 2500, surfaceRate: 150, desc: 'Thân thiện, chi tiết sắc nét.' };
    }
  }, [selectedMaterial]);

  const liveTotalPriceVnd = Math.round(
    materialConfig.setupFee +
    (volumeCm3 * materialConfig.infill * materialConfig.pricePerCm3) +
    (surfaceAreaCm2 * materialConfig.surfaceRate)
  );

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
            setNsfwError(null);
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

  // 3D Layer Slicing Simulation States
  const [isSlicingActive, setIsSlicingActive] = useState(false);
  const [slicingProgress, setSlicingProgress] = useState(100);
  const [layerHeightMm, setLayerHeightMm] = useState(0.20);
  const [infillDensity, setInfillDensity] = useState(20);
  const [isSimulatingPrint, setIsSimulatingPrint] = useState(false);

  // 3D Printing Support & Adhesion Stability Defaults (Default hidden in preview)
  const [isSupportActive, setIsSupportActive] = useState(false);
  const [supportType] = useState<'tree' | 'lattice'>('tree');
  const [supportStrength] = useState<'heavy' | 'standard' | 'light'>('heavy');
  const [adhesionType] = useState<'raft' | 'brim' | 'skirt'>('raft');

  // Time-lapse print simulation loop
  useEffect(() => {
    if (!isSimulatingPrint) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      setSlicingProgress((prev) => {
        const next = prev + (dt / 7000) * 100;
        if (next >= 100) {
          setIsSimulatingPrint(false);
          return 100;
        }
        return next;
      });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulatingPrint]);

  const toggleSimulatingPrint = useCallback(() => {
    if (isSimulatingPrint) {
      setIsSimulatingPrint(false);
    } else {
      if (slicingProgress >= 100) {
        setSlicingProgress(0);
      }
      setIsSlicingActive(true);
      setIsSimulatingPrint(true);
    }
  }, [isSimulatingPrint, slicingProgress]);

  const handleSlicingProgressChange = useCallback((val: number) => {
    setSlicingProgress(Math.max(0, Math.min(100, Math.round(val * 10) / 10)));
  }, []);

  // Slicing telemetry calculations
  const totalLayers = Math.max(1, Math.ceil(dimensions.y / layerHeightMm));
  const currentLayer = Math.min(
    totalLayers,
    Math.max(1, Math.round((slicingProgress / 100) * totalLayers))
  );
  const estPrintMinutes = Math.max(5, Math.round((totalLayers * 0.22) + (volumeCm3 * 1.1) * (infillDensity / 20)));
  const estHours = Math.floor(estPrintMinutes / 60);
  const estMins = estPrintMinutes % 60;
  const printTimeFormatted = estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins} phút`;

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [activeModelMesh, setActiveModelMesh] = useState<GeneratedAsset | null>(null);
  const [activeModelBlobUrl, setActiveModelBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeModelMesh?.id || activeModelMesh.id.startsWith('local-') || activeModelMesh.id.startsWith('sample-') || activeModelMesh.id === 'active-viewport-mesh') {
      setActiveModelBlobUrl(null);
      return;
    }

    if (activeModelMesh.glbUrl) {
      let isMounted = true;
      const abortController = new AbortController();

      void getGenerationModelBlobUrl(activeModelMesh.id, 'glb', abortController.signal)
        .then((blobUrl) => {
          if (isMounted) {
            setActiveModelBlobUrl(blobUrl);
          }
        })
        .catch(() => {
          if (isMounted) {
            setActiveModelBlobUrl(activeModelMesh.glbUrl || null);
          }
        });

      return () => {
        isMounted = false;
        abortController.abort();
      };
    } else {
      setActiveModelBlobUrl(null);
    }
  }, [activeModelMesh?.id, activeModelMesh?.glbUrl]);

    // Unified assets list: only contains genuine loaded or generated 3D models
  const displayAssets = useMemo(() => {
    const list = [...assets];
    if (activeModelMesh && !list.some((a) => a.id === activeModelMesh.id)) {
      list.unshift(activeModelMesh);
    }
    return list;
  }, [assets, activeModelMesh]);
  const [generationError, setGenerationError] = useState('');
  const [nsfwError, setNsfwError] = useState<string | null>(null);
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
      setNsfwError(null);
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
        void fetchUserCredit();
        if (task.status !== 'succeeded') {
          setGenerationError(task.errorMessage || 'Không thể tạo mô hình. Vui lòng thử lại.');
        }
        return;
      }

      const timer = window.setTimeout(() => void pollGeneration(id), 3_000);
      pollTimers.current.push(timer);
    } catch {
      setIsGenerating(false);
      setGenerationError('Không thể cập nhật trạng thái tạo mô hình.');
    }
  };

  const handleModelMetricsCalculated = useCallback(
    (metrics: ModelMetrics) => {
      setModelRealMetrics(metrics);
      if (metrics.dimensions) {
        onBaseDimensionsCalculated(metrics.dimensions);
      }
    },
    [onBaseDimensionsCalculated]
  );

  const handleLoad3DFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const primaryFile =
      fileArray.find((f) => f.name.toLowerCase().endsWith('.glb')) ||
      fileArray.find((f) => f.name.toLowerCase().endsWith('.gltf')) ||
      fileArray.find((f) => f.name.toLowerCase().endsWith('.fbx')) ||
      fileArray.find((f) => f.name.toLowerCase().endsWith('.obj'));

    if (!primaryFile) {
      setGenerationError('Vui lòng chọn ít nhất 1 file định dạng .glb, .gltf, .fbx hoặc .obj.');
      return;
    }

    const rawExt = primaryFile.name.split('.').pop()?.toLowerCase() || 'glb';
    const cleanExt: 'glb' | 'gltf' | 'fbx' | 'obj' = rawExt === 'gltf' ? 'glb' : (rawExt as 'glb' | 'gltf' | 'fbx' | 'obj');

    setGenerationError('');
    setNsfwError(null);
    setShouldTexture(true); // Preserve 100% original texture colors
    setShowBoundingBox(false);
    setIsSupportActive(false);
    setGroundGridEnabled(false);
    setLocal3DFiles(fileArray);
    setActiveFileType(cleanExt);

    const newAsset: GeneratedAsset = {
      id: `local-3d-${Date.now()}`,
      name: primaryFile.name.replace(/\.[^/.]+$/, ''),
      date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      status: 'succeeded',
      stage: 'Hoàn tất',
      progress: 100,
      fileType: cleanExt,
      localFiles: fileArray,
    };

    setAssets((prev) => [newAsset, ...prev]);
    setActiveModelMesh(newAsset);
  }, []);

  const handleLoadSampleModel = useCallback(() => {
    setGenerationError('');
    setNsfwError(null);
    setShouldTexture(true); // Enable textures to see vintage camera colors
    setShowBoundingBox(false);
    setIsSupportActive(false);
    setGroundGridEnabled(false);
    setLocal3DFiles(null);
    setActiveFileType('glb');

    const sampleAsset: GeneratedAsset = {
      id: 'sample-camera-glb',
      name: 'Camera Vintage 3D',
      date: 'Mô hình mẫu',
      status: 'succeeded',
      stage: 'Hoàn tất',
      progress: 100,
      glbUrl: '/models/camera.glb',
      fileType: 'glb',
    };

    setAssets((prev) => [sampleAsset, ...prev.filter((a) => a.id !== sampleAsset.id)]);
    setActiveModelMesh(sampleAsset);
  }, []);

  // Window Drag & Drop for 3D files (.glb, .fbx, .obj)
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDragging3D(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget || (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        setIsDragging3D(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging3D(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const has3D = files.some((f) => {
          const n = f.name.toLowerCase();
          return n.endsWith('.glb') || n.endsWith('.gltf') || n.endsWith('.fbx') || n.endsWith('.obj');
        });
        if (has3D) {
          handleLoad3DFiles(files);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleLoad3DFiles]);

  const handleGenerate = async () => {
    setGenerationError('');
    setNsfwError(null);

    const token = getAccessToken();
    if (!token || isAccessTokenExpired(token)) {
      setGenerationError('Hãy đăng nhập trước khi tạo mô hình 3D.');
      return;
    }

    if (creditBalance !== null && creditBalance <= 0) {
      setIsTopUpModalOpen(true);
      return;
    }

    if (generationMode === 'text' && !promptText.trim()) {
      setGenerationError('Hãy nhập mô tả cho mô hình 3D muốn tạo.');
      return;
    }

    if (generationMode === 'image' && !uploadedFile && !uploadedImage) {
      setGenerationError('Hãy tải lên ảnh PNG, JPG hoặc WEBP để tạo 3D.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      let fileToUpload = uploadedFile;

      if (generationMode === 'text') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#181816';
          ctx.fillRect(0, 0, 512, 512);
          ctx.fillStyle = '#E2DFD7';
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(promptText.trim().slice(0, 36) || 'Text-to-3D', 256, 256);
        }
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        fileToUpload = new File([blob || new Blob()], 'text-prompt.png', { type: 'image/png' });
      } else if (!fileToUpload && uploadedImage) {
        const res = await fetch(uploadedImage);
        const blob = await res.blob();
        fileToUpload = new File([blob], 'preset-image.jpg', { type: blob.type || 'image/jpeg' });
      }

      if (!fileToUpload) {
        throw new Error('Chưa có dữ liệu đầu vào hợp lệ.');
      }

      const modelTaskName = generationMode === 'text'
        ? promptText.trim().slice(0, 200)
        : (promptText.trim().slice(0, 200) || selectedModel);

      const task = await createImageGeneration({
        image: fileToUpload,
        modelName: modelTaskName,
        shouldTexture,
      });

      void fetchUserCredit();
      const asset = updateAsset(task);
      setActiveModelMesh(asset);
      void pollGeneration(task.id);
    } catch (error: unknown) {
      const parsed = parseGenerationError(error);
      if (parsed.isNsfwBlocked) {
        setNsfwError(parsed.message);
        setGenerationError('');
      } else {
        setGenerationError(parsed.message);
        setNsfwError(null);
      }
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
      setGenerationError(`Không thể tải file ${kind.toUpperCase()}.`);
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
      .catch(() => setGenerationError('Không tải được danh sách mô hình từ máy chủ.'));

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
    <div className="relative w-full h-screen overflow-hidden select-none bg-[#F6F3EE] text-[#231F1E] flex">
      {/* 3D Global Drag & Drop Overlay */}
      {isDragging3D && (
        <div className="fixed inset-0 z-50 bg-[#231F1E]/50 backdrop-blur-sm flex items-center justify-center p-8 pointer-events-none">
          <div className="border-2 border-dashed border-[#B83B2A] bg-[#FFFFFF] rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#FDF2F0] border border-[#B83B2A]/30 flex items-center justify-center text-[#B83B2A] mb-4 shadow-sm">
              <Box className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-[#231F1E]">
              Thả file 3D vào đây để hiển thị
            </h3>
            <p className="text-xs text-[#7A706C] mt-1.5 leading-relaxed">
              Hỗ trợ tệp <span className="font-mono text-[#B83B2A]">.GLB</span>, <span className="font-mono text-[#B83B2A]">.FBX</span>, <span className="font-mono text-[#B83B2A]">.OBJ</span> (+.mtl, textures)
            </p>
          </div>
        </div>
      )}

      {/* Three.js Viewport */}
      <Studio3DViewport
        faceCount={faceCount}
        customFaceCountDisplay={displayFaceCount}
        shouldTexture={shouldTexture}
        groundGridEnabled={groundGridEnabled}
        onToggleGroundGrid={() => setGroundGridEnabled((prev) => !prev)}
        isLeftPanelOpen={isLeftPanelOpen}
        isRightPanelOpen={isRightPanelOpen}
        activeModelGlbUrl={activeModelBlobUrl || (activeModelMesh?.glbUrl && !activeModelMesh.glbUrl.startsWith('/api/') ? activeModelMesh.glbUrl : null)}
        activeModelName={activeModelMesh?.name}
        activeModelFiles={activeModelMesh?.localFiles || local3DFiles}
        activeModelFileType={activeModelMesh?.fileType || activeFileType}
        onModelMetricsCalculated={handleModelMetricsCalculated}
        isGenerating={isGenerating}
        showBoundingBox={showBoundingBox}
        onToggleBoundingBox={() => setShowBoundingBox((prev) => !prev)}
        meshScale={meshScale}
        onBaseDimensionsCalculated={onBaseDimensionsCalculated}
        isSlicingActive={isSlicingActive}
        onToggleSlicing={() => setIsSlicingActive((prev) => !prev)}
        slicingProgress={slicingProgress}
        onSlicingProgressChange={handleSlicingProgressChange}
        layerHeightMm={layerHeightMm}
        isSimulatingPrint={isSimulatingPrint}
        onToggleSimulatingPrint={toggleSimulatingPrint}
        dimensionsYMm={dimensions.y}
        isSupportActive={isSupportActive}
        onToggleSupport={() => setIsSupportActive((prev) => !prev)}
        supportType={supportType}
        supportStrength={supportStrength}
        adhesionType={adhesionType}
        hasBrim={adhesionType === 'brim'}
      />

      {/* Left Column Stack */}
      <div className="absolute top-5 left-4 z-20 flex flex-col gap-2.5 w-[330px] max-w-[calc(100vw-4rem)] max-h-[calc(100vh-2.5rem)] overflow-y-auto no-scrollbar pointer-events-auto pb-8 pt-1">
        {/* Panel 1: Tạo hình mô hình 3D (Thu gọn, không scroll cuộn) */}
        {isLeftPanelOpen ? (
          <div
            ref={leftPanelRef}
            className="w-full shrink-0 bg-[#FFFFFF] border border-[#E2D9D0] rounded-xl px-3 pt-2.5 pb-3 shadow-md text-[#231F1E] flex flex-col gap-2 transition-all duration-200"
          >
            {/* Header - Sticky with solid white bg and top padding to prevent any clipping */}
            <div className="sticky top-0 bg-[#FFFFFF] z-10 -mx-3.5 px-3.5 pt-1 pb-2 flex items-center justify-between border-b border-[#E2D9D0]">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-5 h-5 rounded bg-[#FDF2F0] border border-[#B83B2A]/30 flex items-center justify-center text-[#B83B2A] shrink-0">
                  <Sparkles className="w-3 h-3" />
                </div>
                <h2 className="text-xs font-semibold tracking-wide text-[#231F1E] leading-normal shrink-0">
                  Tạo hình 3D
                </h2>
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(true)}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-[#FDF2F0] hover:bg-[#FDF2F0]/80 border border-[#B83B2A]/30 text-[#B83B2A] font-mono tabular-nums flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
                  title="Nhấn để nạp thêm lượt tạo 3D (PayOS VietQR)"
                >
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  <span>{creditBalance !== null ? `${creditBalance} lượt` : '1 lượt'}</span>
                  <span className="text-[#7A706C] text-[9px] border-l border-[#B83B2A]/20 pl-1 hover:text-[#231F1E]">
                    Nạp thêm
                  </span>
                </button>
              </div>
              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-1 rounded hover:bg-[#EFEAE2] text-[#7A706C] hover:text-[#231F1E] transition-colors cursor-pointer shrink-0"
                title="Thu gọn bảng"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="bg-[#F6F3EE] p-0.5 rounded-lg flex gap-1 border border-[#E2D9D0]">
              <button
                type="button"
                onClick={() => {
                  setGenerationMode('image');
                  setGenerationError('');
                  setNsfwError(null);
                }}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-center cursor-pointer ${
                  generationMode === 'image'
                    ? 'bg-[#FFFFFF] text-[#231F1E] border border-[#E2D9D0] shadow-sm font-semibold'
                    : 'text-[#7A706C] hover:text-[#231F1E]'
                }`}
              >
                Từ ảnh
              </button>
              <button
                type="button"
                onClick={() => {
                  setGenerationMode('text');
                  setGenerationError('');
                  setNsfwError(null);
                }}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-center cursor-pointer ${
                  generationMode === 'text'
                    ? 'bg-[#FFFFFF] text-[#231F1E] border border-[#E2D9D0] shadow-sm font-semibold'
                    : 'text-[#7A706C] hover:text-[#231F1E]'
                }`}
              >
                Từ chữ
              </button>
              <button
                type="button"
                onClick={() => {
                  setGenerationMode('file');
                  setGenerationError('');
                  setNsfwError(null);
                }}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] text-center cursor-pointer ${
                  generationMode === 'file'
                    ? 'bg-[#FFFFFF] text-[#231F1E] border border-[#E2D9D0] shadow-sm font-semibold'
                    : 'text-[#7A706C] hover:text-[#231F1E]'
                }`}
              >
                File 3D
              </button>
            </div>

            {/* Content Area */}
            {generationMode === 'file' ? (
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={file3DInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleLoad3DFiles(e.target.files);
                    }
                  }}
                  multiple
                  accept=".glb,.gltf,.fbx,.obj,.mtl,.png,.jpg,.jpeg"
                  className="hidden"
                />

                <div
                  onClick={() => file3DInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleLoad3DFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`bg-[#F6F3EE] border border-dashed rounded-lg p-3 flex flex-col items-center justify-center py-2.5 min-h-[68px] transition-all cursor-pointer ${
                    isDraggingFile
                      ? 'border-[#B83B2A] bg-[#FDF2F0]'
                      : 'border-[#E2D9D0] hover:border-[#B83B2A]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] flex items-center justify-center text-[#B83B2A] shadow-sm mb-1.5">
                    <Box className="w-4 h-4 stroke-[1.5]" />
                  </div>
                  <span className="text-xs font-semibold text-[#231F1E] text-center">
                    Tải file 3D (.GLB, .FBX, .OBJ)
                  </span>
                  <span className="text-[10px] text-[#7A706C] text-center mt-0.5">
                    Kéo thả hoặc chọn nhiều tệp (.mtl, texture .png/.jpg)
                  </span>
                </div>

                {/* Quick Sample Model Button */}
                <div className="flex items-center justify-between pt-1 border-t border-[#E2D9D0]">
                  <span className="text-[10.5px] text-[#7A706C]">Mô hình mẫu:</span>
                  <button
                    type="button"
                    onClick={handleLoadSampleModel}
                    className="px-2 py-0.5 rounded bg-[#FDF2F0] hover:bg-[#FDF2F0]/80 border border-[#B83B2A]/40 text-[#B83B2A] text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    title="Mở mô hình mẫu Camera Vintage 3D kèm texture màu sắc"
                  >
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>Camera Vintage (.GLB)</span>
                  </button>
                </div>

                {/* Active loaded file info if any */}
                {local3DFiles && local3DFiles.length > 0 && (
                  <div className="p-1.5 rounded bg-[#FFFFFF] border border-[#E2D9D0] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Box className="w-3.5 h-3.5 text-[#B83B2A] shrink-0" />
                      <span className="truncate text-[10.5px] font-mono text-[#231F1E]">
                        {local3DFiles[0].name} {local3DFiles.length > 1 ? `(+${local3DFiles.length - 1} tệp)` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocal3DFiles(null);
                        setModelRealMetrics(null);
                        if (file3DInputRef.current) file3DInputRef.current.value = '';
                      }}
                      className="p-0.5 rounded hover:bg-[#F6F3EE] text-[#7A706C] hover:text-[#B83B2A]"
                      title="Gỡ file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : generationMode === 'text' ? (
              <div className="bg-[#F6F3EE] border border-[#E2D9D0] rounded-lg p-2.5 flex flex-col justify-between min-h-[75px] focus-within:border-[#B83B2A] transition-colors">
                <textarea
                  value={promptText}
                  onChange={(e) => {
                    setPromptText(e.target.value.slice(0, 500));
                    setGenerationError('');
                    setNsfwError(null);
                  }}
                  placeholder="Mô tả hình khối và chi tiết mô hình 3D (ví dụ: Tượng gốm mộc thiền định)..."
                  className="w-full h-20 bg-transparent resize-none outline-none text-xs text-[#231F1E] placeholder:text-[#7A706C] leading-relaxed"
                />
                <div className="flex items-center justify-between pt-1.5 border-t border-[#E2D9D0]">
                  <span className="text-[10px] text-[#7A706C]">Gợi ý: Phong cách tối giản, đường nét mộc</span>
                  <span className="text-[10px] text-[#7A706C] font-mono tabular-nums">
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
                      setNsfwError(null);
                    }
                  }}
                  className={`bg-[#F6F3EE] border border-dashed rounded-lg p-3 flex flex-col items-center justify-center py-2.5 min-h-[64px] transition-all ${
                    isDraggingFile
                      ? 'border-[#B83B2A] bg-[#FDF2F0]'
                      : 'border-[#E2D9D0] hover:border-[#B83B2A]'
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
                    <div className="relative w-full h-16 rounded overflow-hidden group">
                      <img src={uploadedImage} alt="Input" className="w-full h-full object-contain bg-[#F6F3EE]" />
                      <button
                        onClick={() => {
                          if (uploadedImage.startsWith('blob:')) {
                            URL.revokeObjectURL(uploadedImage);
                          }
                          setUploadedImage(null);
                          setUploadedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          setNsfwError(null);
                        }}
                        className="absolute top-1 right-1 p-1 bg-[#FFFFFF]/80 rounded hover:bg-[#B83B2A] hover:text-white text-[#231F1E] cursor-pointer transition-colors shadow-sm"
                        title="Xóa ảnh"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 text-[#7A706C] hover:text-[#231F1E] cursor-pointer p-2 text-center transition-colors w-full"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] flex items-center justify-center text-[#7A706C] shadow-sm">
                        <Upload className="w-4 h-4 stroke-[1.5]" />
                      </div>
                      <span className="text-xs font-medium text-[#231F1E]">Tải ảnh hoặc Ctrl+V</span>
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                {!uploadedImage && (
                  <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-[#7A706C] whitespace-nowrap">Mẫu:</span>
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setUploadedImage(preset.url);
                          setUploadedFile(null);
                          setGenerationError('');
                          setNsfwError(null);
                        }}
                        className="px-2 py-0.5 rounded bg-[#FFFFFF] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[10px] text-[#7A706C] hover:text-[#231F1E] transition-all whitespace-nowrap cursor-pointer shadow-sm"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NSFW Terracotta Alert Banner */}
            {nsfwError && (
              <div
                role="alert"
                className="rounded-lg border border-[#B83B2A] bg-[#FDF2F0] p-2.5 text-xs text-[#231F1E] flex items-start gap-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
                <AlertTriangle className="w-4 h-4 text-[#B83B2A] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-[#B83B2A]">Kiểm duyệt nội dung (NSFW)</span>
                  <span className="text-[11px] text-[#231F1E]">{nsfwError}</span>
                  <span className="text-[9.5px] text-[#7A706C] mt-0.5 font-mono tabular-nums">0 lượt trừ tín dụng · Vui lòng điều chỉnh ảnh hoặc từ khóa.</span>
                </div>
              </div>
            )}

            {/* Standard Error Alert */}
            {generationError && !nsfwError && (
              <div
                role="alert"
                className="rounded-lg border border-[#B83B2A]/40 bg-[#FDF2F0] p-2 text-[11px] leading-relaxed text-[#231F1E]"
              >
                {generationError}
              </div>
            )}

            {/* AI Model, Texture & Face Count Settings - Only for Image/Text AI Generation */}
            {generationMode !== 'file' && (
              <>
                {/* Single Row: Mô hình AI + Texture màu sắc */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {/* Model Selection Dropdown (Left ~65%) */}
                  <div className="relative flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="w-full px-2 py-1 bg-[#F6F3EE] border border-[#E2D9D0] rounded-lg text-xs text-[#231F1E] flex items-center justify-between hover:border-[#B83B2A] transition-colors cursor-pointer"
                      title="Chọn mô hình AI"
                    >
                      <span className="truncate text-[11px] font-medium">{selectedModel}</span>
                      <ChevronDown className={`w-3 h-3 text-[#7A706C] shrink-0 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isModelDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#FFFFFF] border border-[#E2D9D0] rounded-lg shadow-xl py-1 z-30 max-h-48 overflow-y-auto no-scrollbar">
                        {AI_MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.name);
                              setIsModelDropdownOpen(false);
                            }}
                            className="w-full text-left px-2 py-1 text-xs text-[#7A706C] hover:text-[#231F1E] hover:bg-[#F6F3EE] flex flex-col gap-0.5 cursor-pointer border-b border-[#E2D9D0] last:border-b-0"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium text-[#231F1E]">{model.name}</span>
                              {selectedModel === model.name && <Check className="w-3.5 h-3.5 text-[#B83B2A]" />}
                            </div>
                            <span className="text-[9.5px] text-[#7A706C] line-clamp-1">{model.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Texture Switch (Right ~35%) */}
                  <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-[#F6F3EE] border border-[#E2D9D0] rounded-lg">
                    <span className="text-[10px] text-[#7A706C] font-medium whitespace-nowrap">Texture</span>
                    <button
                      type="button"
                      onClick={() => setShouldTexture(!shouldTexture)}
                      className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        shouldTexture ? 'bg-[#B83B2A]' : 'bg-[#EFEAE2] border border-[#E2D9D0]'
                      }`}
                    >
                      <span
                        className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform shadow-sm ${
                          shouldTexture ? 'translate-x-2.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Model Face Count - Compact Row */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <span className="text-[10.5px] text-[#7A706C] font-medium shrink-0">Lưới</span>
                  <div className="bg-[#F6F3EE] border border-[#E2D9D0] rounded-lg p-0.5 flex items-center gap-1 text-xs">
                    {FACE_COUNTS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setFaceCount(count)}
                        className={`px-1.5 py-0.5 text-center rounded text-[10px] font-mono tabular-nums transition-all cursor-pointer ${
                          faceCount === count
                            ? 'bg-[#B83B2A] text-white font-semibold shadow-sm'
                            : 'text-[#7A706C] hover:text-[#231F1E]'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Generate Action Button */}
            {generationMode === 'file' ? (
              <button
                type="button"
                onClick={() => file3DInputRef.current?.click()}
                className="w-full mt-1 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 text-white bg-[#B83B2A] hover:bg-[#9E2F20] border border-[#B83B2A] active:scale-[0.99] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>Chọn file 3D từ máy tính</span>
              </button>
            ) : creditBalance === 0 ? (
              <button
                type="button"
                onClick={() => setIsTopUpModalOpen(true)}
                className="w-full mt-1 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 text-white bg-[#B83B2A] hover:bg-[#9E2F20] border border-[#B83B2A] active:scale-[0.99] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-white fill-current" />
                <span>Nạp thêm lượt (Từ 50.000đ)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="w-full mt-1 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 text-white bg-[#B83B2A] hover:bg-[#9E2F20] border border-[#B83B2A] active:scale-[0.99] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>
                  {isGenerating
                    ? `Đang tạo (${generationProgress}%)...`
                    : generationMode === 'text'
                    ? 'Tạo mô hình từ văn bản'
                    : 'Tạo mô hình từ ảnh'}
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="pointer-events-auto flex items-center gap-2 self-start">
            <button
              onClick={() => setIsLeftPanelOpen(true)}
              className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] shadow-sm cursor-pointer"
              title="Mở bảng tạo hình"
            >
              <PanelLeft className="w-4 h-4 text-[#B83B2A]" />
            </button>
            <button
              type="button"
              onClick={() => setIsTopUpModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] text-xs font-mono tabular-nums text-[#231F1E] hover:border-[#B83B2A] transition-all cursor-pointer shadow-sm"
              title="Nạp thêm lượt tạo AI"
            >
              <span className="text-[#B83B2A]">⚡</span>
              <span>{creditBalance} lượt</span>
              <span className="text-[10px] text-[#B83B2A] font-sans underline underline-offset-2">Nạp</span>
            </button>
          </div>
        )}

        {/* Panel 2: Kích thước & Scale */}
        <div className="pointer-events-auto w-full shrink-0">
          {!isDimensionsPanelOpen ? (
            <button
              type="button"
              onClick={() => setIsDimensionsPanelOpen(true)}
              className="w-full bg-[#FFFFFF] border border-[#E2D9D0] hover:border-[#B83B2A] rounded-xl px-3 py-2 shadow-sm flex items-center justify-between text-xs text-[#231F1E] transition-all cursor-pointer"
              title="Mở bảng kích thước"
            >
              <div className="flex items-center gap-2">
                <Box className="w-3.5 h-3.5 text-[#B83B2A]" />
                <span className="font-semibold text-xs">Kích thước & Scale</span>
                <span className="text-[11px] font-mono tabular-nums text-[#7A706C]">
                  ({dimensions.x} × {dimensions.z} × {dimensions.y} mm)
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A706C]" />
            </button>
          ) : (
            <div className="w-full bg-[#FFFFFF] border border-[#E2D9D0] rounded-xl p-3 shadow-md text-[#231F1E] flex flex-col gap-2.5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E2D9D0] pb-2">
                <button
                  type="button"
                  onClick={() => setIsDimensionsPanelOpen(false)}
                  className="flex items-center gap-1.5 cursor-pointer text-left hover:opacity-80 transition-opacity"
                >
                  <Box className="w-3.5 h-3.5 text-[#B83B2A]" />
                  <span className="text-xs font-semibold text-[#231F1E]">Kích thước & Scale</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowBoundingBox((prev) => !prev)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono tabular-nums transition-all cursor-pointer border ${
                      showBoundingBox
                        ? 'bg-[#FDF2F0] border-[#B83B2A] text-[#B83B2A]'
                        : 'bg-[#F6F3EE] border-[#E2D9D0] text-[#7A706C]'
                    }`}
                  >
                    Khung mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDimensionsPanelOpen(false)}
                    className="p-1 rounded hover:bg-[#F6F3EE] text-[#7A706C] hover:text-[#231F1E] transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Axes inputs */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-1 font-mono tabular-nums text-xs">
                  {/* X */}
                  <div className="flex items-center justify-between bg-[#F6F3EE] border border-[#E2D9D0] rounded px-2 py-1">
                    <span className="text-[10px] text-[#B83B2A] font-medium">X (Rộng)</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => stepDimension('x', -5)} className="w-4 h-4 rounded bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-center">-</button>
                      <input
                        type="text"
                        value={dimInputs.x}
                        onChange={(e) => handleInputChange('x', e.target.value)}
                        onBlur={() => commitDimension('x')}
                        className="w-12 bg-transparent text-right text-xs outline-none text-[#231F1E]"
                      />
                      <button onClick={() => stepDimension('x', 5)} className="w-4 h-4 rounded bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-center">+</button>
                      <span className="text-[10px] text-[#7A706C]">mm</span>
                    </div>
                  </div>

                  {/* Z */}
                  <div className="flex items-center justify-between bg-[#F6F3EE] border border-[#E2D9D0] rounded px-2 py-1">
                    <span className="text-[10px] text-[#7A706C] font-medium">Z (Sâu)</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => stepDimension('z', -5)} className="w-4 h-4 rounded bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-center">-</button>
                      <input
                        type="text"
                        value={dimInputs.z}
                        onChange={(e) => handleInputChange('z', e.target.value)}
                        onBlur={() => commitDimension('z')}
                        className="w-12 bg-transparent text-right text-xs outline-none text-[#231F1E]"
                      />
                      <button onClick={() => stepDimension('z', 5)} className="w-4 h-4 rounded bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-center">+</button>
                      <span className="text-[10px] text-[#7A706C]">mm</span>
                    </div>
                  </div>

                  {/* Y */}
                  <div className="flex items-center justify-between bg-[#F6F3EE] border border-[#E2D9D0] rounded px-2 py-1">
                    <span className="text-[10px] text-[#4A5D4E] font-medium">Y (Cao)</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => stepDimension('y', -5)} className="w-4 h-4 rounded bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-center">-</button>
                      <input
                        type="text"
                        value={dimInputs.y}
                        onChange={(e) => handleInputChange('y', e.target.value)}
                        onBlur={() => commitDimension('y')}
                        className="w-12 bg-transparent text-right text-xs outline-none text-[#231F1E]"
                      />
                      <button onClick={() => stepDimension('y', 5)} className="w-4 h-4 rounded bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-center">+</button>
                      <span className="text-[10px] text-[#7A706C]">mm</span>
                    </div>
                  </div>
                </div>

                {/* Aspect ratio lock */}
                <button
                  type="button"
                  onClick={() => setIsUniformScale((prev) => !prev)}
                  className={`self-stretch px-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isUniformScale
                      ? 'bg-[#FDF2F0] border-[#B83B2A] text-[#B83B2A]'
                      : 'bg-[#F6F3EE] border-[#E2D9D0] text-[#7A706C]'
                  }`}
                  title={isUniformScale ? 'Đang khóa tỷ lệ' : 'Tự do'}
                >
                  {isUniformScale ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span className="text-[8px] font-mono uppercase">{isUniformScale ? 'Khóa' : 'Tự do'}</span>
                </button>
              </div>

              {/* Scale Presets */}
              <div className="flex items-center justify-between bg-[#F6F3EE] p-1.5 rounded border border-[#E2D9D0] text-[11px]">
                <span className="text-[#7A706C] flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-[#B83B2A]" /> Tỷ lệ
                </span>
                <div className="flex gap-1 font-mono tabular-nums text-[10px]">
                  {[50, 100, 150, 200].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleScalePercentChange(p)}
                      className={`px-1.5 py-0.5 rounded border ${
                        scalePercent === p
                          ? 'bg-[#B83B2A] border-[#B83B2A] text-white font-medium'
                          : 'bg-[#FFFFFF] border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E]'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button
                type="button"
                onClick={resetDimensions}
                className="w-full py-1 rounded bg-[#F6F3EE] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại (Reset)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Floating Card: Assets & Inspector (Thu gọn, w-72, max-h-[420px]) */}
      {isRightPanelOpen ? (
        <div className="absolute top-4 right-4 w-72 max-w-[88vw] max-h-[420px] bg-[#FFFFFF] border border-[#E2D9D0] rounded-xl flex flex-col z-20 shadow-lg text-[#231F1E] overflow-hidden transition-all duration-200">
          {/* Header Tabs */}
          <div className="p-2.5 pb-2 flex items-center justify-between gap-1 border-b border-[#E2D9D0]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRightTab('Assets')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  rightTab === 'Assets'
                    ? 'bg-[#FDF2F0] text-[#B83B2A] border border-[#B83B2A]/40 font-semibold'
                    : 'text-[#7A706C] hover:text-[#231F1E]'
                }`}
              >
                <span>Tài sản</span>
                {displayAssets.length > 0 && (
                  <span className="ml-1 px-1 py-0.2 rounded bg-[#F6F3EE] text-[#7A706C] border border-[#E2D9D0] text-[9.5px] font-mono tabular-nums">
                    {displayAssets.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightTab('Layer')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  rightTab === 'Layer'
                    ? 'bg-[#FDF2F0] text-[#B83B2A] border border-[#B83B2A]/40 font-semibold'
                    : 'text-[#7A706C] hover:text-[#231F1E]'
                }`}
              >
                Lát cắt
              </button>
              <button
                onClick={() => setRightTab('Property')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  rightTab === 'Property'
                    ? 'bg-[#FDF2F0] text-[#B83B2A] border border-[#B83B2A]/40 font-semibold'
                    : 'text-[#7A706C] hover:text-[#231F1E]'
                }`}
              >
                Thuộc tính
              </button>
            </div>

            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="p-1 rounded hover:bg-[#F6F3EE] text-[#7A706C] hover:text-[#231F1E] transition-colors cursor-pointer"
              title="Thu gọn bảng phải"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Utility Bar */}
          <div className="border-b border-[#E2D9D0] px-2.5 py-1.5 flex items-center justify-between text-[#7A706C] text-xs">
            <button
              onClick={() => setGroundGridEnabled((prev) => !prev)}
              className={`p-1 rounded hover:text-[#231F1E] transition-colors ${groundGridEnabled ? 'text-[#B83B2A]' : ''}`}
              title="Lưới sàn"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('studio-camera-view', { detail: 'iso' }))}
              className="p-1 rounded hover:text-[#231F1E] transition-colors cursor-pointer"
              title="Isometric"
            >
              <Box className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('studio-camera-view', { detail: 'top' }))}
              className="p-1 rounded hover:text-[#231F1E] transition-colors cursor-pointer"
              title="Top View"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('studio-camera-view', { detail: 'bottom' }))}
              className="p-1 rounded hover:text-[#231F1E] transition-colors cursor-pointer"
              title="Bottom View"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  void document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  void document.exitFullscreen().catch(() => {});
                }
              }}
              className="p-1 rounded hover:text-[#231F1E] transition-colors cursor-pointer"
              title="Toàn màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-[#E2D9D0] mx-0.5" />
            <span className="text-[10px] text-[#B83B2A] font-mono px-1">
              3D Orbit
            </span>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col text-left no-scrollbar">
            {rightTab === 'Assets' && (
              displayAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center my-auto gap-2 py-8 text-center">
                  <Box className="w-6 h-6 text-[#7A706C] stroke-[1.5]" />
                  <span className="text-xs text-[#231F1E] font-medium">Chưa có mô hình</span>
                  <span className="text-[10.5px] text-[#7A706C] max-w-[200px]">
                    Tạo mô hình từ ảnh hoặc văn bản ở bảng bên trái.
                  </span>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  {displayAssets.map((asset: GeneratedAsset) => {
                    const isCurrent = activeModelMesh?.id === asset.id || (asset.id === 'active-viewport-mesh' && !activeModelMesh);
                    return (
                      <div
                        key={asset.id}
                        data-testid={`asset-card-${asset.id}`}
                        onClick={() => {
                          setActiveModelMesh(asset);
                          if (asset.localFiles) {
                            setLocal3DFiles(asset.localFiles);
                            setActiveFileType(asset.fileType || 'glb');
                          } else {
                            setLocal3DFiles(null);
                            setActiveFileType(asset.fileType || 'glb');
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-[#FDF2F0] border-[#B83B2A] shadow-xs'
                            : 'bg-[#FFFFFF] border-[#E2D9D0] hover:border-[#7A706C]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] border border-[#B83B2A]/30 flex items-center justify-center text-[#B83B2A] shrink-0">
                            <Box className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-[#231F1E] truncate">{asset.name}</span>
                              {isCurrent && (
                                <span className="shrink-0 px-1.5 py-0.2 rounded bg-[#B83B2A]/10 border border-[#B83B2A]/30 text-[9.5px] text-[#B83B2A] font-medium">
                                  Đang xem
                                </span>
                              )}
                              {(asset.isApprovedForPrinting || asset.reviewStatus === 'Approved') && (
                                <span className="shrink-0 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-mono font-bold tracking-wider">
                                  VERIFIED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <span className="text-[10px] text-[#7A706C] font-mono tabular-nums">
                                {asset.customFaces || (isCurrent ? displayFaceCount : faceCount)} Faces
                              </span>
                              <span className={`text-[10px] font-mono tabular-nums shrink-0 ${
                                asset.status === 'succeeded'
                                  ? 'text-[#4A5D4E]'
                                  : asset.status === 'failed'
                                  ? 'text-[#B83B2A]'
                                  : 'text-[#7A706C]'
                              }`}>
                                {statusLabel(asset.status)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {asset.errorMessage && (
                          <span className="text-[10px] text-[#B83B2A] block mt-1 leading-relaxed">{asset.errorMessage}</span>
                        )}

                        {(asset.glbUrl || asset.stlUrl || asset.localFiles || isCurrent) && (
                          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                            {(asset.status === 'succeeded' || isCurrent) && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOrderTargetAsset(asset);
                                  setIsPrintOrderModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded bg-[#B83B2A] hover:bg-[#9E2F20] px-2 py-0.5 text-[10px] text-white font-medium cursor-pointer shadow-xs"
                              >
                                <Sparkles className="h-3 w-3 text-white" />
                                <span>Chốt Mẫu & Đặt In</span>
                              </button>
                            )}
                            {asset.fileType && (
                              <span className="px-1.5 py-0.5 rounded bg-[#F6F3EE] border border-[#E2D9D0] text-[9.5px] font-mono uppercase text-[#7A706C]">
                                .{asset.fileType}
                              </span>
                            )}
                            {asset.glbUrl && (
                              <button
                                type="button"
                                onClick={(event) => void handleDownload(event, asset, 'glb')}
                                disabled={downloadingFile === `${asset.id}-glb`}
                                className="inline-flex items-center gap-1 rounded bg-[#F6F3EE] hover:bg-[#EFEAE2] border border-[#E2D9D0] px-2 py-0.5 text-[10px] text-[#231F1E] disabled:opacity-50"
                              >
                                <Download className="h-3 w-3" />
                                <span>GLB</span>
                              </button>
                            )}
                            {asset.stlUrl && (
                              <button
                                type="button"
                                onClick={(event) => void handleDownload(event, asset, 'stl')}
                                disabled={downloadingFile === `${asset.id}-stl`}
                                className="inline-flex items-center gap-1 rounded bg-[#F6F3EE] hover:bg-[#EFEAE2] border border-[#E2D9D0] px-2 py-0.5 text-[10px] text-[#231F1E] disabled:opacity-50"
                              >
                                <Download className="h-3 w-3" />
                                <span>STL</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {rightTab === 'Layer' && (
              <div className="w-full flex flex-col gap-2.5 text-left text-xs font-mono tabular-nums">
                {/* Slicing toggle & Scrubber */}
                <div className="p-2.5 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] flex flex-col gap-2">
                  <div className="flex items-center justify-between font-sans">
                    <div className="flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-[#B83B2A]" />
                      <span className="font-semibold text-[#231F1E]">Lát cắt</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSlicingActive((prev) => !prev)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-medium cursor-pointer border ${
                        isSlicingActive
                          ? 'bg-[#B83B2A] border-[#B83B2A] text-white'
                          : 'bg-[#FFFFFF] border-[#E2D9D0] text-[#7A706C]'
                      }`}
                    >
                      {isSlicingActive ? 'Đang bật' : 'Bật cắt'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-[#7A706C]">Vị trí lớp:</span>
                    <span className="text-[#231F1E] font-medium">
                      Lớp {currentLayer} / {totalLayers} ({Math.round(slicingProgress)}%)
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.5}
                    value={slicingProgress}
                    onChange={(e) => {
                      handleSlicingProgressChange(parseFloat(e.target.value));
                      if (!isSlicingActive) setIsSlicingActive(true);
                    }}
                    className="w-full accent-[#B83B2A] cursor-pointer h-1.5 bg-[#E2D9D0] rounded appearance-none"
                  />
                </div>

                {/* Layer Height & Infill */}
                <div className="grid grid-cols-2 gap-1.5 font-sans">
                  <div className="p-2 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] flex flex-col gap-1">
                    <span className="text-[10px] text-[#7A706C]">Độ dày lớp</span>
                    <div className="grid grid-cols-2 gap-1 font-mono tabular-nums">
                      {[0.12, 0.20].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setLayerHeightMm(h)}
                          className={`py-0.5 rounded text-[10px] border cursor-pointer ${
                            layerHeightMm === h
                              ? 'bg-[#B83B2A] border-[#B83B2A] text-white font-medium'
                              : 'bg-[#FFFFFF] border-[#E2D9D0] text-[#7A706C]'
                          }`}
                        >
                          {h}mm
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] flex flex-col gap-1">
                    <span className="text-[10px] text-[#7A706C]">Độ đặc (Infill)</span>
                    <div className="grid grid-cols-2 gap-1 font-mono tabular-nums">
                      {[20, 40].map((inf) => (
                        <button
                          key={inf}
                          type="button"
                          onClick={() => setInfillDensity(inf)}
                          className={`py-0.5 rounded text-[10px] border cursor-pointer ${
                            infillDensity === inf
                              ? 'bg-[#B83B2A] border-[#B83B2A] text-white font-medium'
                              : 'bg-[#FFFFFF] border-[#E2D9D0] text-[#7A706C]'
                          }`}
                        >
                          {inf}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Print Time */}
                <div className="p-2.5 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] flex items-center justify-between text-xs">
                  <span className="text-[#7A706C] font-sans">Thời gian in:</span>
                  <span className="text-[#231F1E] font-semibold">{printTimeFormatted}</span>
                </div>
              </div>
            )}

            {rightTab === 'Property' && (
              <div className="w-full flex flex-col gap-2.5 text-left text-xs font-mono tabular-nums">
                {/* 3-Material Quick Picker (Wabi-Sabi Low-Text) */}
                <div className="p-2.5 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#231F1E] font-sans flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#B83B2A]" /> Vật liệu in 3D
                    </span>
                    <span className="text-[10px] text-[#7A706C] font-sans">
                      {materialConfig.tag}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'PLA' as const, label: 'PLA', rate: '2.5k/cm³', sub: 'Tiêu chuẩn' },
                        { id: 'Resin SLA' as const, label: 'Resin SLA', rate: '6.5k/cm³', sub: 'Mịn cao' },
                        { id: 'ABS' as const, label: 'ABS', rate: '3.5k/cm³', sub: 'Bền bỉ' },
                      ]
                    ).map((mat) => {
                      const isSel = selectedMaterial === mat.id;
                      return (
                        <button
                          key={mat.id}
                          type="button"
                          onClick={() => setSelectedMaterial(mat.id)}
                          className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#FDF2F0] border-[#B83B2A] text-[#231F1E] shadow-xs'
                              : 'bg-[#FFFFFF] border-[#E2D9D0] text-[#7A706C] hover:border-[#7A706C]'
                          }`}
                        >
                          <span className={`text-[11px] font-semibold ${isSel ? 'text-[#B83B2A]' : 'text-[#231F1E]'}`}>
                            {mat.label}
                          </span>
                          <span className="text-[10px] font-mono tabular-nums text-[#B83B2A] font-medium">
                            {mat.rate}
                          </span>
                          <span className="text-[9px] text-[#7A706C] font-sans">
                            {mat.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Single Estimated Weight Line */}
                  <div className="pt-2 border-t border-[#E2D9D0] flex justify-between items-center text-[10.5px]">
                    <span className="text-[#7A706C] font-sans">Khối lượng ước tính:</span>
                    <span className="text-[#231F1E] font-semibold font-mono tabular-nums">
                      ~{Math.round(volumeCm3 * materialConfig.infill * materialConfig.density)}g ({selectedMaterial})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Checkout CTA (Chốt đơn in 3D) */}
          <div className="p-3 bg-[#FFFFFF] border-t border-[#E2D9D0] shrink-0 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#7A706C]">Thể tích & Diện tích</span>
                <span className="text-[#231F1E] font-medium text-[11px]">
                  {volumeCm3} cm³ · {surfaceAreaCm2} cm²
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#7A706C]">Tạm tính ({selectedMaterial})</span>
                <span className="text-sm font-semibold text-[#B83B2A]">
                  {liveTotalPriceVnd.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOrderTargetAsset(activeModelMesh || displayAssets[0] || null);
                setIsPrintOrderModalOpen(true);
              }}
              className="w-full py-2.5 px-3 rounded-lg bg-[#B83B2A] hover:bg-[#9E2F20] text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Chốt Mẫu & Đặt In →</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsRightPanelOpen(true)}
          className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-[#FFFFFF] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] shadow-sm cursor-pointer"
          title="Tài sản & Lớp (Mở bảng thông số)"
        >
          <PanelRight className="w-4 h-4 text-[#B83B2A]" />
        </button>
      )}

      {/* 3D Print Order & PayOS VietQR Modal */}
      {isPrintOrderModalOpen && (orderTargetAsset || activeModelMesh || displayAssets[0]) && (
        <PrintOrderModal
          isOpen={isPrintOrderModalOpen}
          onClose={() => {
            setIsPrintOrderModalOpen(false);
            setOrderTargetAsset(null);
          }}
          asset={orderTargetAsset || activeModelMesh || displayAssets[0]!}
          dimensions={dimensions}
          infillDensity={infillDensity}
          layerHeightMm={layerHeightMm}
          initialMaterial={selectedMaterial}
        />
      )}

      {/* Credit Top-Up PayOS VietQR Modal */}
      {isTopUpModalOpen && (
        <CreditTopUpModal
          isOpen={isTopUpModalOpen}
          onClose={() => setIsTopUpModalOpen(false)}
          onSuccess={(newBalance) => {
            setCreditBalance(newBalance);
            void fetchUserCredit();
          }}
          initialBalance={creditBalance}
        />
      )}
    </div>
  );
}
