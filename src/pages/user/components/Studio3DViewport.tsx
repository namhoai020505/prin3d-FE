import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Maximize2,
  Minimize2,
  Grid,
  Sparkles,
  Play,
  Pause,
  Focus,
  Keyboard,
  X,
  Camera,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { FaceCount } from '../../../constants/models';

interface Studio3DViewportProps {
  faceCount: FaceCount;
  shouldTexture: boolean;
  groundGridEnabled: boolean;
  onToggleGroundGrid: () => void;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  activeModelGlbUrl?: string | null;
  activeModelName?: string;
  isGenerating?: boolean;
  showBoundingBox?: boolean;
  onToggleBoundingBox?: () => void;
  meshScale?: { x: number; y: number; z: number };
  onBaseDimensionsCalculated?: (dims: { x: number; y: number; z: number }) => void;
}

export type ShadingMode = 'wireframe' | 'solid-wire' | 'solid' | 'sla-resin';

/**
 * Creates a precision CAD-style 3D Bounding Box cage with:
 * - 12 primary neon cyan edge lines
 * - 8 High-Tech corner L-bracket accents
 * - 8 glowing corner vertex points
 * - Ground build-plate contact footprint
 */
function createBoundingBoxCage(size: THREE.Vector3): THREE.Group {
  const cageGroup = new THREE.Group();
  cageGroup.name = 'CAD_Bounding_Cage';

  const halfX = size.x / 2;
  const halfZ = size.z / 2;
  const height = size.y;

  // 1. Primary outer bounding box wireframe (grounded at Y = 0)
  const boxGeo = new THREE.BoxGeometry(size.x, height, size.z);
  boxGeo.translate(0, height / 2, 0);
  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0x06b6d4, // Cyan-500
    transparent: true,
    opacity: 0.65,
  });
  const mainWireframe = new THREE.LineSegments(edgesGeo, edgesMat);
  cageGroup.add(mainWireframe);

  // 2. High-Tech Corner L-Brackets at all 8 vertices
  const cornerLen = Math.max(0.08, Math.min(size.x, height, size.z) * 0.15);
  const bracketPoints: THREE.Vector3[] = [];
  const vertexPoints: THREE.Vector3[] = [];

  const xSigns = [-1, 1];
  const yVals = [0, height];
  const zSigns = [-1, 1];

  for (const sx of xSigns) {
    for (const cy of yVals) {
      for (const sz of zSigns) {
        const cx = sx * halfX;
        const cz = sz * halfZ;
        const corner = new THREE.Vector3(cx, cy, cz);
        vertexPoints.push(corner);

        // Arm along X
        bracketPoints.push(corner, new THREE.Vector3(cx - sx * cornerLen, cy, cz));
        // Arm along Y
        const armYDir = cy === 0 ? 1 : -1;
        bracketPoints.push(corner, new THREE.Vector3(cx, cy + armYDir * cornerLen, cz));
        // Arm along Z
        bracketPoints.push(corner, new THREE.Vector3(cx, cy, cz - sz * cornerLen));
      }
    }
  }

  const bracketsGeo = new THREE.BufferGeometry().setFromPoints(bracketPoints);
  const bracketsMat = new THREE.LineBasicMaterial({
    color: 0x00f2fe, // Neon cyan
    transparent: true,
    opacity: 0.95,
  });
  const bracketsMesh = new THREE.LineSegments(bracketsGeo, bracketsMat);
  cageGroup.add(bracketsMesh);

  // 3. 8 Glowing corner dots
  const dotsGeo = new THREE.BufferGeometry().setFromPoints(vertexPoints);
  const dotsMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.9,
  });
  const cornerDots = new THREE.Points(dotsGeo, dotsMat);
  cageGroup.add(cornerDots);

  // 4. Subtle Build-Plate Footprint outline at Y = 0.002
  const footprintPoints = [
    new THREE.Vector3(-halfX, 0.002, -halfZ),
    new THREE.Vector3(halfX, 0.002, -halfZ),
    new THREE.Vector3(halfX, 0.002, halfZ),
    new THREE.Vector3(-halfX, 0.002, halfZ),
    new THREE.Vector3(-halfX, 0.002, -halfZ),
  ];
  const footprintGeo = new THREE.BufferGeometry().setFromPoints(footprintPoints);
  const footprintMat = new THREE.LineBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.35,
  });
  const footprintLine = new THREE.Line(footprintGeo, footprintMat);
  cageGroup.add(footprintLine);

  return cageGroup;
}

export default function Studio3DViewport({
  faceCount,
  shouldTexture,
  groundGridEnabled,
  onToggleGroundGrid,
  isLeftPanelOpen,
  isRightPanelOpen,
  activeModelGlbUrl,
  activeModelName,
  isGenerating,
  showBoundingBox = true,
  onToggleBoundingBox,
  meshScale = { x: 1, y: 1, z: 1 },
  onBaseDimensionsCalculated,
}: Studio3DViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);
  const boundingBoxHelperRef = useRef<THREE.Group | null>(null);
  const baseHeightRef = useRef<number>(2.26);

  const [shadingMode, setShadingMode] = useState<ShadingMode>('solid-wire');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraInfo, setCameraInfo] = useState({ pitch: 24, yaw: -35, dist: 6.5 });
  const [animatingCamera, setAnimatingCamera] = useState(false);
  const [activeView, setActiveView] = useState<'front' | 'right' | 'top' | 'bottom' | 'iso' | null>('iso');
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const isAutoRotateRef = useRef(true);
  isAutoRotateRef.current = isAutoRotate;
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  const QUICK_VIEWS: { id: 'front' | 'right' | 'top' | 'bottom' | 'iso'; label: string; title: string }[] = [
    { id: 'front', label: 'Front', title: 'Chính diện (Front / +Z)' },
    { id: 'right', label: 'Right', title: 'Bên phải (Right / +X)' },
    { id: 'top', label: 'Top', title: 'Trên đỉnh (Top / +Y)' },
    { id: 'bottom', label: 'Bottom', title: 'Góc nhìn từ dưới lên (Bottom / Trục Z đáy)' },
    { id: 'iso', label: 'Iso', title: 'Đặt lại Isometric' },
  ];

  // Mesh resolution specs based on FaceCount
  const getMeshSpecs = (count: FaceCount) => {
    switch (count) {
      case '50k':
        return {
          detail: 2,
          radius: 1.4,
          subdivisions: 12,
          facesDisplay: '50,240',
          vertsDisplay: '25,122',
          desc: 'Tối ưu Realtime & Game Engine (Low-Poly Stylized)',
          manifold: '100% Manifold',
        };
      case '500k':
        return {
          detail: 4,
          radius: 1.4,
          subdivisions: 24,
          facesDisplay: '498,600',
          vertsDisplay: '249,302',
          desc: 'Chuẩn dựng cảnh & kiểm duyệt hình khối',
          manifold: 'Watertight Solid',
        };
      case '1M':
        return {
          detail: 5,
          radius: 1.4,
          subdivisions: 36,
          facesDisplay: '1,012,400',
          vertsDisplay: '506,202',
          desc: 'Siêu chi tiết, độ cong mượt mà cao cấp',
          manifold: 'Chuẩn in FDM/SLA mịn',
        };
      case '1.5M':
      default:
        return {
          detail: 6,
          radius: 1.4,
          subdivisions: 48,
          facesDisplay: '1,524,800',
          vertsDisplay: '762,402',
          desc: 'Lưới đa giác dày đặc chuẩn in SLA Resin siêu nét',
          manifold: 'SLA Micro-slice Ready',
        };
    }
  };

  const specs = getMeshSpecs(faceCount);

  // 1. Initialize Three.js Scene, Camera, Renderer, Lighting & OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x06080d);
    scene.fog = new THREE.FogExp2(0x06080d, 0.035);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 4.8);
    cameraRef.current = camera;

    // WebGL Renderer (with alpha & preserveDrawingBuffer for high-res transparent PNG snapshots)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls (Blender / Unity Style)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 25;
    controls.minPolarAngle = 0.01; // Allow looking straight down from top
    controls.maxPolarAngle = Math.PI - 0.01; // Full unrestricted 360 vertical orbit, allow looking from underneath
    controls.target.set(0, 1.1, 0);
    controlsRef.current = controls;

    let isInteracting = false;
    controls.addEventListener('start', () => {
      isInteracting = true;
      setActiveView(null);
    });
    controls.addEventListener('end', () => {
      isInteracting = false;
    });

    // Lighting (Professional 3D Studio Setup)
    // 1. Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // 2. Key Light (Sun / Warm)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // 3. Cyber Cyan Rim Light (brings that iconic sci-fi silhouette edge)
    const cyanRimLight = new THREE.DirectionalLight(0x00f2fe, 1.2);
    cyanRimLight.position.set(-6, -2, -6);
    scene.add(cyanRimLight);

    // 4. Subtle Emerald Fill
    const fillLight = new THREE.DirectionalLight(0x10b981, 0.5);
    fillLight.position.set(0, 6, -5);
    scene.add(fillLight);

    // 5. Underside / Bottom Light (for inspecting 3D print base & overhangs)
    const bottomLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    bottomLight.position.set(0, -8, 0);
    scene.add(bottomLight);

    // Infinite Ground Grid
    const gridHelper = new THREE.GridHelper(30, 60, 0x06b6d4, 0x161e2a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Major Axes indicators
    const axesGroup = new THREE.Group();
    // Red X axis line
    const xMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 });
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-15, 0, 0),
      new THREE.Vector3(15, 0, 0),
    ]);
    axesGroup.add(new THREE.Line(xGeo, xMat));

    // Cyan Z axis line
    const zMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -15),
      new THREE.Vector3(0, 0, 15),
    ]);
    axesGroup.add(new THREE.Line(zGeo, zMat));
    scene.add(axesGroup);
    axesGroupRef.current = axesGroup;

    // Container group for models
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Update camera distance and angle for HUD
      const pos = camera.position;
      const dist = pos.distanceTo(controls.target);
      const radPitch = Math.atan2(pos.y - controls.target.y, Math.sqrt(pos.x * pos.x + pos.z * pos.z));
      const radYaw = Math.atan2(pos.x - controls.target.x, pos.z - controls.target.z);
      setCameraInfo({
        pitch: Math.round((radPitch * 180) / Math.PI),
        yaw: Math.round((radYaw * 180) / Math.PI),
        dist: parseFloat(dist.toFixed(1)),
      });

      // Subtle slow turntable idle spin when not dragging and auto-rotate is enabled
      if (meshGroupRef.current && !isInteracting && isAutoRotateRef.current) {
        meshGroupRef.current.rotation.y += 0.0015;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      rendererRef.current = null;
      container.innerHTML = '';
    };
  }, []);

  // 2. Toggle Ground Grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = groundGridEnabled;
    }
    if (axesGroupRef.current) {
      axesGroupRef.current.visible = groundGridEnabled;
    }
  }, [groundGridEnabled]);

  // 3. Dynamic 3D Mesh Generation & Topology Updates according to FaceCount and ShadingMode
  useEffect(() => {
    const meshGroup = meshGroupRef.current;
    const scene = sceneRef.current;
    if (!meshGroup || !scene) return;

    // Clear existing meshes & old bounding box
    if (boundingBoxHelperRef.current) {
      if (boundingBoxHelperRef.current.parent) {
        boundingBoxHelperRef.current.parent.remove(boundingBoxHelperRef.current);
      }
      boundingBoxHelperRef.current.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        const mat = (child as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      boundingBoxHelperRef.current = null;
    }

    while (meshGroup.children.length > 0) {
      const child = meshGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
      meshGroup.remove(child);
    }

    const updateBoundingBoxAndDimensions = (targetGroup: THREE.Group) => {
      // 1. Remove old bounding cage before measuring base geometry
      if (boundingBoxHelperRef.current) {
        if (boundingBoxHelperRef.current.parent) {
          boundingBoxHelperRef.current.parent.remove(boundingBoxHelperRef.current);
        }
        boundingBoxHelperRef.current.traverse((child) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          const mat = (child as THREE.Mesh).material;
          if (mat) {
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat.dispose();
          }
        });
        boundingBoxHelperRef.current = null;
      }

      // 2. Temporarily reset rotation and scale to measure unrotated canonical geometry
      const prevRotY = targetGroup.rotation.y;
      targetGroup.rotation.set(0, 0, 0);
      targetGroup.scale.set(1, 1, 1);
      targetGroup.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(targetGroup);
      if (box.isEmpty()) {
        targetGroup.rotation.y = prevRotY;
        targetGroup.scale.set(
          Math.max(0.01, meshScale.x || 1),
          Math.max(0.01, meshScale.y || 1),
          Math.max(0.01, meshScale.z || 1)
        );
        return;
      }

      const size = box.getSize(new THREE.Vector3());
      baseHeightRef.current = size.y;

      // Real-world 3D printing conversion: 1 unit ~ 50 mm
      const scaleToMm = 50;
      const wMm = Math.max(10, Math.round(size.x * scaleToMm));
      const hMm = Math.max(10, Math.round(size.y * scaleToMm));
      const dMm = Math.max(10, Math.round(size.z * scaleToMm));

      onBaseDimensionsCalculated?.({ x: wMm, y: hMm, z: dMm });

      // 3. Create high-precision CAD Bounding Cage and attach directly to targetGroup
      const cage = createBoundingBoxCage(size);
      cage.visible = !!showBoundingBox;
      targetGroup.add(cage);
      boundingBoxHelperRef.current = cage;

      // 4. Restore rotation and apply current meshScale
      targetGroup.rotation.y = prevRotY;
      targetGroup.scale.set(
        Math.max(0.01, meshScale.x || 1),
        Math.max(0.01, meshScale.y || 1),
        Math.max(0.01, meshScale.z || 1)
      );
      targetGroup.updateMatrixWorld(true);
    };

    const buildProceduralGeometry = (targetMeshGroup: THREE.Group) => {
      // Build a multi-part stylized 3D mascot / robotic crystal sculpture
      const currentSpecs = getMeshSpecs(faceCount);
      const sub = currentSpecs.subdivisions;

      // Outer TorusKnot / Crystal Mesh
      const geometry = new THREE.TorusKnotGeometry(0.85, 0.28, sub * 4, sub);
      geometry.computeVertexNormals();

      // Ground geometry: base at Y = 0, centered in X and Z
      geometry.computeBoundingBox();
      const gBox = geometry.boundingBox!;
      const gSize = gBox.getSize(new THREE.Vector3());
      const gCenter = gBox.getCenter(new THREE.Vector3());
      geometry.translate(-gCenter.x, -gBox.min.y, -gCenter.z);

      // Materials based on shadingMode & shouldTexture
      let mainMat: THREE.Material;

      if (shadingMode === 'sla-resin') {
        // High-end Matte Grey SLA 3D Print Resin
        mainMat = new THREE.MeshStandardMaterial({
          color: 0xb5bac1,
          roughness: 0.35,
          metalness: 0.08,
          flatShading: faceCount === '50k',
        });
      } else if (shouldTexture) {
        // Vibrant Cyber iridescent material
        mainMat = new THREE.MeshPhysicalMaterial({
          color: 0x06b6d4,
          emissive: 0x022c35,
          roughness: 0.2,
          metalness: 0.85,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          flatShading: faceCount === '50k',
        });
      } else {
        // Dark Obsidian / Slate Metallic CAD Look
        mainMat = new THREE.MeshStandardMaterial({
          color: 0x1f2937,
          roughness: 0.25,
          metalness: 0.75,
          flatShading: faceCount === '50k',
        });
      }

      const mainMesh = new THREE.Mesh(geometry, mainMat);
      mainMesh.position.set(0, 0, 0);
      mainMesh.castShadow = true;
      mainMesh.receiveShadow = true;
      targetMeshGroup.add(mainMesh);

      // Wireframe overlay for 'solid-wire' or pure 'wireframe'
      if (shadingMode === 'wireframe') {
        mainMesh.visible = false;
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0x00f2fe,
          wireframe: true,
        });
        const wireMesh = new THREE.Mesh(geometry, wireMat);
        wireMesh.position.set(0, 0, 0);
        targetMeshGroup.add(wireMesh);
      } else if (shadingMode === 'solid-wire') {
        const wireMat = new THREE.MeshBasicMaterial({
          color: faceCount === '50k' ? 0x38bdf8 : faceCount === '500k' ? 0x06b6d4 : 0x00f2fe,
          wireframe: true,
          transparent: true,
          opacity: faceCount === '50k' ? 0.65 : faceCount === '500k' ? 0.38 : 0.22,
        });
        const wireMesh = new THREE.Mesh(geometry, wireMat);
        wireMesh.position.set(0, 0, 0);
        targetMeshGroup.add(wireMesh);
      }

      // Add a floating glowing inner core at exact vertical center
      const coreGeo = new THREE.IcosahedronGeometry(0.38, currentSpecs.detail >= 4 ? 3 : 1);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        wireframe: true,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(0, gSize.y / 2, 0);
      targetMeshGroup.add(coreMesh);
    };

    // If there is an actual GLB model from backend, load it!
    if (activeModelGlbUrl) {
      const loader = new GLTFLoader();
      loader.load(
        activeModelGlbUrl,
        (gltf) => {
          const model = gltf.scene;
          // Center and scale model
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxAxis = Math.max(size.x, size.y, size.z) || 1;
          const scale = 2.4 / maxAxis;
          model.scale.setScalar(scale);

          model.updateMatrixWorld(true);
          box.setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= box.min.y;

          // Apply wireframe overlay if in solid-wire mode
          if (shadingMode === 'solid-wire' || shadingMode === 'wireframe') {
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                if (shadingMode === 'wireframe') {
                  mesh.material = new THREE.MeshBasicMaterial({
                    color: 0x00f2fe,
                    wireframe: true,
                  });
                }
              }
            });
          }

          meshGroup.add(model);
          updateBoundingBoxAndDimensions(meshGroup);
        },
        undefined,
        () => {
          // Fallback to procedural mesh if load fails
          buildProceduralGeometry(meshGroup);
          updateBoundingBoxAndDimensions(meshGroup);
        }
      );
      return;
    }

    // Procedural 3D Mesh reflecting Face Count
    buildProceduralGeometry(meshGroup);
    updateBoundingBoxAndDimensions(meshGroup);
  }, [faceCount, shouldTexture, shadingMode, activeModelGlbUrl]);

  // 3b. Sync mesh scale from parent
  useEffect(() => {
    if (meshGroupRef.current) {
      meshGroupRef.current.scale.set(
        Math.max(0.01, meshScale.x || 1),
        Math.max(0.01, meshScale.y || 1),
        Math.max(0.01, meshScale.z || 1)
      );
    }
  }, [meshScale]);

  // 3c. Sync bounding box visibility from parent
  useEffect(() => {
    if (boundingBoxHelperRef.current) {
      boundingBoxHelperRef.current.visible = !!showBoundingBox;
    }
  }, [showBoundingBox]);

  // 4. Smooth Camera Angle Setter (Blender Gizmo Navigation)
  const setCameraView = useCallback(
    (view: 'iso' | 'front' | 'top' | 'right' | 'left' | 'back' | 'bottom') => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const meshGroup = meshGroupRef.current;
      if (!camera || !controls || animatingCamera) return;

      if (['iso', 'front', 'right', 'top', 'bottom'].includes(view)) {
        setActiveView(view as 'iso' | 'front' | 'right' | 'top' | 'bottom');
      }

      // Pause auto-rotate so user can clearly inspect chosen orientation
      setIsAutoRotate(false);

      const modelCenterY = (baseHeightRef.current * (meshScale.y || 1)) / 2 || 1.1;

      let targetPos = new THREE.Vector3();
      switch (view) {
        case 'front': // Looking down Z axis (Chính diện)
          targetPos.set(0, modelCenterY, 6.2);
          break;
        case 'back': // Looking from -Z (Phía sau)
          targetPos.set(0, modelCenterY, -6.2);
          break;
        case 'right': // Looking down X axis (Coral Red)
          targetPos.set(6.2, modelCenterY, 0);
          break;
        case 'left':
          targetPos.set(-6.2, modelCenterY, 0);
          break;
        case 'top': // Looking straight down Y
          targetPos.set(0, modelCenterY + 7.0, 0.001);
          break;
        case 'bottom': // Looking straight up from underneath (Trục Z - Nhìn mặt đáy)
          targetPos.set(0, modelCenterY - 6.0, 0.001);
          break;
        case 'iso':
        default:
          targetPos.set(4.5, modelCenterY + 2.4, 4.8);
          break;
      }

      setAnimatingCamera(true);
      const startPos = camera.position.clone();
      const startMeshRotY = meshGroup ? meshGroup.rotation.y : 0;
      const startTime = performance.now();
      const duration = 400; // ms

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        // Smooth easeInOutCubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.set(0, modelCenterY, 0);
        if (meshGroup) {
          // Smoothly align model back to canonical axis so the view is true
          meshGroup.rotation.y = THREE.MathUtils.lerp(startMeshRotY, 0, ease);
        }
        controls.update();

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          setAnimatingCamera(false);
        }
      };
      requestAnimationFrame(step);
    },
    [animatingCamera, meshScale.y]
  );

  // 5. Focus Model (Frame Selected / Center & Zoom)
  const focusModel = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const meshGroup = meshGroupRef.current;
    if (!camera || !controls || !meshGroup || animatingCamera) return;

    // Reset rotation temporarily to calculate accurate framing
    const currentRotY = meshGroup.rotation.y;
    meshGroup.rotation.y = 0;
    meshGroup.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(meshGroup);
    meshGroup.rotation.y = currentRotY;
    meshGroup.updateMatrixWorld(true);

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 2;

    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.95;
    const offsetDir = new THREE.Vector3(1, 0.65, 1.1).normalize();
    const targetPos = center.clone().add(offsetDir.multiplyScalar(Math.max(cameraDistance, 4.8)));

    setAnimatingCamera(true);
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();
    const duration = 450;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, center, ease);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        setAnimatingCamera(false);
      }
    };
    requestAnimationFrame(step);
  }, [animatingCamera]);

  // 6. High-Res Transparent PNG Snapshot (Chụp ảnh Render PNG trong suốt)
  const takeTransparentSnapshot = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    // Camera shutter flash FX
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    // Save and hide visual helpers
    const gridHelper = gridHelperRef.current;
    const axesGroup = axesGroupRef.current;
    const boxHelper = boundingBoxHelperRef.current;

    const prevGrid = gridHelper ? gridHelper.visible : false;
    const prevAxes = axesGroup ? axesGroup.visible : false;
    const prevBox = boxHelper ? boxHelper.visible : false;

    if (gridHelper) gridHelper.visible = false;
    if (axesGroup) axesGroup.visible = false;
    if (boxHelper) boxHelper.visible = false;

    const prevBg = scene.background;
    const prevFog = scene.fog;
    scene.background = null;
    scene.fog = null;

    // Render transparent frame pass
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    // Restore background & helpers
    scene.background = prevBg;
    scene.fog = prevFog;
    if (gridHelper) gridHelper.visible = prevGrid;
    if (axesGroup) axesGroup.visible = prevAxes;
    if (boxHelper) boxHelper.visible = prevBox;
    renderer.render(scene, camera);

    // Download file
    const link = document.createElement('a');
    const cleanName = (activeModelName || 'prin3d-model')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    link.download = `${cleanName}-transparent-render.png`;
    link.href = dataUrl;
    link.click();

    // Trigger toast notification
    setSnapshotToast(`Đã lưu ảnh render PNG trong suốt (${cleanName}.png)`);
    setTimeout(() => {
      setSnapshotToast(null);
    }, 3500);
  }, [activeModelName]);

  // Global Keyboard Shortcuts (Blender Numpad & Navigation Standards)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
        return;
      }

      if (key === '1' || e.code === 'Numpad1') {
        e.preventDefault();
        setCameraView('front');
      } else if (key === '3' || e.code === 'Numpad3') {
        e.preventDefault();
        setCameraView('right');
      } else if (key === '7' || e.code === 'Numpad7') {
        e.preventDefault();
        setCameraView('top');
      } else if (key === '9' || e.code === 'Numpad9') {
        e.preventDefault();
        setCameraView('bottom');
      } else if (key === '0' || e.code === 'Numpad0' || key === '5' || e.code === 'Numpad5') {
        e.preventDefault();
        setCameraView('iso');
      } else if (key === 'f' || key === ' ') {
        e.preventDefault();
        focusModel();
      } else if (key === 'z') {
        e.preventDefault();
        setShadingMode((prev) =>
          prev === 'solid-wire'
            ? 'wireframe'
            : prev === 'wireframe'
              ? 'sla-resin'
              : 'solid-wire'
        );
      } else if (key === 'r') {
        e.preventDefault();
        setIsAutoRotate((prev) => !prev);
      } else if (key === 'g') {
        e.preventDefault();
        onToggleGroundGrid();
      } else if (key === 'b') {
        e.preventDefault();
        onToggleBoundingBox?.();
      } else if (key === 'p') {
        e.preventDefault();
        takeTransparentSnapshot();
      } else if (key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCameraView, focusModel, onToggleGroundGrid, onToggleBoundingBox, takeTransparentSnapshot]);

  useEffect(() => {
    const handleCameraViewEvent = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (
        detail &&
        ['iso', 'front', 'top', 'right', 'left', 'back', 'bottom'].includes(detail)
      ) {
        setCameraView(
          detail as 'iso' | 'front' | 'top' | 'right' | 'left' | 'back' | 'bottom'
        );
      }
    };
    window.addEventListener('studio-camera-view', handleCameraViewEvent);
    return () =>
      window.removeEventListener('studio-camera-view', handleCameraViewEvent);
  }, [setCameraView]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP-CENTER STUDIO VIEWPORT TOOLBAR (Blender / Unity Style) */}
      <div
        className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 pointer-events-auto ${isLeftPanelOpen ? 'sm:ml-28' : ''
          } ${isRightPanelOpen ? 'sm:-mr-24' : ''}`}
      >
        <div className="bg-[#0b0f17]/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 text-xs text-zinc-300">
          {/* Shading Mode Selector with Smooth Motion Indicator */}
          <div className="relative flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10">
            {(
              [
                { id: 'solid-wire', label: 'Lưới + Khối', title: 'Khối đặc + Viền lưới đa giác (Phím Z)' },
                { id: 'wireframe', label: 'Wireframe', title: 'Chỉ khung dây (Phím Z)' },
                { id: 'sla-resin', label: 'In 3D SLA', title: 'Chế độ in 3D Nhựa Resin SLA (Phím Z)' },
              ] as const
            ).map((mode) => {
              const isActive = shadingMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setShadingMode(mode.id)}
                  className={`relative px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer select-none ${isActive ? 'text-cyan-200 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  title={mode.title}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeShadingBadge"
                      className="absolute inset-0 rounded-md bg-cyan-500/25 border border-cyan-400/40 shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{mode.label}</span>
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Ground Grid Switch */}
          <button
            onClick={onToggleGroundGrid}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${groundGridEnabled
                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white'
              }`}
            title={groundGridEnabled ? 'Tắt lưới sàn 3D (Phím G)' : 'Bật lưới sàn 3D (Phím G)'}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium hidden md:inline">Lưới</span>
          </button>

          {/* Turntable Auto-Rotate Switch */}
          <button
            onClick={() => setIsAutoRotate((prev) => !prev)}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${isAutoRotate
                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white'
              }`}
            title={isAutoRotate ? 'Tạm dừng tự xoay (Phím R)' : 'Bật tự động xoay (Phím R)'}
          >
            {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[10.5px] font-medium hidden md:inline">
              {isAutoRotate ? 'Dừng' : 'Xoay'}
            </span>
          </button>

          {/* Focus / Frame Selected Button */}
          <button
            onClick={focusModel}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/8 text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5"
            title="Căn giữa & Phóng to mô hình (Phím F hoặc Space)"
          >
            <Focus className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium hidden lg:inline">Căn giữa</span>
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* High-Res Transparent PNG Snapshot Button */}
          <button
            onClick={takeTransparentSnapshot}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/40 text-cyan-300 hover:text-cyan-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            title="Chụp ảnh Render PNG trong suốt chất lượng cao (Phím P)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-semibold hidden sm:inline">Chụp Render</span>
          </button>

          {/* Keyboard Shortcuts Help Button */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/8 text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer"
            title="Bảng phím tắt Blender 3D (Phím ?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                void document.documentElement.requestFullscreen().catch(() => { });
                setIsFullscreen(true);
              } else {
                void document.exitFullscreen().catch(() => { });
                setIsFullscreen(false);
              }
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/8 text-zinc-300 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* TOP-RIGHT BLENDER / UNITY 3D GIZMO & QUICK VIEW BAR */}
      <div
        className={`absolute top-4 z-20 flex flex-col items-end gap-2.5 transition-all duration-300 pointer-events-auto ${isRightPanelOpen ? 'right-4 sm:right-[305px]' : 'right-4'
          }`}
      >
        {/* Interactive 3-Axis Orientation Gizmo Box */}
        <div className="bg-[#0b0f17]/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-2.5 shadow-2xl flex flex-col items-center gap-2">
          {/* Circular Orientation Widget */}
          <div className="relative w-14 h-14 rounded-full bg-black/45 border border-white/10 flex items-center justify-center">
            {/* Center Isometric Snap Button */}
            <button
              onClick={() => setCameraView('iso')}
              className="w-4 h-4 rounded-full bg-white/20 hover:bg-cyan-400 text-black flex items-center justify-center transition-all hover:scale-125 z-10 cursor-pointer"
              title="Đặt lại góc nhìn Isometric"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </button>

            {/* X Axis Button (Right / Coral Red) */}
            <button
              onClick={() => setCameraView('right')}
              className="absolute right-1 w-4 h-4 rounded-full bg-[#f43f5e] hover:brightness-125 text-[8.5px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)] hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn bên phải (Trục X)"
            >
              X
            </button>

            {/* Z Axis Button (Bottom / Electric Cyan) */}
            <button
              onClick={() => setCameraView('bottom')}
              className="absolute bottom-1 w-4 h-4 rounded-full bg-[#06b6d4] hover:brightness-125 text-[8.5px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.6)] hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn từ dưới lên (Trục Z - Nhìn mặt đáy)"
            >
              Z
            </button>

            {/* Y Axis Button (Top / Emerald Green) */}
            <button
              onClick={() => setCameraView('top')}
              className="absolute top-1 w-4 h-4 rounded-full bg-[#10b981] hover:brightness-125 text-[8.5px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.6)] hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn từ trên xuống (Trục Y)"
            >
              Y
            </button>

            {/* Left Button (-X) */}
            <button
              onClick={() => setCameraView('left')}
              className="absolute left-1 w-2.5 h-2.5 rounded-full bg-white/20 hover:bg-[#f43f5e] hover:scale-125 transition-all cursor-pointer"
              title="Góc nhìn bên trái (-X)"
            />
          </div>

          {/* Quick View Snap Buttons (Blender Numpad Standard) with Smooth Motion Indicator */}
          <div className="relative flex items-center p-0.5 rounded-lg bg-black/50 border border-white/10 text-[10px] font-mono">
            {QUICK_VIEWS.map((v) => {
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setCameraView(v.id)}
                  className={`relative px-2 py-0.5 rounded-md transition-colors cursor-pointer select-none ${isActive ? 'text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  title={v.title}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCameraViewBadge"
                      className="absolute inset-0 rounded-md bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.35)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>



      {/* BOTTOM-CENTER MESH TOPOLOGY & REALTIME RESOLUTION HUD */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 pointer-events-auto ${isLeftPanelOpen ? 'sm:ml-28' : ''
          } ${isRightPanelOpen ? 'sm:-mr-24' : ''}`}
      >
        <div className="bg-[#0b0f17]/88 backdrop-blur-2xl border border-white/12 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-4 text-xs text-white">
          {/* Active Topology Badge */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white tracking-wide">
                  {activeModelName || 'Mô hình xem trước 3D'}
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-[10px]">
                  {faceCount} Faces
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Số mặt: <strong className="text-cyan-300">{specs.facesDisplay}</strong> · Đỉnh: <strong className="text-zinc-200">{specs.vertsDisplay}</strong>
              </span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-white/10 hidden md:block" />

          {/* Slicing & Manifold Spec */}
          <div className="hidden md:flex flex-col text-[10.5px]">
            <span className="text-zinc-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>{specs.manifold}</span>
            </span>
            <span className="text-[9.5px] text-zinc-500">{specs.desc}</span>
          </div>

          {/* Camera Telemetry */}
          <div className="w-[1px] h-6 bg-white/10 hidden lg:block" />
          <div className="hidden lg:flex flex-col text-[9.5px] font-mono text-zinc-500">
            <span>Camera: {cameraInfo.dist}m</span>
            <span>P:{cameraInfo.pitch}° Y:{cameraInfo.yaw}°</span>
          </div>
        </div>
      </div>

      {/* Camera Shutter Flash Effect */}
      <div
        className={`fixed inset-0 pointer-events-none z-50 bg-white transition-opacity duration-200 ${isFlashing ? 'opacity-85' : 'opacity-0'
          }`}
      />

      {/* Snapshot Success Toast */}
      {snapshotToast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#0e1726]/95 border border-cyan-400/50 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs text-white shadow-cyan-950/50"
        >
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-cyan-100">{snapshotToast}</span>
          <span className="text-[10px] text-zinc-400 ml-1 font-mono">PNG Trong Suốt</span>
        </motion.div>
      )}

      {/* Generating Overlay Animation */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
            <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
          </div>
          <span className="text-sm font-semibold text-white">Đang khởi tạo lưới 3D ({faceCount})...</span>
          <span className="text-xs text-zinc-400">Hệ thống đang nội suy bề mặt đa giác và tối ưu hóa file STL/GLB</span>
        </div>
      )}

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {isShortcutsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsShortcutsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0e131d]/95 border border-white/15 rounded-2xl p-6 shadow-2xl text-white shadow-black/90 flex flex-col gap-5 select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Phím tắt điều hướng 3D Studio
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Chuẩn thao tác Blender & Unity Viewport
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Đóng bảng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Column 1: Snap Camera Views */}
              <div className="flex flex-col gap-2 bg-white/[0.03] p-3 rounded-xl border border-white/8">
                <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider mb-1">
                  Chụp góc nhìn (Snap Views)
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Chính diện (Front)</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">1</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Bên phải (Right)</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">3</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Trên đỉnh (Top)</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">7</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Dưới đáy (Bottom)</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">9</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Góc Isometric</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">0 / 5</kbd>
                </div>
              </div>

              {/* Column 2: Controls & Actions */}
              <div className="flex flex-col gap-2 bg-white/[0.03] p-3 rounded-xl border border-white/8">
                <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider mb-1">
                  Thao tác nhanh
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Chụp Render trong suốt</span>
                  <kbd className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 font-mono text-[11px] text-cyan-300">P</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Bật/Tắt hộp đo mm</span>
                  <kbd className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 font-mono text-[11px] text-cyan-300">B</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Căn giữa mô hình</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">F / Space</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Đổi kiểu bề mặt</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">Z</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Bật/Tắt tự xoay</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">R</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Bật/Tắt lưới sàn</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">G</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Mở bảng phím tắt</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/60 border border-white/15 font-mono text-[11px] text-zinc-200">?</kbd>
                </div>
              </div>
            </div>

            {/* Mouse Legend */}
            <div className="bg-black/40 p-3 rounded-xl border border-white/8 flex flex-col gap-1.5 text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-200">Thao tác chuột:</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>• <strong className="text-zinc-200">Chuột trái kéo</strong>: Xoay tự do 360°</span>
                <span>• <strong className="text-zinc-200">Chuột phải kéo (Shift + Trái)</strong>: Lia khung nhìn (Pan)</span>
                <span>• <strong className="text-zinc-200">Cuộn chuột</strong>: Thu phóng mượt mà (Zoom)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
