import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { adminReviewService } from '../../services/admin/adminReviewService';
import { errorMessage } from '../../hooks/useStaffData';

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}
export function StaffModelViewer({ generationId, format }: { generationId: string; format: 'glb' | 'stl' }) {
  const mount = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [rotating, setRotating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | undefined;
    let scene: THREE.Scene | undefined;
    let controls: OrbitControls | undefined;
    let observer: ResizeObserver | undefined;
    const controller = new AbortController();
    const load = async () => {
      try {
        objectUrl = await adminReviewService.getModelBlobUrl(generationId, format, controller.signal);
        if (!active) { URL.revokeObjectURL(objectUrl); objectUrl = null; return; }
        let model: THREE.Object3D;
        if (format === 'glb') model = (await new GLTFLoader().loadAsync(objectUrl)).scene;
        else model = new THREE.Mesh(await new STLLoader().loadAsync(objectUrl), new THREE.MeshStandardMaterial({ color: 0x00c6d4, roughness: 0.6 }));
        if (!active) { disposeObject(model); return; }
        const container = mount.current;
        if (!container) { disposeObject(model); return; }
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x070b14);
        scene.add(model);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z, 1);
        model.position.sub(center);
        camera.position.set(radius * 1.5, radius, radius * 1.5);
        camera.far = radius * 100;
        camera.updateProjectionMatrix();
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.saveState();
        controlsRef.current = controls;
        scene.add(new THREE.AmbientLight(0xffffff, 2));
        const light = new THREE.DirectionalLight(0xffffff, 3);
        light.position.set(radius, radius * 2, radius);
        scene.add(light);
        scene.add(new THREE.GridHelper(radius * 3, 20, 0x00c6d4, 0x334155));
        const resize = () => {
          if (!renderer) return;
          const width = container.clientWidth || 1;
          const height = container.clientHeight || 1;
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        observer = new ResizeObserver(resize); observer.observe(container); resize();
        const draw = () => {
          if (!active || !renderer || !scene || !controls) return;
          frame = requestAnimationFrame(draw); controls.update(); renderer.render(scene, camera);
        };
        draw(); setLoading(false);
      } catch (err) { if (active) { setError(errorMessage(err)); setLoading(false); } }
    };
    void load();
    return () => {
      active = false; controller.abort(); cancelAnimationFrame(frame); observer?.disconnect();
      controls?.dispose(); controlsRef.current = null;
      if (scene) disposeObject(scene);
      renderer?.dispose(); renderer?.domElement.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [generationId, format]);
  return <div className="staff-panel space-y-3">
    <div className="relative h-80"><div ref={mount} className="w-full h-full" />{loading && <p role="status" className="absolute inset-0 p-4">Đang tải mô hình 3D...</p>}{error && <p role="alert" className="absolute inset-0 p-4 staff-error">Không thể tải mô hình: {error}</p>}</div>
    <div className="flex gap-2"><button className="staff-button" disabled={loading || !!error} aria-pressed={rotating} onClick={() => { const next = !rotating; setRotating(next); if (controlsRef.current) controlsRef.current.autoRotate = next; }}>Tự xoay</button><button className="staff-button" disabled={loading || !!error} onClick={() => controlsRef.current?.reset()}>Reset góc nhìn</button></div>
  </div>;
}
export default StaffModelViewer;
