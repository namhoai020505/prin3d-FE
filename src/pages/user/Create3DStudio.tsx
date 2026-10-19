import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
  Sparkles,
  BookOpen,
  Info,
  ChevronDown,
  Check,
  PanelLeftClose,
  PanelLeft,
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
} from 'lucide-react';

interface GeneratedAsset {
  id: string;
  name: string;
  prompt: string;
  date: string;
  faceCount: string;
}

export default function Create3DStudio() {
  // Mode selection: 'text' | 'image'
  const [generationMode, setGenerationMode] = useState<'text' | 'image'>('text');
  const [promptText, setPromptText] = useState('');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // Model settings
  const [selectedModel, setSelectedModel] = useState('3D Generation - V3.1');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [standardizedAPose, setStandardizedAPose] = useState(false);
  const [faceCount, setFaceCount] = useState<'1.5M' | '1M' | '500k' | '50k'>('1.5M');

  // Ground Grid & Viewport settings
  const [groundGridEnabled, setGroundGridEnabled] = useState(true);
  const [cameraAngle, setCameraAngle] = useState({ pitch: 24, yaw: -35 });
  const [isOrbiting, setIsOrbiting] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, pitch: 24, yaw: -35 });

  // Image upload (for Image to Geometry)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Right panel tabs: 'Assets' | 'Layer' | 'Property'
  const [rightTab, setRightTab] = useState<'Assets' | 'Layer' | 'Property'>('Assets');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [activeModelMesh, setActiveModelMesh] = useState<GeneratedAsset | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle image upload
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedImage(URL.createObjectURL(file));
    }
  };

  // Generation simulation
  const handleGenerate = () => {
    if (generationMode === 'text' && !promptText.trim()) return;
    if (generationMode === 'image' && !uploadedImage) return;

    setIsGenerating(true);
    setGenerationProgress(10);

    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          const newAsset: GeneratedAsset = {
            id: `asset-${Date.now()}`,
            name: promptText ? promptText.slice(0, 24) + '...' : '3D Sculpture Model',
            prompt: promptText || 'Generated from image',
            date: 'Just now',
            faceCount,
          };
          setAssets((prevAssets) => [newAsset, ...prevAssets]);
          setActiveModelMesh(newAsset);
          return 100;
        }
        return prev + 15;
      });
    }, 250);
  };

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

      // Warm radial aura in center
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.45,
        width * 0.08,
        width / 2,
        height / 2,
        width * 0.75
      );
      bgGrad.addColorStop(0, '#15120a');
      bgGrad.addColorStop(1, '#07070a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      if (groundGridEnabled) {
        ctx.save();

        const centerX = width / 2;
        const centerY = height * 0.52;
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
          // Rotate around Y axis (yaw)
          const rx = gx * cosYaw - gz * sinYaw;
          const rz = gx * sinYaw + gz * cosYaw;

          // Camera distance perspective
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

          // Line along Z (varying Z from -gridSize to gridSize)
          const p1 = project(coord, -gridSize * spacing);
          const p2 = project(coord, gridSize * spacing);

          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            if (isCenter) {
              ctx.strokeStyle = 'rgba(255, 209, 102, 0.65)';
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

          // Line along X (varying X from -gridSize to gridSize)
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
        const cx = width / 2;
        const cy = height * 0.46;

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
  }, [groundGridEnabled, cameraAngle, activeModelMesh]);

  // Mouse orbit interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only orbit if clicking canvas directly (not on floating panels)
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
      <div className="absolute top-4 right-[296px] z-20 flex items-center gap-4">
        {/* Ground Grid Switch */}
        <div className="flex items-center gap-2 bg-[#14120c]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/20 shadow-lg">
          <span className="text-[11px] font-medium text-amber-200">Ground Grid</span>
          <button
            type="button"
            onClick={() => setGroundGridEnabled((prev) => !prev)}
            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${
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
          title="Reset camera view"
        >
          <svg className="w-8 h-8" viewBox="-30 -30 60 60">
            {/* Center origin */}
            <circle cx="0" cy="0" r="2.5" fill="#f59e0b" />
            {/* X axis (Gold/Amber) */}
            <line x1="0" y1="0" x2={gizmoX.x} y2={gizmoX.y} stroke="#FFD166" strokeWidth="2" />
            <circle cx={gizmoX.x} cy={gizmoX.y} r="3" fill="#FFD166" />
            {/* Y axis (Green) */}
            <line x1="0" y1="0" x2={gizmoY.x} y2={gizmoY.y} stroke="#10b981" strokeWidth="2" />
            <circle cx={gizmoY.x} cy={gizmoY.y} r="3" fill="#10b981" />
            {/* Z axis (Blue) */}
            <line x1="0" y1="0" x2={gizmoZ.x} y2={gizmoZ.y} stroke="#38bdf8" strokeWidth="2" />
            <circle cx={gizmoZ.x} cy={gizmoZ.y} r="3" fill="#38bdf8" />
          </svg>
        </div>
      </div>

      {/* Left Floating Panel: Geometry Generation */}
      {isLeftPanelOpen ? (
        <div className="absolute top-4 left-4 z-20 w-[330px] bg-[#14120d]/90 backdrop-blur-md border border-amber-500/20 rounded-2xl p-4 shadow-2xl shadow-black/80 text-white flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-white tracking-wide">
              Geometry Generation
            </h2>
            <button
              onClick={() => setIsLeftPanelOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Thu gọn"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-[#0b0a07] p-1 rounded-xl flex gap-1 border border-amber-500/15">
            <button
              onClick={() => setGenerationMode('text')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                generationMode === 'text'
                  ? 'bg-[#221c10] text-[#FFD166] shadow-sm border border-amber-500/35'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Text to Geometry
            </button>
            <button
              onClick={() => setGenerationMode('image')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                generationMode === 'image'
                  ? 'bg-[#221c10] text-[#FFD166] shadow-sm border border-amber-500/35'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Image to Geometry
            </button>
          </div>

          {/* Content Area */}
          {generationMode === 'text' ? (
            <div className="bg-[#18150f] border border-amber-500/20 rounded-xl p-3 flex flex-col justify-between min-h-[145px] focus-within:border-[#FFD166]/60 transition-colors">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value.slice(0, 500))}
                placeholder="Please enter the content you want to generate. It is recommended to focus on a single subject. For example: A brown cat sculpture with a curled tail, in a cartoon style."
                className="w-full h-24 bg-transparent resize-none outline-none text-xs text-white placeholder:text-neutral-500 leading-relaxed"
              />
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-amber-300 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  <span>Guide</span>
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
                <div className="relative w-full h-24 rounded-lg overflow-hidden group">
                  <img src={uploadedImage} alt="Input" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-1 right-1 p-1 bg-black/70 rounded-full hover:bg-black text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-[#FFD166] cursor-pointer p-4 text-center"
                >
                  <Upload className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-xs">Tải ảnh đầu vào (Image-to-3D)</span>
                </div>
              )}
            </div>
          )}

          {/* Model Selection Dropdown */}
          <div className="relative flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[11px] text-neutral-300 font-medium">
              <span>Select Model</span>
              <Info className="w-3 h-3 text-neutral-400" />
            </div>
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="w-full px-3 py-2 bg-[#18150f] border border-amber-500/20 rounded-xl text-xs text-white flex items-center justify-between hover:border-[#FFD166]/50 transition-colors cursor-pointer"
            >
              <span>{selectedModel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#16130e] border border-amber-500/30 rounded-xl shadow-2xl py-1 z-30 overflow-hidden">
                {[
                  '3D Generation - V3.1',
                  '3D Generation - V3.0',
                  '3D Fast - V2.5',
                  '3D Realistic - V1.0',
                ].map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model);
                      setIsModelDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:text-[#FFD166] hover:bg-amber-500/10 flex items-center justify-between cursor-pointer"
                  >
                    <span>{model}</span>
                    {selectedModel === model && <Check className="w-3.5 h-3.5 text-[#FFD166]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Standardized A-pose Switch */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-[11px] text-neutral-300 font-medium">
              <span>Standardized A-pose</span>
              <Info className="w-3 h-3 text-neutral-400" />
            </div>
            <button
              type="button"
              onClick={() => setStandardizedAPose(!standardizedAPose)}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                standardizedAPose ? 'bg-[#FFD166]' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-black transition-transform ${
                  standardizedAPose ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Model Face Count */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] text-neutral-300 font-medium">Model Face Count</span>
            <div className="bg-[#18150f] border border-amber-500/20 rounded-xl p-1 flex items-center justify-between text-xs">
              {(['1.5M', '1M', '500k', '50k'] as const).map((count, idx) => (
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

          {/* Generate Now Button (G2C Gold Theme) */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full mt-2 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-black bg-gradient-to-r from-[#FFD166] via-[#f59e0b] to-[#d97706] hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,209,102,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>{isGenerating ? `Generating (${generationProgress}%)...` : 'Generate Now'}</span>
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
      <div className="absolute top-0 right-0 bottom-0 w-[280px] bg-[#110f0b]/95 border-l border-amber-500/20 flex flex-col z-20 backdrop-blur-md">
        {/* Top Header Tabs */}
        <div className="p-3 pb-2 flex items-center gap-1.5">
          <button
            onClick={() => setRightTab('Assets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rightTab === 'Assets'
                ? 'bg-gradient-to-r from-[#FFD166] to-[#f59e0b] text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Assets
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
            Property
          </button>
        </div>

        {/* Secondary Tool Icons Bar */}
        <div className="border-t border-b border-amber-500/15 px-3 py-2 flex items-center justify-between text-neutral-400">
          <button className="hover:text-[#FFD166] transition-colors" title="Grid View">
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-[#FFD166] transition-colors" title="Layers">
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-[#FFD166] transition-colors" title="3D Box">
            <Box className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-[#FFD166] transition-colors" title="Maximize">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-[#FFD166] transition-colors" title="Visibility">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-[#FFD166] transition-colors" title="Hierarchy">
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-[#FFD166] transition-colors" title="Rigging">
            <Activity className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-[#FFD166] transition-colors" title="Pose">
            <User className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-amber-500/[0.04] border border-amber-500/20 flex items-center justify-center text-amber-500/50 shadow-inner">
                <Box className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                No assets yet, go generate some
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2.5 items-stretch">
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
                    <span className="text-[10px] text-[#FFD166] font-mono">{asset.faceCount}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1">{asset.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
