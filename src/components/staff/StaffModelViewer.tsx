import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCw, RefreshCw, BoxSelect } from 'lucide-react';

interface StaffModelViewerProps {
  dimensionsMm: { x: number; y: number; z: number };
  meshStatus: 'Watertight' | 'NonManifold' | 'Warning' | 'Reviewed';
}

export const StaffModelViewer: React.FC<StaffModelViewerProps> = ({
  dimensionsMm,
  meshStatus,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070B14');

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(4, 3.5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const gridHelper = new THREE.GridHelper(6, 24, 0x00f0ff, 0x1e293b);
    scene.add(gridHelper);

    const buildVolumeGeo = new THREE.BoxGeometry(3.2, 3.6, 3.2);
    const buildVolumeEdges = new THREE.EdgesGeometry(buildVolumeGeo);
    const buildVolumeLine = new THREE.LineSegments(
      buildVolumeEdges,
      new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 })
    );
    buildVolumeLine.position.y = 1.8;
    scene.add(buildVolumeLine);

    const geometry = new THREE.TorusKnotGeometry(0.85, 0.28, 128, 32);
    const meshColor =
      meshStatus === 'NonManifold'
        ? 0xf43f5e
        : meshStatus === 'Warning'
        ? 0xf59e0b
        : 0x00f0ff;

    const material = new THREE.MeshStandardMaterial({
      color: meshColor,
      roughness: 0.3,
      metalness: 0.6,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 1.6;
    scene.add(mesh);

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireMesh = new THREE.Mesh(geometry, wireframeMat);
    mesh.add(wireMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.5, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      wireframeMat.dispose();
      buildVolumeGeo.dispose();
      buildVolumeEdges.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshStatus]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-slate-800 bg-[#070B14]">
      <div ref={mountRef} className="w-full h-full" />

      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#090D14]/90 border border-slate-800 text-xs font-mono text-slate-300">
        <BoxSelect className="w-3.5 h-3.5 text-[#00F0FF]" />
        <span>
          Build Box: {dimensionsMm.x} × {dimensionsMm.y} × {dimensionsMm.z} mm
        </span>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
            autoRotate
              ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]'
              : 'bg-[#090D14]/90 text-slate-400 border-slate-800'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          Tự xoay
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#090D14]/90 text-slate-300 border border-slate-800 hover:border-[#00F0FF]/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset góc nhìn
        </button>
      </div>
    </div>
  );
};

export default StaffModelViewer;

