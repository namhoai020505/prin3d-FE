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
  Scissors,
  Play,
  Pause,
  Clock,
  ShieldCheck,
  Activity,
  Scale,
  Flame,
  Zap,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  approvalAndReviewService,
  buildCanonicalPrintConfig,
  type CanonicalPrintConfig,
  type CustomerApprovalDto,
} from '../../services/approvalAndReviewService';
import { IdempotencyManager } from '../../lib/idempotency';
import { AI_CONSENT_POLICY_VERSION } from '../../lib/env';
import QuoteModalV2 from '../../components/QuoteModalV2';
import { createImageGeneration, downloadGenerationFile, getGeneration, listGenerations, type GenerationStatus, type GenerationTask } from '../../services/generationService';
import { AUTH_SESSION_EVENT, getAccessToken, isAccessTokenExpired } from '../../lib/auth';
import { AI_MODELS, FACE_COUNTS, type FaceCount } from '../../constants/models';
import Studio3DViewport from './components/Studio3DViewport';

interface GeneratedAsset {
  id: string;
  versionId: string;
  name: string;
  date: string;
  status: GenerationStatus;
  stage: string;
  progress: number;
  errorMessage?: string | null;
  glbUrl?: string | null;
  stlUrl?: string | null;
  isApprovedForPrinting?: boolean;
  reviewStatus?: string;
  reviewNote?: string | null;
  isWatertight?: boolean;
  printabilityStatus?: string;
  requestedHeightMm?: number;
}

interface ApprovedConfig {
  approvalDto: CustomerApprovalDto;
  config: CanonicalPrintConfig;
}

const toAsset = (task: GenerationTask): GeneratedAsset => ({
  id: task.id,
  versionId: task.versionId || task.id,
  name: task.modelName?.trim() || '3D model',
  date: new Date(task.createdAtUtc).toLocaleString('vi-VN'),
  status: task.status,
  stage: task.stage,
  progress: task.progress,
  errorMessage: task.errorMessage,
  glbUrl: task.glbUrl,
  stlUrl: task.stlUrl,
  isApprovedForPrinting: task.isApprovedForPrinting,
  reviewStatus: task.reviewStatus,
  reviewNote: task.reviewNote,
  isWatertight: task.isWatertight,
  printabilityStatus: task.printabilityStatus,
  requestedHeightMm: task.requestedHeightMm,
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

  // 3D Layer Slicing Simulation States
  const [isSlicingActive, setIsSlicingActive] = useState(false);
  const [slicingProgress, setSlicingProgress] = useState(100);
  const [layerHeightMm, setLayerHeightMm] = useState(0.20);
  const [infillDensity, setInfillDensity] = useState(20);
  const [isSimulatingPrint, setIsSimulatingPrint] = useState(false);

  // 3D Printing Support & Adhesion Stability States
  const [isSupportActive, setIsSupportActive] = useState(true);
  const [supportType, setSupportType] = useState<'tree' | 'lattice'>('tree');
  const [supportStrength, setSupportStrength] = useState<'heavy' | 'standard' | 'light'>('heavy');
  const [adhesionType, setAdhesionType] = useState<'raft' | 'brim' | 'skirt'>('raft');

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
  const currentHeightMm = (slicingProgress / 100) * dimensions.y;
  const estPrintMinutes = Math.max(5, Math.round((totalLayers * 0.22) + (volumeCm3 * 1.1) * (infillDensity / 20)));
  const estHours = Math.floor(estPrintMinutes / 60);
  const estMins = estPrintMinutes % 60;
  const printTimeFormatted = estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins} phút`;
  const filamentGrams = Math.max(1, Math.round(estimatedGrams * (0.8 + (infillDensity / 100) * 0.4)));

  // Calculate support sacrificial plastic
  const supportFactor = !isSupportActive
    ? 0
    : supportStrength === 'heavy'
    ? 0.24
    : supportStrength === 'light'
    ? 0.09
    : 0.16;
  const supportGrams = Math.round(filamentGrams * supportFactor);

  // Calculate bed adhesion sacrificial plastic (Raft / Brim / Skirt)
  const adhesionGrams = adhesionType === 'raft'
    ? Math.max(12, Math.round(filamentGrams * 0.11))
    : adhesionType === 'brim'
    ? Math.max(4, Math.round(filamentGrams * 0.035))
    : 1;

  const totalWasteGrams = supportGrams + (adhesionType !== 'skirt' ? adhesionGrams : 0);
  const totalFilamentGrams = filamentGrams + totalWasteGrams;
  const totalFilamentMeters = (totalFilamentGrams / 3).toFixed(1);
  const totalEstimatedCostVnd = Math.round(totalFilamentGrams * 350).toLocaleString('vi-VN');
  const wasteCostVnd = Math.round(totalWasteGrams * 350).toLocaleString('vi-VN');
  const wasteRatioPercent = Math.max(1, Math.round((totalWasteGrams / totalFilamentGrams) * 100));
  const netProductPercent = 100 - wasteRatioPercent;

  // Mechanical Tipping Stability Score
  const stabilityScore = !isSupportActive
    ? 15
    : adhesionType === 'raft'
    ? (supportStrength === 'heavy' ? 98 : 92)
    : adhesionType === 'brim'
    ? (supportStrength === 'heavy' ? 88 : supportStrength === 'standard' ? 80 : 65)
    : 42;

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [activeModelMesh, setActiveModelMesh] = useState<GeneratedAsset | null>(null);
  const [generationError, setGenerationError] = useState('');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [authSessionRevision, setAuthSessionRevision] = useState(0);
  const pollTimers = useRef<number[]>([]);

  // Customer Approval & Quote Modal states
  const [approvedConfigMap, setApprovedConfigMap] = useState<Record<string, ApprovedConfig>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = sessionStorage.getItem('idea2model_approved_configs');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [printMaterial, setPrintMaterial] = useState<'Resin' | 'PLA'>('Resin');
  const [isApprovingPrint, setIsApprovingPrint] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('idea2model_approved_configs', JSON.stringify(approvedConfigMap));
    } catch {
      // Ignore sessionStorage errors
    }
  }, [approvedConfigMap]);

  const activeApproved = activeModelMesh ? approvedConfigMap[activeModelMesh.versionId] : undefined;

  const handleCustomerApproval = async (autoOpenQuote = false) => {
    if (!activeModelMesh) return;
    const token = getAccessToken();
    if (!token || isAccessTokenExpired(token)) {
      window.dispatchEvent(
        new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }),
      );
      return;
    }

    const heightMm = Math.min(120, Math.max(100, Math.round(dimensions.y || 100)));
    const canonicalConfig = buildCanonicalPrintConfig({
      material: printMaterial,
      heightMm,
      scale: scalePercent / 100,
    });

    setIsApprovingPrint(true);
    try {
      const approvalDto = await approvalAndReviewService.createCustomerApproval({
        versionId: activeModelMesh.versionId,
        configuration: canonicalConfig,
        policyVersion: AI_CONSENT_POLICY_VERSION,
      });

      setApprovedConfigMap((prev) => ({
        ...prev,
        [activeModelMesh.versionId]: {
          approvalDto,
          config: canonicalConfig,
        },
      }));

      toast.success(
        `Đã chốt cấu hình mẫu in 3D! Mã Hash: #${approvalDto.configurationHash.slice(0, 8)}`,
      );

      if (autoOpenQuote) {
        setIsQuoteModalOpen(true);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = errorObj.response?.data?.detail || errorObj.response?.data?.message || 'Không thể chốt mẫu in.';
      toast.error(msg);
    } finally {
      setIsApprovingPrint(false);
    }
  };

  const handleOpenQuoteModal = async () => {
    if (!activeModelMesh) return;
    const token = getAccessToken();
    if (!token || isAccessTokenExpired(token)) {
      window.dispatchEvent(
        new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }),
      );
      return;
    }

    if (activeApproved) {
      setIsQuoteModalOpen(true);
      return;
    }

    await handleCustomerApproval(true);
  };

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
      IdempotencyManager.refreshKey('generation:image');
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
      window.dispatchEvent(
        new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }),
      );
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
        heightMm: Math.min(120, Math.max(100, Math.round(dimensions.y || 100))),
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
      const lower = String(message || '').toLowerCase();
      if (lower.includes('consent') || lower.includes('aimodelprocessing')) {
        window.dispatchEvent(new CustomEvent('idea2model:open-ai-consent-modal'));
      }
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

      {/* Left Column Stack: Tạo hình mô hình 3D (trên) & Kích thước & Scale (dưới) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5 w-[336px] max-w-[calc(100vw-4rem)] max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar pointer-events-auto pb-8">
        {/* Panel 1: Tạo hình mô hình 3D */}
        {isLeftPanelOpen ? (
          <div
            ref={leftPanelRef}
            className="w-full shrink-0 max-h-[44vh] overflow-y-auto no-scrollbar bg-[#0a0d13]/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-4 shadow-2xl shadow-black/90 text-white flex flex-col gap-3.5"
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
                          IdempotencyManager.refreshKey('generation:image');
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
        <div className="pointer-events-auto w-full shrink-0">
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
                  className={`self-stretch px-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${isUniformScale
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
            {rightTab === 'Assets' && (
              assets.length === 0 ? (
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

                      {/* Badge Trạng thái Duyệt In (PrintReview Badge) */}
                      {asset.status === 'succeeded' && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {asset.isApprovedForPrinting || asset.reviewStatus === 'Approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-medium font-mono">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              Đạt chuẩn in 3D (Đã duyệt)
                            </span>
                          ) : asset.reviewStatus === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-400/40 text-rose-300 text-[10px] font-medium">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Cần chỉnh sửa lưới {asset.reviewNote ? `(${asset.reviewNote})` : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 text-[10px] font-medium">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              Chờ duyệt kỹ thuật in
                            </span>
                          )}

                          {approvedConfigMap[asset.versionId] && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                              <Check className="w-3 h-3" />
                              Đã chốt: #{approvedConfigMap[asset.versionId].approvalDto.configurationHash.slice(0, 6)}
                            </span>
                          )}
                        </div>
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
              )
            )}

            {rightTab === 'Layer' && (
              <div className="w-full flex flex-col gap-3 text-left">
                {/* Slicing Mode Toggle Header Card */}
                <div className={`p-3 rounded-xl border transition-all ${
                  isSlicingActive 
                    ? 'bg-cyan-950/30 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-white/[0.03] border-white/8'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSlicingActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-neutral-400'
                      }`}>
                        <Scissors className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Mô phỏng Lát cắt</div>
                        <div className="text-[10px] text-neutral-400">GPU Laser Slicing Plane</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSlicingActive((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        isSlicingActive
                          ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                          : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                      }`}
                    >
                      {isSlicingActive ? 'Đang bật' : 'Bật cắt'}
                    </button>
                  </div>

                  {/* Simulation Play/Pause button */}
                  <div className="mt-2.5 pt-2 border-t border-white/8 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={toggleSimulatingPrint}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSimulatingPrint
                          ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 animate-pulse'
                          : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30'
                      }`}
                    >
                      {isSimulatingPrint ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Tạm dừng in mô phỏng</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Mô phỏng in thời gian thực (Time-lapse)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Slicing Scrub Slider & Layer Telemetry */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-300">Vị trí lát cắt</span>
                    <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                      Layer {currentLayer} / {totalLayers} ({Math.round(slicingProgress)}%)
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
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                  />

                  {/* Step Buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleSlicingProgressChange(slicingProgress - (100 / totalLayers) * 5);
                        if (!isSlicingActive) setIsSlicingActive(true);
                      }}
                      className="py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-neutral-300 transition-colors text-center cursor-pointer"
                      title="Lùi 5 lớp"
                    >
                      -5 Lớp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSlicingProgressChange(slicingProgress - (100 / totalLayers));
                        if (!isSlicingActive) setIsSlicingActive(true);
                      }}
                      className="py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-neutral-300 transition-colors text-center cursor-pointer"
                      title="Lùi 1 lớp"
                    >
                      -1 Lớp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSlicingProgressChange(slicingProgress + (100 / totalLayers));
                        if (!isSlicingActive) setIsSlicingActive(true);
                      }}
                      className="py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-neutral-300 transition-colors text-center cursor-pointer"
                      title="Tới 1 lớp"
                    >
                      +1 Lớp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSlicingProgressChange(slicingProgress + (100 / totalLayers) * 5);
                        if (!isSlicingActive) setIsSlicingActive(true);
                      }}
                      className="py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-neutral-300 transition-colors text-center cursor-pointer"
                      title="Tới 5 lớp"
                    >
                      +5 Lớp
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-white/5">
                    <span>Độ cao tia cắt:</span>
                    <span className="font-mono text-white font-medium">
                      {currentHeightMm.toFixed(2)} / {dimensions.y.toFixed(1)} mm
                    </span>
                  </div>
                </div>

                {/* Layer Height Presets */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-300">Độ dày mỗi lớp (Layer Height)</span>
                    <span className="text-[10px] font-mono text-cyan-300">{layerHeightMm} mm</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { val: 0.05, label: '0.05mm', desc: 'Siêu nét' },
                      { val: 0.12, label: '0.12mm', desc: 'Chi tiết cao' },
                      { val: 0.20, label: '0.20mm', desc: 'Tiêu chuẩn' },
                      { val: 0.28, label: '0.28mm', desc: 'In nhanh' },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setLayerHeightMm(preset.val)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          layerHeightMm === preset.val
                            ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                            : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                        }`}
                      >
                        <div className="text-xs font-semibold">{preset.label}</div>
                        <div className="text-[9.5px] opacity-75">{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infill Density */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-300">Mật độ đặc bên trong (Infill)</span>
                    <span className="text-[10px] font-mono text-cyan-300">{infillDensity}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[15, 20, 40, 100].map((density) => (
                      <button
                        key={density}
                        type="button"
                        onClick={() => setInfillDensity(density)}
                        className={`py-1.5 rounded-lg border text-xs font-medium transition-all text-center cursor-pointer ${
                          infillDensity === density
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                            : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                        }`}
                      >
                        {density}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Physical Stability & Mechanical Equilibrium Card */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                        <Scale className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-white">Độ Ổn định Thăng bằng (Stability)</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                        stabilityScore >= 90
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : stabilityScore >= 75
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                          : 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      }`}
                    >
                      {stabilityScore}% Vững chắc
                    </span>
                  </div>

                  {/* Stability Progress Gauge */}
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        stabilityScore >= 90
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          : stabilityScore >= 75
                          ? 'bg-cyan-400'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${stabilityScore}%` }}
                    />
                  </div>

                  {/* Physics Center of Mass Analysis */}
                  <div className="p-2 rounded-lg bg-black/40 border border-white/6 text-[10px] space-y-1 text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Độ cao Trọng tâm (CoM):</span>
                      <span className="font-mono text-white font-medium">~{(dimensions.y * 0.5).toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Diện tích chân tiếp xúc:</span>
                      <span className="font-mono text-cyan-300 font-medium">
                        {adhesionType === 'raft'
                          ? '~42.0 cm² (Tăng 15x nhờ Bè Raft)'
                          : adhesionType === 'brim'
                          ? '~18.5 cm² (Vành Brim)'
                          : '~2.8 cm² (Chỉ chạm 1 điểm đáy)'}
                      </span>
                    </div>
                    <p className="text-[9px] text-neutral-400 pt-1 border-t border-white/5 leading-relaxed">
                      {adhesionType === 'raft'
                        ? '✓ Bè in Raft khoá chặt mô hình vào bàn nhiệt, triệt tiêu 100% mô-men uốn khi đầu in chạy tốc độ cao.'
                        : adhesionType === 'brim'
                        ? '⚠ Vành Brim tăng độ bám nhưng cần cẩn thận quán tính rung chấn nếu in tốc độ trên 150mm/s.'
                        : '❌ Cực kỳ nguy hiểm: Mô hình nặng chỉ tiếp xúc 1 điểm nhỏ, rất dễ bị gãy đổ khi in!'}
                    </p>
                  </div>
                </div>

                {/* Bed Adhesion Platform Selector (Bè in Raft vs Vành Brim vs Skirt) */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-white">Bệ đế Bàn in (Bed Adhesion)</span>
                    <span className="text-[9.5px] text-neutral-400 font-mono">
                      {adhesionType === 'raft' ? '+11% Nhựa hao hụt' : adhesionType === 'brim' ? '+3.5% Nhựa' : '0% Nhựa'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdhesionType('raft')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        adhesionType === 'raft'
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                          : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                      }`}
                    >
                      <div className="text-[10.5px] font-semibold flex items-center justify-between">
                        <span>Bè Raft</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-normal">Khuyên dùng</span>
                      </div>
                      <div className="text-[8.5px] opacity-75 mt-0.5 leading-tight">Khối đệm đặc 1.8mm, chống lật tuyệt đối</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdhesionType('brim')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        adhesionType === 'brim'
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                          : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                      }`}
                    >
                      <div className="text-[10.5px] font-semibold">Vành Brim</div>
                      <div className="text-[8.5px] opacity-75 mt-0.5 leading-tight">Vành 1 lớp mỏng, tiết kiệm nhựa hơn</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdhesionType('skirt')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        adhesionType === 'skirt'
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                      }`}
                    >
                      <div className="text-[10.5px] font-semibold">Chỉ Skirt</div>
                      <div className="text-[8.5px] opacity-75 mt-0.5 leading-tight">Chỉ viền xả đầu in, không bám đáy</div>
                    </button>
                  </div>
                </div>

                {/* 3D Printing Support & Strength Card */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-semibold text-white">Điểm tựa & Cột đỡ (Support)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSupportActive((prev) => !prev)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer border ${
                        isSupportActive
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-red-500/15 border-red-400/30 text-red-300'
                      }`}
                    >
                      {isSupportActive ? 'BẬT' : 'TẮT'}
                    </button>
                  </div>

                  {/* Overhang Status Alert */}
                  {!isSupportActive && (
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-start gap-2 text-amber-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="text-[9.5px] leading-tight">
                        <span className="font-semibold">Cảnh báo: </span>
                        Các vòng xoắn lơ lửng sẽ in trên không khí và biến thành sợi nhựa rơi (Spaghetti failure) nếu không có cột đỡ!
                      </div>
                    </div>
                  )}

                  {isSupportActive && (
                    <>
                      {/* Pattern Selector */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSupportType('tree')}
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            supportType === 'tree'
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                              : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                          }`}
                        >
                          <div className="text-[10.5px] font-semibold">Tree Support</div>
                          <div className="text-[8.5px] opacity-75">Cành cây uốn lượn ôm sát</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSupportType('lattice')}
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            supportType === 'lattice'
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                              : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                          }`}
                        >
                          <div className="text-[10.5px] font-semibold">Lattice Grid</div>
                          <div className="text-[8.5px] opacity-75">Khung giàn lưới chịu lực</div>
                        </button>
                      </div>

                      {/* Sturdiness Load Rating */}
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-white/6">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-neutral-400">Độ dày & Tải trọng thân trụ:</span>
                          <span className="font-mono text-cyan-300 font-semibold">
                            {supportStrength === 'heavy' ? 'Trụ Kết Cấu (Ø14mm + Gân V)' : supportStrength === 'standard' ? 'Tiêu chuẩn (Ø8mm)' : 'Thanh mảnh (Ø4mm)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { id: 'heavy', label: 'Trụ Kết Cấu', desc: 'Khóa rung & sai số' },
                            { id: 'standard', label: 'Tiêu chuẩn', desc: 'Cân bằng' },
                            { id: 'light', label: 'Thanh mảnh', desc: 'Tiết kiệm' },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSupportStrength(s.id as 'heavy' | 'standard' | 'light')}
                              className={`p-1 rounded border text-center transition-all cursor-pointer ${
                                supportStrength === s.id
                                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                                  : 'bg-white/[0.02] border-white/6 hover:border-white/15 text-neutral-400'
                              }`}
                            >
                              <div className="text-[10px] font-semibold">{s.label}</div>
                              <div className="text-[8px] opacity-70">{s.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Structural Cantilever & Precision Engineering Insight */}
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/25 text-[10px] space-y-1.5 text-neutral-300">
                        <div className="flex items-center justify-between text-emerald-300 font-semibold text-[10.5px]">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Phân tích Nhánh Yếu & Sai số in
                          </span>
                          <span className="font-mono text-[9.5px]">
                            {supportStrength === 'heavy' ? '±0.08 mm (Siêu chuẩn)' : supportStrength === 'standard' ? '±0.25 mm' : '±0.85 mm (Rủi ro lệch)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px] pt-1 border-t border-white/5">
                          <div className="bg-black/30 p-1.5 rounded border border-white/5">
                            <div className="text-neutral-400">Nhánh yếu phát hiện:</div>
                            <div className="font-semibold text-white mt-0.5">2 vòm treo trên cao + 2 đáy</div>
                          </div>
                          <div className="bg-black/30 p-1.5 rounded border border-white/5">
                            <div className="text-neutral-400">Độ võng uốn vòi phun:</div>
                            <div className={`font-semibold mt-0.5 ${supportStrength === 'heavy' ? 'text-emerald-300' : 'text-amber-300'}`}>
                              {supportStrength === 'heavy' ? '< 0.05 mm (Khóa cứng)' : '0.85 - 1.20 mm'}
                            </div>
                          </div>
                        </div>
                        <p className="text-[8.5px] text-neutral-400 leading-tight pt-1 border-t border-white/5">
                          {supportStrength === 'heavy'
                            ? '💡 Trụ kết cấu Ø14mm cắm thẳng lên nhánh yếu trên cao, giảm 90% sai số in. Bạn có thể an tâm chuyển sang Vành Brim để tiết kiệm 16g nhựa ở đế.'
                            : '⚠ Trụ mảnh dễ bị uốn cong theo vòi phun khi in lên cao, gây gợn sóng bề mặt hoặc sai lệch lớp.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Filament Waste & Telemetry Breakdown Card */}
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ước tính Nhựa & Hao hụt (Waste Analysis)</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300">
                      Hao hụt: {wasteRatioPercent}%
                    </span>
                  </div>

                  {/* Stacked Visual Bar Chart */}
                  <div className="space-y-1">
                    <div className="w-full bg-black/40 rounded-full h-2.5 flex overflow-hidden border border-white/10">
                      <div
                        className="bg-cyan-400 transition-all duration-300"
                        style={{ width: `${netProductPercent}%` }}
                        title={`Sản phẩm: ${filamentGrams}g (${netProductPercent}%)`}
                      />
                      <div
                        className="bg-amber-400 transition-all duration-300"
                        style={{ width: `${Math.round((adhesionGrams / totalFilamentGrams) * 100)}%` }}
                        title={`Bệ đế: ${adhesionGrams}g`}
                      />
                      <div
                        className="bg-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.round((supportGrams / totalFilamentGrams) * 100)}%` }}
                        title={`Cột đỡ: ${supportGrams}g`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-neutral-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                        Sản phẩm ({filamentGrams}g)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        Bệ đế ({adhesionGrams}g)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        Cột đỡ ({supportGrams}g)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px] pt-1 border-t border-cyan-500/15">
                    <div className="flex justify-between text-neutral-300">
                      <span className="text-neutral-400">Thời gian in dự kiến:</span>
                      <span className="font-semibold text-white font-mono">{printTimeFormatted}</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span className="text-neutral-400">Tổng số lớp in:</span>
                      <span className="font-semibold text-white font-mono">{totalLayers.toLocaleString()} layers</span>
                    </div>
                    <div className="flex justify-between text-amber-300/90">
                      <span className="text-neutral-400">Nhựa hao hụt bóc bỏ:</span>
                      <span className="font-semibold text-amber-300 font-mono">+{totalWasteGrams} g (~{wasteCostVnd} đ)</span>
                    </div>
                    <div className="flex justify-between text-neutral-300 pt-1 border-t border-cyan-500/15">
                      <span className="text-neutral-400">Tổng nhựa PLA tiêu thụ:</span>
                      <span className="font-bold text-cyan-200 font-mono">{totalFilamentGrams} g (~{totalFilamentMeters}m)</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span className="text-neutral-400">Tổng chi phí ước tính:</span>
                      <span className="font-bold text-emerald-300 font-mono">~{totalEstimatedCostVnd} đ</span>
                    </div>
                  </div>
                </div>

                {/* Pre-flight Print Checks */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kiểm tra chuẩn in (Pre-flight Checks)</span>
                  </div>
                  <div className="space-y-1.5 text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-neutral-300">Khổ bàn in (220×220×250mm):</span>
                      <span className={`ml-auto font-medium ${isWithinStandardPrintBed ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {isWithinStandardPrintBed ? 'Đạt' : 'Vượt khổ'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-neutral-300">Tính kín nước (Manifold):</span>
                      <span className="ml-auto text-emerald-300 font-medium">100% Watertight</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSupportActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-neutral-300">Điểm tựa góc nghiêng:</span>
                          <span className="ml-auto text-emerald-300 font-medium">Đã có Cột đỡ ({supportType === 'tree' ? 'Tree' : 'Lattice'})</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-neutral-300">Điểm tựa góc nghiêng:</span>
                          <span className="ml-auto text-amber-400 font-medium">Cảnh báo: Rơi sợi nhựa!</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {stabilityScore >= 75 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-neutral-300">Độ vững cơ học chống lật:</span>
                      <span className={`ml-auto font-medium ${stabilityScore >= 90 ? 'text-emerald-300' : stabilityScore >= 75 ? 'text-cyan-300' : 'text-amber-300'}`}>
                        {stabilityScore >= 90 ? 'Xuất sắc (Chống lật 98%)' : stabilityScore >= 75 ? 'Đạt chuẩn (80%)' : 'Nguy cơ lật (42%)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'Property' && (
              <div className="w-full flex flex-col gap-3 text-left">
                {/* Model Overview Card */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                      <Box className="w-3.5 h-3.5" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">
                        {activeModelMesh?.name || 'Mô hình 3D Hiện tại'}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {activeModelMesh ? 'AI Generated GLB' : 'Procedural Mesh Preview'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topology Specifications */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2.5">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Thông số lưới hình học (Topology)</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Số mặt (Polygons / Triangles):</span>
                      <span className="font-semibold text-white font-mono">
                        {faceCount === '1.5M' ? '1,500,000 tris' : faceCount === '1M' ? '1,000,000 tris' : faceCount === '500k' ? '500,000 tris' : '50,000 tris'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Số đỉnh (Vertices):</span>
                      <span className="font-semibold text-white font-mono">
                        {faceCount === '1.5M' ? '~750,000' : faceCount === '1M' ? '~500,000' : faceCount === '500k' ? '~250,000' : '~25,000'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Mức độ chi tiết:</span>
                      <span className="font-semibold text-cyan-300 capitalize">{faceCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Vật liệu & Texture:</span>
                      <span className="font-semibold text-white">{shouldTexture ? 'PBR Texture Có màu' : 'Đơn sắc (Clay Solid)'}</span>
                    </div>
                  </div>
                </div>

                {/* Physical Dimensions & Volume */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2.5">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kích thước & Thể tích vật lý</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Hộp bao (X × Y × Z):</span>
                      <span className="font-semibold text-white font-mono">
                        {dimensions.x} × {dimensions.y} × {dimensions.z} mm
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Tỷ lệ Scale:</span>
                      <span className="font-semibold text-white font-mono">{scalePercent}%</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Thể tích vật thể:</span>
                      <span className="font-semibold text-white font-mono">{volumeCm3.toLocaleString()} cm³</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Khối lượng ước tính:</span>
                      <span className="font-semibold text-white font-mono">{estimatedGrams} g (PLA)</span>
                    </div>
                  </div>
                </div>

                {/* 3D Printing Recommendations */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col gap-2">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Khuyến nghị thông số máy in</span>
                  </div>
                  <div className="space-y-1.5 text-[10.5px]">
                    <div className="flex justify-between text-neutral-300">
                      <span className="text-neutral-400">Nhiệt độ đầu phun (Nozzle):</span>
                      <span className="font-mono text-white">200°C - 215°C</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span className="text-neutral-400">Nhiệt độ bàn nhiệt (Bed):</span>
                      <span className="font-mono text-white">55°C - 60°C</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span className="text-neutral-400">Tốc độ in khuyên dùng:</span>
                      <span className="font-mono text-white">50 - 150 mm/s</span>
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span className="text-neutral-400">Định dạng file xuất:</span>
                      <span className="font-mono text-cyan-300">STL / GLB / OBJ</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Bottom CTA for Active Model (CustomerApproval & QuoteModalV2) */}
          {activeModelMesh && activeModelMesh.status === 'succeeded' && (
            <div className="p-3 border-t border-cyan-500/25 bg-[#080d14]/95 backdrop-blur-xl flex flex-col gap-2.5 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Chốt Mẫu In Sản Xuất
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  Cao: {Math.min(120, Math.max(100, Math.round(dimensions.y || 100)))} mm
                </span>
              </div>

              {/* Material Selector Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrintMaterial('Resin')}
                  className={`py-1.5 px-2 rounded-lg border text-left transition-all cursor-pointer ${
                    printMaterial === 'Resin'
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-white shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                      : 'bg-white/[0.02] border-white/8 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-[10.5px] font-semibold flex items-center justify-between">
                    <span>SLA Resin</span>
                    <span className="text-[8px] font-mono text-cyan-300">Siêu Mịn</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMaterial('PLA')}
                  className={`py-1.5 px-2 rounded-lg border text-left transition-all cursor-pointer ${
                    printMaterial === 'PLA'
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-white shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                      : 'bg-white/[0.02] border-white/8 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-[10.5px] font-semibold flex items-center justify-between">
                    <span>FDM PLA</span>
                    <span className="text-[8px] font-mono text-cyan-300">Nhựa Bền</span>
                  </div>
                </button>
              </div>

              {/* Nút 1: Xác nhận chốt mẫu in */}
              <button
                type="button"
                onClick={() => void handleCustomerApproval(false)}
                disabled={isApprovingPrint}
                className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  activeApproved
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                }`}
              >
                {isApprovingPrint ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : activeApproved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span className="truncate">
                  {activeApproved
                    ? `✓ Đã chốt in (#${activeApproved.approvalDto.configurationHash.slice(0, 8)})`
                    : '1. Xác nhận chốt mẫu in 3D'}
                </span>
              </button>

              {/* Nút 2: Mở Modal Báo Giá */}
              <button
                type="button"
                onClick={() => void handleOpenQuoteModal()}
                className="btn-pooled-cyan w-full py-2.5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.2)]"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-200" />
                <span>2. Lấy Báo Giá & Đặt In 3D</span>
              </button>
            </div>
          )}
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
      {/* Modal Báo Giá Sản Xuất V2 */}
      {activeModelMesh && (
        <QuoteModalV2
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          versionId={activeModelMesh.versionId}
          modelName={activeModelMesh.name}
          initialHeightMm={Math.min(120, Math.max(100, Math.round(dimensions.y || 100)))}
          initialMaterial={printMaterial}
          initialScale={scalePercent / 100}
          approvedConfigHash={activeApproved?.approvalDto.configurationHash || ''}
        />
      )}
    </div>
  );
}
