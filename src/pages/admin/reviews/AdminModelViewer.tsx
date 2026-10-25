import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface AdminModelViewerProps {
  modelUrl: string | null;
  loading?: boolean;
  className?: string;
  modelName?: string | null;
}

export const AdminModelViewer: React.FC<AdminModelViewerProps> = ({
  modelUrl,
  loading: externalLoading = false,
  className = '',
  modelName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // References to keep track for controls and actions
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const initialCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(150, 150, 200));
  const initialTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 50, 0));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId = 0;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.002);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.copy(initialCamPosRef.current);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 1000;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(100, 200, 120);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-100, 80, -100);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0x818cf8, 0.4);
    backLight.position.set(0, -50, -100);
    scene.add(backLight);

    // 6. Floor & Grid
    const grid = new THREE.GridHelper(300, 30, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // 7. Render Loop
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (controls.autoRotate) {
        controls.update();
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Load Model
    let currentModelGroup: THREE.Group | null = null;

    if (modelUrl) {
      setInternalLoading(true);
      setLoadError(null);

      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
          currentModelGroup = model;

          // Shadow and material enhancement
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });

          // Calculate bounding box and center
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Place model bottom at y = 0 and centered in XZ
          model.position.x = -center.x;
          model.position.z = -center.z;
          model.position.y = -box.min.y;

          scene.add(model);

          // Auto-frame camera
          const maxDim = Math.max(size.x, size.y, size.z, 10);
          const fov = camera.fov * (Math.PI / 180);
          const dist = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.6;

          const newCamPos = new THREE.Vector3(dist * 0.9, dist * 0.7, dist * 1.1);
          const newTarget = new THREE.Vector3(0, size.y * 0.45, 0);

          camera.position.copy(newCamPos);
          controls.target.copy(newTarget);
          initialCamPosRef.current.copy(newCamPos);
          initialTargetRef.current.copy(newTarget);
          controls.update();

          setInternalLoading(false);
        },
        undefined,
        (err) => {
          console.error('Failed to load GLB model:', err);
          setLoadError('Không thể nạp file mô hình 3D (GLB). Vui lòng thử lại hoặc tải file STL.');
          setInternalLoading(false);
        }
      );
    }

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);

      // Dispose model geometry & materials
      if (currentModelGroup) {
        scene.remove(currentModelGroup);
        currentModelGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => {
                mat.dispose();
              });
            } else if (mesh.material) {
              mesh.material.dispose();
            }
          }
        });
      }

      // Dispose controls & renderer
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  const toggleAutoRotate = () => {
    if (controlsRef.current) {
      const next = !isRotating;
      controlsRef.current.autoRotate = next;
      controlsRef.current.autoRotateSpeed = 2.0;
      setIsRotating(next);
    }
  };

  const resetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.copy(initialCamPosRef.current);
      controlsRef.current.target.copy(initialTargetRef.current);
      controlsRef.current.update();
    }
  };

  const isLoading = externalLoading || internalLoading;

  return (
    <div className={`relative w-full h-full min-h-[420px] rounded-xl overflow-hidden bg-[#0a0f1d] border border-slate-800 ${className}`}>
      {/* 3D Canvas mount point */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Controls Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={toggleAutoRotate}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg backdrop-blur-md border transition-all ${
            isRotating
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
              : 'bg-slate-900/70 text-slate-300 border-slate-700/60 hover:bg-slate-800'
          }`}
          title="Tự động xoay 360 độ"
        >
          {isRotating ? '⏸ Dừng xoay' : '▶ Tự xoay'}
        </button>
        <button
          type="button"
          onClick={resetCamera}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg backdrop-blur-md bg-slate-900/70 text-slate-300 border border-slate-700/60 hover:bg-slate-800 transition-colors"
          title="Đặt lại góc nhìn mặc định"
        >
          ↺ Góc nhìn
        </button>
      </div>

      {/* Model Name Badge */}
      {modelName && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <div className="px-3 py-1.5 rounded-lg backdrop-blur-md bg-slate-900/80 border border-slate-700/60 text-xs font-medium text-slate-200">
            {modelName}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0f1d]/80 backdrop-blur-sm">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin-reverse" />
          </div>
          <span className="text-xs font-medium text-cyan-300 mt-3 tracking-wide">
            Đang tải mô hình 3D...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#0a0f1d]/90 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-rose-300 mb-1">Không thể hiển thị 3D</p>
          <p className="text-xs text-slate-400 max-w-sm mb-4">{loadError}</p>
        </div>
      )}

      {/* No URL Overlay */}
      {!modelUrl && !isLoading && !loadError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-slate-400">
          <svg className="w-10 h-10 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-xs">Chưa có file mô hình 3D (GLB)</p>
        </div>
      )}
    </div>
  );
};

