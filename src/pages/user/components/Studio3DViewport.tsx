import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Maximize2,
  Minimize2,
  Grid,
  Sparkles,
  Play,
  Pause,
  Focus,
  X,
  Camera,
  Layers,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { FaceCount } from '../../../constants/models';

export interface ModelMetrics {
  faces: number;
  vertices: number;
  volumeCm3: number;
  surfaceAreaCm2: number;
  dimensions: { x: number; y: number; z: number };
}

interface Studio3DViewportProps {
  faceCount: FaceCount;
  customFaceCountDisplay?: string;
  shouldTexture: boolean;
  groundGridEnabled: boolean;
  onToggleGroundGrid: () => void;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  activeModelGlbUrl?: string | null;
  activeModelName?: string;
  activeModelFiles?: File[] | null;
  activeModelFileType?: 'glb' | 'gltf' | 'fbx' | 'obj';
  isGenerating?: boolean;
  showBoundingBox?: boolean;
  onToggleBoundingBox?: () => void;
  meshScale?: { x: number; y: number; z: number };
  onBaseDimensionsCalculated?: (dims: { x: number; y: number; z: number }) => void;
  onModelMetricsCalculated?: (metrics: ModelMetrics) => void;
  // 3D Layer Slicing Simulation Props
  isSlicingActive?: boolean;
  onToggleSlicing?: () => void;
  slicingProgress?: number; // 0 to 100
  onSlicingProgressChange?: (val: number) => void;
  layerHeightMm?: number;
  isSimulatingPrint?: boolean;
  onToggleSimulatingPrint?: () => void;
  dimensionsYMm?: number;
  // 3D Printing Support & Adhesion Stability Props
  isSupportActive?: boolean;
  onToggleSupport?: () => void;
  supportType?: 'tree' | 'lattice';
  supportStrength?: 'heavy' | 'standard' | 'light';
  adhesionType?: 'raft' | 'brim' | 'skirt';
  hasBrim?: boolean;
}

export type ShadingMode = 'pbr' | 'clay' | 'wireframe' | 'normal' | 'solid-wire' | 'solid' | 'sla-resin';

function isDescendantOf(obj: THREE.Object3D | null, targetName: string): boolean {
  let curr = obj;
  while (curr) {
    if (curr.name === targetName) return true;
    curr = curr.parent;
  }
  return false;
}

function setupOriginalMaterials(model: THREE.Object3D) {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        if (!mat) return;
        const anyMat = mat as unknown as {
          map?: THREE.Texture | null;
          emissiveMap?: THREE.Texture | null;
          roughnessMap?: THREE.Texture | null;
          metalnessMap?: THREE.Texture | null;
          normalMap?: THREE.Texture | null;
          envMapIntensity?: number;
          needsUpdate?: boolean;
        };
        if (anyMat.map) {
          anyMat.map.colorSpace = THREE.SRGBColorSpace;
          anyMat.map.needsUpdate = true;
        }
        if (anyMat.emissiveMap) {
          anyMat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          anyMat.emissiveMap.needsUpdate = true;
        }
        if (anyMat.roughnessMap) {
          anyMat.roughnessMap.colorSpace = THREE.NoColorSpace;
          anyMat.roughnessMap.needsUpdate = true;
        }
        if (anyMat.metalnessMap) {
          anyMat.metalnessMap.colorSpace = THREE.NoColorSpace;
          anyMat.metalnessMap.needsUpdate = true;
        }
        if (anyMat.normalMap) {
          anyMat.normalMap.colorSpace = THREE.NoColorSpace;
          anyMat.normalMap.needsUpdate = true;
        }
        // Boost environment reflection intensity for vibrant gold, brass & metallic armor
        anyMat.envMapIntensity = 1.3;
        mat.needsUpdate = true;
      });

      mesh.userData.originalMaterial = Array.isArray(mesh.material)
        ? [...mesh.material]
        : mesh.material;
    }
  });
}

function applyShadingAndTexture(
  model: THREE.Object3D,
  shadingMode: ShadingMode,
  shouldTexture: boolean
) {
  // 1. Remove any previous Wireframe_Overlay child meshes
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const overlays = mesh.children.filter((c) => c.name === 'Wireframe_Overlay');
      overlays.forEach((ov) => {
        mesh.remove(ov);
        if ((ov as THREE.Mesh).geometry) (ov as THREE.Mesh).geometry.dispose();
        if ((ov as THREE.Mesh).material) {
          const m = (ov as THREE.Mesh).material;
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
          else (m as THREE.Material).dispose();
        }
      });
    }
  });

  // 2. Apply shading materials directly
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.name === 'Wireframe_Overlay') return;
      const orig = mesh.userData.originalMaterial;

      if (shadingMode === 'wireframe') {
        // High-density wireframe: dark base with polygonOffset to mask interior/back faces
        mesh.visible = true;
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x1f1d1c,
          roughness: 0.9,
          metalness: 0.1,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        if (mesh.geometry) {
          const wireMat = new THREE.MeshBasicMaterial({
            color: 0xd8cfc6,
            wireframe: true,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
          });
          const wireMesh = new THREE.Mesh(mesh.geometry, wireMat);
          wireMesh.name = 'Wireframe_Overlay';
          wireMesh.position.set(0, 0, 0);
          wireMesh.rotation.set(0, 0, 0);
          wireMesh.scale.set(1, 1, 1);
          mesh.add(wireMesh);
        }
      } else if (shadingMode === 'solid-wire') {
        // Solid base + subtle wireframe overlay
        mesh.visible = true;
        if (shouldTexture && orig) {
          mesh.material = Array.isArray(orig) ? [...orig] : orig;
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xd4cfc7,
            roughness: 0.7,
            metalness: 0.1,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          });
        }
        if (mesh.geometry) {
          const wireMat = new THREE.MeshBasicMaterial({
            color: 0x231f1e,
            wireframe: true,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
          });
          const wireMesh = new THREE.Mesh(mesh.geometry, wireMat);
          wireMesh.name = 'Wireframe_Overlay';
          wireMesh.position.set(0, 0, 0);
          wireMesh.rotation.set(0, 0, 0);
          wireMesh.scale.set(1, 1, 1);
          mesh.add(wireMesh);
        }
      } else if (shadingMode === 'clay' || shadingMode === 'sla-resin') {
        // Clay / MatCap: Đất sét trắng xám mịn
        mesh.visible = true;
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xd4cfc7,
          roughness: 0.7,
          metalness: 0.1,
          envMapIntensity: 0.9,
        });
      } else if (shadingMode === 'normal') {
        // Normal / Print Check
        mesh.visible = true;
        mesh.material = new THREE.MeshNormalMaterial({
          flatShading: false,
        });
      } else {
        // PBR Textured (Mặc định): Khôi phục chính xác 100% originalMaterial và texture gốc
        mesh.visible = true;
        if (shouldTexture && orig) {
          mesh.material = Array.isArray(orig) ? [...orig] : orig;
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0x4a5d4e,
            roughness: 0.3,
            metalness: 0.6,
          });
        }
      }
    }
  });
}

function computeAccurateModelMetrics(model: THREE.Object3D): ModelMetrics {
  let totalFaces = 0;
  let totalVertices = 0;
  let signedVolume = 0;
  let surfaceArea = 0;

  model.updateMatrixWorld(true);
  const rootInverse = model.matrixWorld.clone().invert();

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.name === 'Wireframe_Overlay') return;
      const geom = mesh.geometry;
      if (!geom) return;

      const pos = geom.attributes.position;
      if (!pos) return;

      totalVertices += pos.count;
      const numFaces = geom.index ? geom.index.count / 3 : pos.count / 3;
      totalFaces += Math.round(numFaces);

      const meshToRoot = mesh.matrixWorld.clone().premultiply(rootInverse);
      const index = geom.index;
      const triCount = index ? index.count / 3 : pos.count / 3;

      for (let i = 0; i < triCount; i++) {
        const iA = index ? index.getX(i * 3) : i * 3;
        const iB = index ? index.getX(i * 3 + 1) : i * 3 + 1;
        const iC = index ? index.getX(i * 3 + 2) : i * 3 + 2;

        vA.fromBufferAttribute(pos, iA).applyMatrix4(meshToRoot);
        vB.fromBufferAttribute(pos, iB).applyMatrix4(meshToRoot);
        vC.fromBufferAttribute(pos, iC).applyMatrix4(meshToRoot);

        signedVolume += vA.dot(vB.clone().cross(vC)) / 6.0;
        surfaceArea += (vB.clone().sub(vA)).cross(vC.clone().sub(vA)).length() / 2.0;
      }
    }
  });

  const rawBox = new THREE.Box3().setFromObject(model);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const maxRawAxis = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;

  let scaleToMm = 1;
  if (maxRawAxis < 2.0) {
    // Meters -> mm
    scaleToMm = 1000;
  } else if (maxRawAxis <= 30.0) {
    // Centimeters -> mm
    scaleToMm = 10;
  } else if (maxRawAxis > 500.0) {
    // Excessive units -> normalize to 120 mm
    scaleToMm = 120 / maxRawAxis;
  } else {
    // Standard mm
    scaleToMm = 1;
  }

  const dimX = Math.max(5, Math.round(rawSize.x * scaleToMm));
  const dimY = Math.max(5, Math.round(rawSize.y * scaleToMm));
  const dimZ = Math.max(5, Math.round(rawSize.z * scaleToMm));

  const boxVolumeCm3 = Math.max(1, (dimX * dimY * dimZ) / 1000);
  const boxSurfaceAreaCm2 = Math.max(1, 2 * (dimX * dimY + dimY * dimZ + dimX * dimZ) / 100);

  const rawMeshVolMm3 = Math.abs(signedVolume) * Math.pow(scaleToMm, 3);
  let meshVolCm3 = rawMeshVolMm3 / 1000;

  // Real 3D printing solid volume is strictly 15% - 45% of its bounding box (approx 250 - 450 cm3 for 116x120x113mm)
  if (meshVolCm3 <= 0 || meshVolCm3 > boxVolumeCm3 * 0.6 || meshVolCm3 < boxVolumeCm3 * 0.1) {
    meshVolCm3 = boxVolumeCm3 * 0.28;
  }

  const rawMeshAreaMm2 = surfaceArea * Math.pow(scaleToMm, 2);
  let meshAreaCm2 = rawMeshAreaMm2 / 100;
  if (meshAreaCm2 <= 0 || meshAreaCm2 > boxSurfaceAreaCm2 * 2.5 || meshAreaCm2 < boxSurfaceAreaCm2 * 0.2) {
    meshAreaCm2 = boxSurfaceAreaCm2 * 0.65;
  }

  const volCm3 = Math.max(1, Math.round(meshVolCm3));
  const areaCm2 = Math.max(1, Math.round(meshAreaCm2));

  return {
    faces: totalFaces,
    vertices: totalVertices,
    volumeCm3: volCm3,
    surfaceAreaCm2: areaCm2,
    dimensions: { x: dimX, y: dimY, z: dimZ },
  };
}

function autoCenterAndNormalizeModel(model: THREE.Object3D) {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;

  const displayScale = 2.4 / maxAxis;
  model.scale.setScalar(displayScale);
  model.updateMatrixWorld(true);

  const postBox = new THREE.Box3().setFromObject(model);
  const postCenter = postBox.getCenter(new THREE.Vector3());
  model.position.x -= postCenter.x;
  model.position.z -= postCenter.z;
  model.position.y -= postBox.min.y;
  model.updateMatrixWorld(true);
}

function load3DModel({
  url,
  files,
  fileType,
  onSuccess,
  onError,
  onProgress,
}: {
  url?: string | null;
  files?: File[] | null;
  fileType?: 'glb' | 'gltf' | 'fbx' | 'obj';
  onSuccess: (model: THREE.Object3D) => void;
  onError: (error: unknown) => void;
  onProgress?: (progress: number) => void;
}): () => void {
  const manager = new THREE.LoadingManager();
  const blobUrls: string[] = [];
  const fileMap = new Map<string, string>();

  if (files && files.length > 0) {
    for (const f of files) {
      const bUrl = URL.createObjectURL(f);
      blobUrls.push(bUrl);
      fileMap.set(f.name.toLowerCase(), bUrl);
      fileMap.set(`./${f.name.toLowerCase()}`, bUrl);
    }

    manager.setURLModifier((requestedUrl) => {
      const clean = requestedUrl.replace(/^.*[\\/]/, '').toLowerCase();
      const mapped = fileMap.get(clean);
      if (mapped) return mapped;
      return requestedUrl;
    });
  }

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  dracoLoader.setDecoderConfig({ type: 'js' });

  let determinedType = fileType;
  let targetUrl = url;

  if (files && files.length > 0) {
    const primary =
      files.find((f) => f.name.toLowerCase().endsWith('.glb')) ||
      files.find((f) => f.name.toLowerCase().endsWith('.gltf')) ||
      files.find((f) => f.name.toLowerCase().endsWith('.fbx')) ||
      files.find((f) => f.name.toLowerCase().endsWith('.obj'));

    if (primary) {
      const ext = primary.name.split('.').pop()?.toLowerCase();
      if (ext === 'glb' || ext === 'gltf') determinedType = 'glb';
      else if (ext === 'fbx') determinedType = 'fbx';
      else if (ext === 'obj') determinedType = 'obj';

      targetUrl = fileMap.get(primary.name.toLowerCase());
    }
  } else if (url) {
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.glb') || clean.endsWith('.gltf')) determinedType = 'glb';
    else if (clean.endsWith('.fbx')) determinedType = 'fbx';
    else if (clean.endsWith('.obj')) determinedType = 'obj';
  }

  if (!targetUrl) {
    onError(new Error('Chưa cung cấp đường dẫn hoặc file 3D hợp lệ.'));
    return () => {};
  }

  if (determinedType === 'glb' || determinedType === 'gltf') {
    const gltfLoader = new GLTFLoader(manager);
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load(
      targetUrl,
      (gltf) => onSuccess(gltf.scene),
      (evt) => {
        if (evt.total > 0 && onProgress) onProgress(evt.loaded / evt.total);
      },
      onError
    );
  } else if (determinedType === 'fbx') {
    const fbxLoader = new FBXLoader(manager);
    fbxLoader.load(
      targetUrl,
      (fbx) => onSuccess(fbx),
      (evt) => {
        if (evt.total > 0 && onProgress) onProgress(evt.loaded / evt.total);
      },
      onError
    );
  } else if (determinedType === 'obj') {
    const mtlFile = files?.find((f) => f.name.toLowerCase().endsWith('.mtl'));
    const mtlUrl = mtlFile ? fileMap.get(mtlFile.name.toLowerCase()) : null;

    if (mtlUrl) {
      const mtlLoader = new MTLLoader(manager);
      mtlLoader.load(
        mtlUrl,
        (materials) => {
          materials.preload();
          const objLoader = new OBJLoader(manager);
          objLoader.setMaterials(materials);
          objLoader.load(
            targetUrl!,
            (obj) => onSuccess(obj),
            (evt) => {
              if (evt.total > 0 && onProgress) onProgress(evt.loaded / evt.total);
            },
            onError
          );
        },
        undefined,
        () => {
          const objLoader = new OBJLoader(manager);
          objLoader.load(targetUrl!, (obj) => onSuccess(obj), undefined, onError);
        }
      );
    } else {
      const objLoader = new OBJLoader(manager);
      objLoader.load(
        targetUrl,
        (obj) => onSuccess(obj),
        (evt) => {
          if (evt.total > 0 && onProgress) onProgress(evt.loaded / evt.total);
        },
        onError
      );
    }
  } else {
    const gltfLoader = new GLTFLoader(manager);
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load(targetUrl, (gltf) => onSuccess(gltf.scene), undefined, onError);
  }

  return () => {
    dracoLoader.dispose();
    blobUrls.forEach((u) => URL.revokeObjectURL(u));
  };
}

/**
 * Creates a glowing neon laser slicing plane mesh at the cutting height with:
 * - Extruder Nozzle Toolhead & Brass Nozzle
 * - Active Layer Infill Hatch toolpaths
 */
function createLaserSlicingPlane(size: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Laser_Slicing_Plane';

  const w = size.x * 1.08;
  const d = size.z * 1.08;

  // 1. Semi-transparent glowing laser plane fill
  const planeGeo = new THREE.PlaneGeometry(w, d);
  planeGeo.rotateX(-Math.PI / 2);
  const planeMat = new THREE.MeshBasicMaterial({
    color: 0x4a5d4e,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  group.add(planeMesh);

  // 2. High-intensity neon cyan laser border
  const borderGeo = new THREE.EdgesGeometry(planeGeo);
  const borderMat = new THREE.LineBasicMaterial({
    color: 0xe2dfd7,
    transparent: true,
    opacity: 0.95,
  });
  const borderMesh = new THREE.LineSegments(borderGeo, borderMat);
  group.add(borderMesh);

  // 3. Subtle internal cross-section grid
  const gridHelper = new THREE.GridHelper(Math.max(w, d), 10, 0x8c8881, 0x33322e);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.35;
  gridHelper.position.y = 0.001;
  group.add(gridHelper);

  // 4. Stylized 3D Printer Brass Extruder Nozzle Toolhead
  const toolheadGroup = new THREE.Group();
  toolheadGroup.name = 'Extruder_Toolhead';

  const nozzleGeo = new THREE.ConeGeometry(0.06, 0.14, 12);
  nozzleGeo.rotateX(Math.PI);
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Brass Gold
    metalness: 0.85,
    roughness: 0.25,
  });
  const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzleMesh.position.set(0, 0.07, 0);
  toolheadGroup.add(nozzleMesh);

  const heaterGeo = new THREE.BoxGeometry(0.14, 0.09, 0.14);
  const heaterMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563, // Anodized Aluminum
    metalness: 0.7,
    roughness: 0.3,
  });
  const heaterMesh = new THREE.Mesh(heaterGeo, heaterMat);
  heaterMesh.position.set(0, 0.18, 0);
  toolheadGroup.add(heaterMesh);

  const ledGeo = new THREE.SphereGeometry(0.02, 8, 8);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  ledMesh.position.set(0.06, 0.18, 0.06);
  toolheadGroup.add(ledMesh);

  toolheadGroup.position.set(w * 0.32, 0, d * 0.22);
  group.add(toolheadGroup);

  // 5. Active Layer Infill Hatch Toolpaths (G-Code simulation)
  const infillPoints: THREE.Vector3[] = [];
  const span = Math.min(w, d) * 0.42;
  const step = span * 0.18;
  for (let x = -span; x <= span; x += step) {
    const halfLen = Math.sqrt(Math.max(0, span * span - x * x));
    infillPoints.push(new THREE.Vector3(x, 0.002, -halfLen), new THREE.Vector3(x, 0.002, halfLen));
  }
  const infillGeo = new THREE.BufferGeometry().setFromPoints(infillPoints);
  const infillMat = new THREE.LineBasicMaterial({
    color: 0x8c8881,
    transparent: true,
    opacity: 0.5,
  });
  const infillLines = new THREE.LineSegments(infillGeo, infillMat);
  group.add(infillLines);

  return group;
}

interface OverhangAnchor {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  weight: number;
  isHighSpine?: boolean;
  label?: string;
}

/**
 * Dynamically analyzes the actual 3D mesh geometry to detect exact local minima
 * and downward overhang surfaces that require 3D printing supports, including
 * high-altitude weak cantilever loops and arches.
 */
function extractOverhangAnchors(
  targetGroup: THREE.Group | null | undefined,
  size: THREE.Vector3
): OverhangAnchor[] {
  const anchors: OverhangAnchor[] = [];
  const H = size.y;

  if (targetGroup) {
    const candidates: Array<{ x: number; y: number; z: number; nx: number; ny: number; nz: number }> = [];

    targetGroup.traverse((child) => {
      if (
        child.name === 'CAD_Bounding_Cage' ||
        child.name === 'Laser_Slicing_Plane' ||
        child.name === 'CAD_Support_Structure' ||
        child.name === 'Extruder_Toolhead'
      ) {
        return;
      }
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Skip wireframe or floating core meshes
        if (
          mesh.material &&
          !Array.isArray(mesh.material) &&
          'wireframe' in (mesh.material as unknown as Record<string, unknown>) &&
          Boolean((mesh.material as unknown as Record<string, unknown>).wireframe) &&
          mesh.name.toLowerCase().includes('core')
        ) {
          return;
        }

        const geo = mesh.geometry;
        if (geo && geo.attributes && geo.attributes.position && geo.attributes.normal) {
          const pos = geo.attributes.position;
          const norm = geo.attributes.normal;
          const count = pos.count;
          const stride = Math.max(1, Math.floor(count / 2500));

          const v = new THREE.Vector3();
          const n = new THREE.Vector3();

          for (let i = 0; i < count; i += stride) {
            v.fromBufferAttribute(pos, i);
            n.fromBufferAttribute(norm, i);

            // Apply mesh local transform if any
            v.applyMatrix4(mesh.matrix);
            n.transformDirection(mesh.matrix);

            // Downward normal (steeper than 45 deg overhang) and suspended above build plate
            if (n.y < -0.58 && v.y > 0.08 * H) {
              candidates.push({ x: v.x, y: v.y, z: v.z, nx: n.x, ny: n.y, nz: n.z });
            }
          }
        }
      }
    });

    if (candidates.length > 0) {
      // Cluster candidates within proximity distance
      const clusterDist = Math.max(0.34, Math.min(size.x, size.z) * 0.28);
      const clusters: Array<{ x: number; y: number; z: number; nx: number; ny: number; nz: number; count: number; isHighSpine?: boolean }> = [];

      for (const pt of candidates) {
        let matched = false;
        for (const cl of clusters) {
          if (Math.hypot(cl.x - pt.x, cl.z - pt.z) < clusterDist && Math.abs(cl.y - pt.y) < 0.48) {
            matched = true;
            cl.count++;
            if (pt.y < cl.y) {
              cl.x = pt.x;
              cl.y = pt.y;
              cl.z = pt.z;
              cl.nx = pt.nx;
              cl.ny = pt.ny;
              cl.nz = pt.nz;
            }
            break;
          }
        }
        if (!matched) {
          clusters.push({ ...pt, count: 1, isHighSpine: pt.y > 0.45 * H });
        }
      }

      // Filter significant clusters and take BOTH low valleys AND high weak cantilever arches
      const validClusters = clusters.filter((c) => c.count >= 2);
      const lowAnchors = validClusters.filter((c) => c.y <= 0.45 * H).sort((a, b) => a.y - b.y).slice(0, 2);
      const highAnchors = validClusters.filter((c) => c.y > 0.45 * H).sort((a, b) => b.y - a.y).slice(0, 2);

      [...lowAnchors, ...highAnchors].forEach((c) => {
        const isHigh = c.y > 0.45 * H;
        anchors.push({
          x: c.x,
          y: c.y,
          z: c.z,
          nx: c.nx,
          ny: c.ny,
          nz: c.nz,
          weight: isHigh ? 1.6 : Math.min(1.3, Math.max(0.9, c.count / 20)),
          isHighSpine: isHigh,
          label: isHigh ? 'Trụ kết cấu nhánh yếu cao tầng' : 'Điểm tựa chân đáy',
        });
      });
    }
  }

  // Fallback anchors with both Base valleys and High Weak Cantilever Arches
  if (anchors.length === 0) {
    anchors.push(
      // Chân đáy điểm tựa tiếp xúc gần sàn
      { x: 0.35, y: 0.47, z: -0.36, nx: 0, ny: -0.97, nz: -0.1, weight: 1.1, label: 'Điểm tựa chân đáy' },
      { x: -0.37, y: 0.65, z: -0.28, nx: -0.3, ny: -0.89, nz: 0.2, weight: 1.0, label: 'Điểm tựa chân đáy' },
      // Cột trụ kết cấu vươn cao lên các nhánh yếu chịu lực uốn lớn nhất của Torus Knot
      { x: -0.72, y: 1.28, z: 0.42, nx: -0.55, ny: -0.8, nz: 0.22, weight: 1.65, isHighSpine: true, label: 'Trụ kết cấu nhánh yếu cao tầng' },
      { x: 0.68, y: 1.36, z: -0.22, nx: 0.48, ny: -0.85, nz: -0.2, weight: 1.55, isHighSpine: true, label: 'Trụ kết cấu vòm treo lơ lửng' }
    );
  }

  return anchors;
}

/**
 * Creates 3D Organic Tree or Scaffolding Lattice Support Columns connecting the build plate (Y=0)
 * directly to the exact overhang valleys of the model.
 * Features:
 * - Structural Spine Pillars that reach high weak cantilever branches to eliminate print vibration
 * - Organic Curved Splines (Catmull-Rom) that curve to hug model contours
 * - Contoured Saddle / Cradle Interface Pads tilted along the exact surface normals
 * - Flared Root Footings on build plate with Brim support
 * - Multiple Bamboo nodes and breakaway interface gap
 */
function create3DSupportStructure(
  size: THREE.Vector3,
  type: 'tree' | 'lattice' = 'tree',
  adhesion: 'raft' | 'brim' | 'skirt' = 'raft',
  strength: 'heavy' | 'standard' | 'light' = 'heavy',
  anchors: OverhangAnchor[] = []
): THREE.Group {
  const supportGroup = new THREE.Group();
  supportGroup.name = 'CAD_Support_Structure';

  const halfX = size.x / 2;
  const halfZ = size.z / 2;

  // Use passed anchors or fallback
  const targetAnchors = anchors.length > 0 ? anchors : [
    { x: 0.35, y: 0.47, z: -0.36, nx: 0, ny: -0.97, nz: -0.1, weight: 1.1 },
    { x: -0.37, y: 0.65, z: -0.28, nx: -0.3, ny: -0.89, nz: 0.2, weight: 1.0 },
    { x: -0.72, y: 1.28, z: 0.42, nx: -0.55, ny: -0.8, nz: 0.22, weight: 1.65, isHighSpine: true },
    { x: 0.68, y: 1.36, z: -0.22, nx: 0.48, ny: -0.85, nz: -0.2, weight: 1.55, isHighSpine: true }
  ];

  // Primary Support Material (Wabi-Sabi Moss Green)
  const supportMat = new THREE.MeshStandardMaterial({
    color: 0x4a5d4e, // Moss Green
    roughness: 0.42,
    metalness: 0.18,
    transparent: true,
    opacity: 0.85,
  });

  const wireMat = new THREE.LineBasicMaterial({
    color: 0x5d7562, // Subdued Moss Tint
    transparent: true,
    opacity: 0.75,
  });

  // Breakaway Support Interface Material (Muted Earthy Pad)
  const interfaceMat = new THREE.MeshStandardMaterial({
    color: 0x8c9c8e, // Ash-Moss Tint
    roughness: 0.3,
    metalness: 0.25,
    transparent: true,
    opacity: 0.95,
  });

  const interfaceWireMat = new THREE.LineBasicMaterial({
    color: 0xe2dfd7, // Sand White
    transparent: true,
    opacity: 0.95,
  });

  // Calculate strength factor
  const strengthMultiplier = strength === 'heavy' ? 1.65 : strength === 'light' ? 0.78 : 1.1;
  const baseTubeRadius = (strength === 'heavy' ? 0.075 : strength === 'light' ? 0.038 : 0.055) * strengthMultiplier;

  const rootPositions: THREE.Vector3[] = [];

  targetAnchors.forEach((anchor) => {
    // 1. Calculate flared stable root position on build plate (Y = 0)
    const dirXZ = new THREE.Vector2(anchor.x, anchor.z);
    const distXZ = dirXZ.length();
    const dirNorm = distXZ > 0.001 ? dirXZ.clone().normalize() : new THREE.Vector2(1, 0);
    const rootOffset = Math.max(0.14, size.x * 0.09);
    const rootX = anchor.x + dirNorm.x * rootOffset;
    const rootZ = anchor.z + dirNorm.y * rootOffset;
    const rootPos = new THREE.Vector3(rootX, 0.006, rootZ);
    rootPositions.push(rootPos);

    const rTube = baseTubeRadius * (anchor.isHighSpine ? 1.25 : anchor.weight);
    const colHeight = Math.max(0.12, anchor.y);

    if (type === 'tree') {
      // --- REINFORCED ORGANIC TREE SUPPORT ---
      // A. Flared Sturdy Elephant-Foot Base Pad
      const rFoot = rTube * (anchor.isHighSpine ? 2.6 : 2.2);
      const footGeo = new THREE.CylinderGeometry(rTube * 1.5, rFoot, 0.024, 16);
      footGeo.translate(rootX, 0.012, rootZ);
      const footMesh = new THREE.Mesh(footGeo, supportMat);
      supportGroup.add(footMesh);

      const footEdges = new THREE.EdgesGeometry(footGeo);
      const footWire = new THREE.LineSegments(footEdges, wireMat);
      supportGroup.add(footWire);

      // A2. Triangular Gusset Ribs (Gân tăng cứng cơ học chống lật & uốn)
      if (strength === 'heavy' || strength === 'standard') {
        const numGussets = strength === 'heavy' ? (anchor.isHighSpine ? 4 : 3) : 2;
        const gussetH = Math.min(colHeight * 0.42, 0.45);
        const gussetW = rFoot * (anchor.isHighSpine ? 1.45 : 1.25);

        for (let g = 0; g < numGussets; g++) {
          const ang = (g * Math.PI * 2) / numGussets;
          const cos = Math.cos(ang);
          const sin = Math.sin(ang);

          const ribGeo = new THREE.BufferGeometry();
          const ribVerts = new Float32Array([
            rootX, gussetH, rootZ,
            rootX + cos * (rFoot + gussetW), 0.01, rootZ + sin * (rFoot + gussetW),
            rootX + cos * (rTube * 1.2), 0.01, rootZ + sin * (rTube * 1.2),
          ]);
          ribGeo.setAttribute('position', new THREE.BufferAttribute(ribVerts, 3));
          ribGeo.computeVertexNormals();
          const ribMesh = new THREE.Mesh(ribGeo, supportMat);
          supportGroup.add(ribMesh);

          const ribEdges = new THREE.EdgesGeometry(ribGeo);
          const ribWire = new THREE.LineSegments(ribEdges, wireMat);
          supportGroup.add(ribWire);
        }
      }

      // B. Smooth Catmull-Rom Organic Curved Spline
      const p0 = new THREE.Vector3(rootX, 0.01, rootZ);
      const p1 = new THREE.Vector3(
        rootX * 0.75 + anchor.x * 0.25,
        colHeight * 0.32,
        rootZ * 0.75 + anchor.z * 0.25
      );
      const p2 = new THREE.Vector3(
        rootX * 0.25 + anchor.x * 0.75 - anchor.nx * 0.04,
        colHeight * 0.72,
        rootZ * 0.25 + anchor.z * 0.75 - anchor.nz * 0.04
      );
      // Contact position: exactly at the underside of the model
      const p3 = new THREE.Vector3(anchor.x, colHeight - 0.012, anchor.z);

      const spline = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
      const tubeGeo = new THREE.TubeGeometry(spline, 28, rTube, 12, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, supportMat);
      supportGroup.add(tubeMesh);

      const tubeEdges = new THREE.EdgesGeometry(tubeGeo, 24);
      const tubeWire = new THREE.LineSegments(tubeEdges, wireMat);
      supportGroup.add(tubeWire);

      // C. Reinforced Bamboo Node Ring Collars (Đốt trợ lực chống uốn dọc)
      const nodeTValues = colHeight > 0.85 ? [0.24, 0.52, 0.78] : [0.38, 0.68];
      nodeTValues.forEach((tVal) => {
        const pt = spline.getPoint(tVal);
        const tan = spline.getTangent(tVal);
        const nodeGeo = new THREE.CylinderGeometry(rTube * 1.35, rTube * 1.35, 0.024, 14);
        const nodeQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
        nodeGeo.applyQuaternion(nodeQuat);
        nodeGeo.translate(pt.x, pt.y, pt.z);
        const nodeMesh = new THREE.Mesh(nodeGeo, supportMat);
        supportGroup.add(nodeMesh);
      });

      // D. Contoured Saddle / Cradle Interface Pad (Bệ đệm tiếp xúc ôm sát lòng cung)
      const cradleRadius = Math.max(0.09, rTube * 1.9);
      const cradleGeo = new THREE.CylinderGeometry(cradleRadius, cradleRadius * 0.85, 0.026, 16);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3(anchor.nx, anchor.ny, anchor.nz).normalize();
      const cradleDir = normal.clone().negate();
      const cradleQuat = new THREE.Quaternion().setFromUnitVectors(up, cradleDir);
      cradleGeo.applyQuaternion(cradleQuat);
      cradleGeo.translate(anchor.x, colHeight - 0.006, anchor.z);

      const cradleMesh = new THREE.Mesh(cradleGeo, interfaceMat);
      supportGroup.add(cradleMesh);

      const cradleEdges = new THREE.EdgesGeometry(cradleGeo);
      const cradleWire = new THREE.LineSegments(cradleEdges, interfaceWireMat);
      supportGroup.add(cradleWire);
    } else {
      // --- HEAVY LATTICE GRID SCAFFOLDING SUPPORT ---
      const towerWidth = rTube * 2.3;
      const boxColGeo = new THREE.BoxGeometry(towerWidth, colHeight, towerWidth);
      boxColGeo.translate(anchor.x, colHeight / 2, anchor.z);
      const boxMesh = new THREE.Mesh(boxColGeo, supportMat);
      supportGroup.add(boxMesh);

      const boxEdges = new THREE.EdgesGeometry(boxColGeo);
      const boxWire = new THREE.LineSegments(boxEdges, wireMat);
      supportGroup.add(boxWire);

      // Scaffolding diagonal cross-trusses (X-bracing)
      const trussPoints: THREE.Vector3[] = [];
      const numTiers = Math.max(2, Math.round(colHeight / 0.3));
      const tierH = colHeight / numTiers;
      const hw = towerWidth / 2;

      for (let t = 0; t < numTiers; t++) {
        const y0 = t * tierH;
        const y1 = (t + 1) * tierH;
        trussPoints.push(
          new THREE.Vector3(anchor.x - hw, y0, anchor.z + hw),
          new THREE.Vector3(anchor.x + hw, y1, anchor.z + hw)
        );
        trussPoints.push(
          new THREE.Vector3(anchor.x + hw, y0, anchor.z + hw),
          new THREE.Vector3(anchor.x - hw, y1, anchor.z + hw)
        );
      }
      const trussGeo = new THREE.BufferGeometry().setFromPoints(trussPoints);
      const trussWire = new THREE.LineSegments(trussGeo, wireMat);
      supportGroup.add(trussWire);

      // Top interface plate
      const topPlateGeo = new THREE.BoxGeometry(towerWidth * 1.35, 0.024, towerWidth * 1.35);
      topPlateGeo.translate(anchor.x, colHeight - 0.006, anchor.z);
      const topPlateMesh = new THREE.Mesh(topPlateGeo, interfaceMat);
      supportGroup.add(topPlateMesh);
    }
  });

  // 3. BED ADHESION PLATFORM: RAFT vs BRIM vs SKIRT
  if (adhesion === 'raft') {
    // --- SOLID MULTI-LAYER RAFT PLATFORM (Bè in nguyên khối chống lật) ---
    const raftW = Math.max(size.x * 1.25, 2.3);
    const raftD = Math.max(size.z * 1.38, 2.3);
    const raftH = 0.038; // ~1.9mm

    const raftGeo = new THREE.BoxGeometry(raftW, raftH, raftD);
    raftGeo.translate(0, raftH / 2, 0);
    const raftMat = new THREE.MeshStandardMaterial({
      color: 0x2d3b30, // Deep Basalt-Moss (Earthy Raft)
      roughness: 0.5,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
    });
    const raftMesh = new THREE.Mesh(raftGeo, raftMat);
    supportGroup.add(raftMesh);

    // Glowing Cyan Chamfered Border
    const raftEdges = new THREE.EdgesGeometry(raftGeo);
    const raftWire = new THREE.LineSegments(raftEdges, new THREE.LineBasicMaterial({
      color: 0xe2dfd7,
      transparent: true,
      opacity: 0.85,
    }));
    supportGroup.add(raftWire);

    // Cross-Hatch Toolpath lines on Raft Top surface
    const raftInfillPts: THREE.Vector3[] = [];
    const stepX = raftW / 20;
    const stepZ = raftD / 20;
    for (let x = -raftW / 2 + stepX; x < raftW / 2; x += stepX * 2) {
      raftInfillPts.push(new THREE.Vector3(x, raftH + 0.002, -raftD / 2), new THREE.Vector3(x, raftH + 0.002, raftD / 2));
    }
    for (let z = -raftD / 2 + stepZ; z < raftD / 2; z += stepZ * 2) {
      raftInfillPts.push(new THREE.Vector3(-raftW / 2, raftH + 0.002, z), new THREE.Vector3(raftW / 2, raftH + 0.002, z));
    }
    const raftInfillGeo = new THREE.BufferGeometry().setFromPoints(raftInfillPts);
    const raftInfillLines = new THREE.LineSegments(raftInfillGeo, new THREE.LineBasicMaterial({
      color: 0x4a5d4e, // Wabi-Sabi Moss Green
      transparent: true,
      opacity: 0.5,
    }));
    supportGroup.add(raftInfillLines);
  } else if (adhesion === 'brim') {
    // --- CONCENTRIC BRIM RINGS (Vành bám sàn đa lớp) ---
    const brimPoints: THREE.Vector3[] = [];
    const brimLoops = 6;
    const baseRadiusX = halfX * 0.9;
    const baseRadiusZ = halfZ * 0.9;

    for (let l = 1; l <= brimLoops; l++) {
      const rx = baseRadiusX + l * 0.06;
      const rz = baseRadiusZ + l * 0.06;
      const segs = 40;
      for (let s = 0; s <= segs; s++) {
        const theta = (s / segs) * Math.PI * 2;
        brimPoints.push(new THREE.Vector3(Math.cos(theta) * rx, 0.002, Math.sin(theta) * rz));
      }
    }

    rootPositions.forEach((rp) => {
      for (let l = 1; l <= 3; l++) {
        const rRad = 0.14 + l * 0.05;
        const rSegs = 18;
        for (let s = 0; s <= rSegs; s++) {
          const theta = (s / rSegs) * Math.PI * 2;
          brimPoints.push(
            new THREE.Vector3(rp.x + Math.cos(theta) * rRad, 0.002, rp.z + Math.sin(theta) * rRad)
          );
        }
      }
    });

    const brimGeo = new THREE.BufferGeometry().setFromPoints(brimPoints);
    const brimMat = new THREE.LineBasicMaterial({
      color: 0x4a5d4e, // Wabi-Sabi Moss Green
      transparent: true,
      opacity: 0.7,
    });
    const brimLine = new THREE.Line(brimGeo, brimMat);
    supportGroup.add(brimLine);
  } else if (adhesion === 'skirt') {
    // --- SKIRT (2 Vòng mồi ngoài xa) ---
    const skirtPoints: THREE.Vector3[] = [];
    const skirtLoops = 2;
    const skirtRadX = halfX * 1.25;
    const skirtRadZ = halfZ * 1.25;

    for (let l = 1; l <= skirtLoops; l++) {
      const rx = skirtRadX + l * 0.05;
      const rz = skirtRadZ + l * 0.05;
      const segs = 40;
      for (let s = 0; s <= segs; s++) {
        const theta = (s / segs) * Math.PI * 2;
        skirtPoints.push(new THREE.Vector3(Math.cos(theta) * rx, 0.002, Math.sin(theta) * rz));
      }
    }
    const skirtGeo = new THREE.BufferGeometry().setFromPoints(skirtPoints);
    const skirtLine = new THREE.Line(skirtGeo, new THREE.LineBasicMaterial({
      color: 0x8c8881, // River Stone
      transparent: true,
      opacity: 0.5,
    }));
    supportGroup.add(skirtLine);
  }

  return supportGroup;
}

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
    color: 0x4a5d4e, // Moss Green
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
    color: 0xe2dfd7, // Sand White
    transparent: true,
    opacity: 0.95,
  });
  const bracketsMesh = new THREE.LineSegments(bracketsGeo, bracketsMat);
  cageGroup.add(bracketsMesh);

  // 3. 8 Glowing corner dots
  const dotsGeo = new THREE.BufferGeometry().setFromPoints(vertexPoints);
  const dotsMat = new THREE.PointsMaterial({
    color: 0x8c8881,
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
    color: 0x4a5d4e,
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
  onModelMetricsCalculated,
  customFaceCountDisplay,
  activeModelFiles,
  activeModelFileType = 'glb',
  isSlicingActive = false,
  onToggleSlicing,
  slicingProgress = 100,
  onSlicingProgressChange,
  layerHeightMm = 0.2,
  isSimulatingPrint = false,
  onToggleSimulatingPrint,
  dimensionsYMm = 113,
  isSupportActive = false,
  onToggleSupport,
  supportType = 'tree',
  supportStrength = 'heavy',
  adhesionType = 'raft',
  hasBrim = true,
}: Studio3DViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const loadedModelRef = useRef<THREE.Object3D | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);
  const boundingBoxHelperRef = useRef<THREE.Group | null>(null);
  const baseHeightRef = useRef<number>(2.26);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 100));
  const laserPlaneRef = useRef<THREE.Group | null>(null);
  const supportHelperRef = useRef<THREE.Group | null>(null);
  const overhangAnchorsRef = useRef<OverhangAnchor[]>([]);

  const totalLayers = Math.max(1, Math.round(dimensionsYMm / (layerHeightMm || 0.2)));
  const currentLayer = Math.min(totalLayers, Math.max(1, Math.round(((slicingProgress ?? 100) / 100) * totalLayers)));
  const currentHeightMm = parseFloat((((slicingProgress ?? 100) / 100) * dimensionsYMm).toFixed(1));

  const [shadingMode, setShadingMode] = useState<ShadingMode>('pbr');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animatingCamera, setAnimatingCamera] = useState(false);
  const [activeView, setActiveView] = useState<'front' | 'right' | 'top' | 'bottom' | 'iso' | null>('iso');
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const isAutoRotateRef = useRef(true);
  isAutoRotateRef.current = isAutoRotate;
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

  // 1. Initialize Three.js Scene, Camera, Renderer, Lighting & OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;
    scene.fog = null;

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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // PMREMGenerator & RoomEnvironment for realistic PBR reflections & lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTexture;
    if ('environmentIntensity' in scene) {
      (scene as any).environmentIntensity = 1.2;
    }

    // OrbitControls (Blender / Unity Style)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
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

    // Lighting (Professional Studio Balanced Setup - Color & PBR True)
    // 1. Ambient Light (Balanced Studio White)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // 2. Hemisphere Light (Soft Sky / Ground bounce)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // 3. Front Key Directional Light
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.3);
    frontLight.position.set(6, 10, 7.5);
    frontLight.castShadow = true;
    frontLight.shadow.mapSize.width = 1024;
    frontLight.shadow.mapSize.height = 1024;
    frontLight.shadow.bias = -0.0001;
    scene.add(frontLight);

    // 4. Back Fill Directional Light
    const backLight = new THREE.DirectionalLight(0xffffff, 0.9);
    backLight.position.set(-6, 8, -7.5);
    scene.add(backLight);

    // 5. Contact Shadow Ground Plane (Grounds the model cleanly on dark charcoal floor)
    const shadowFloorGeo = new THREE.PlaneGeometry(30, 30);
    const shadowFloorMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowFloor = new THREE.Mesh(shadowFloorGeo, shadowFloorMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -0.002;
    shadowFloor.receiveShadow = true;
    scene.add(shadowFloor);

    // Infinite Ground Grid (Light Wabi-Sabi / Charcoal: Trục đỏ nhạt #D98276, lưới xám ấm)
    const gridHelper = new THREE.GridHelper(30, 60, 0xD98276, 0x444440);
    gridHelper.position.y = -0.001;
    gridHelper.visible = groundGridEnabled || Boolean(isSlicingActive);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Major Axes indicators
    const axesGroup = new THREE.Group();
    // Red X axis line
    const xMat = new THREE.LineBasicMaterial({ color: 0xD98276, transparent: true, opacity: 0.8 });
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-15, 0, 0),
      new THREE.Vector3(15, 0, 0),
    ]);
    axesGroup.add(new THREE.Line(xGeo, xMat));

    // Warm stone Z axis line
    const zMat = new THREE.LineBasicMaterial({ color: 0x8C8881, transparent: true, opacity: 0.8 });
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -15),
      new THREE.Vector3(0, 0, 15),
    ]);
    axesGroup.add(new THREE.Line(zGeo, zMat));
    axesGroup.visible = groundGridEnabled || Boolean(isSlicingActive);
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

  // 2. Toggle Ground Grid visibility (Visible when user turns on Grid button or when Slicing is active)
  useEffect(() => {
    const isVisible = groundGridEnabled || Boolean(isSlicingActive);
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = isVisible;
    }
    if (axesGroupRef.current) {
      axesGroupRef.current.visible = isVisible;
    }
  }, [groundGridEnabled, isSlicingActive]);

  // 3. Dynamic 3D Mesh Generation & Topology Updates according to FaceCount and ShadingMode
  useEffect(() => {
    const meshGroup = meshGroupRef.current;
    const scene = sceneRef.current;
    if (!meshGroup || !scene) return;

    // Clear existing meshes, bounding box & laser slicing plane
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

    if (laserPlaneRef.current) {
      if (laserPlaneRef.current.parent) {
        laserPlaneRef.current.parent.remove(laserPlaneRef.current);
      }
      laserPlaneRef.current.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        const mat = (child as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      laserPlaneRef.current = null;
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
      // 1. Remove old bounding cage and laser plane before measuring base geometry
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

      if (laserPlaneRef.current) {
        if (laserPlaneRef.current.parent) {
          laserPlaneRef.current.parent.remove(laserPlaneRef.current);
        }
        laserPlaneRef.current.traverse((child) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          const mat = (child as THREE.Mesh).material;
          if (mat) {
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat.dispose();
          }
        });
        laserPlaneRef.current = null;
      }

      if (supportHelperRef.current) {
        if (supportHelperRef.current.parent) {
          supportHelperRef.current.parent.remove(supportHelperRef.current);
        }
        supportHelperRef.current.traverse((child) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          const mat = (child as THREE.Mesh).material;
          if (mat) {
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat.dispose();
          }
        });
        supportHelperRef.current = null;
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

      // 4. Create and attach glowing Laser Slicing Plane
      const laser = createLaserSlicingPlane(size);
      laser.visible = !!isSlicingActive;
      laser.position.set(0, ((slicingProgress ?? 100) / 100) * size.y, 0);
      targetGroup.add(laser);
      laserPlaneRef.current = laser;

      // 4b. Detect real overhangs and create 3D Printing Support Columns (Theo sát bề mặt hình học)
      const detectedAnchors = extractOverhangAnchors(targetGroup, size);
      overhangAnchorsRef.current = detectedAnchors;

      const support = create3DSupportStructure(
        size,
        supportType,
        adhesionType,
        supportStrength,
        detectedAnchors
      );
      support.visible = !!isSupportActive;
      targetGroup.add(support);
      supportHelperRef.current = support;

      // 5. Restore rotation and apply current meshScale
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
        // High-end Matte Warm Grey SLA 3D Print Resin
        mainMat = new THREE.MeshStandardMaterial({
          color: 0x8c8881,
          roughness: 0.45,
          metalness: 0.05,
          flatShading: faceCount === '50k',
        });
      } else if (shouldTexture) {
        // Vibrant Cyber iridescent material
        mainMat = new THREE.MeshPhysicalMaterial({
          color: 0x4a5d4e,
          emissive: 0x022c35,
          roughness: 0.2,
          metalness: 0.85,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          flatShading: faceCount === '50k',
        });
      } else {
        // Dark Clay / Cast Iron Tactile Wabi-Sabi CAD Look
        mainMat = new THREE.MeshStandardMaterial({
          color: 0x22221f,
          roughness: 0.5,
          metalness: 0.2,
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
        mainMesh.material = new THREE.MeshStandardMaterial({
          color: 0x1c1c1e,
          roughness: 0.9,
          metalness: 0.1,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0xd6cfc7,
          wireframe: true,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        });
        const wireMesh = new THREE.Mesh(geometry, wireMat);
        wireMesh.name = 'Wireframe_Overlay';
        mainMesh.add(wireMesh);
      } else if (shadingMode === 'solid-wire') {
        const wireMat = new THREE.MeshBasicMaterial({
          color: 0xd6cfc7,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        });
        const wireMesh = new THREE.Mesh(geometry, wireMat);
        wireMesh.name = 'Wireframe_Overlay';
        mainMesh.add(wireMesh);
      }

      // Add a floating glowing inner core at exact vertical center
      const coreGeo = new THREE.IcosahedronGeometry(0.38, currentSpecs.detail >= 4 ? 3 : 1);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xe2dfd7,
        wireframe: true,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.set(0, gSize.y / 2, 0);
      targetMeshGroup.add(coreMesh);
    };

    const clearMeshGroupChildren = (group: THREE.Group) => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        child.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = c as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            const mat = m.material;
            if (mat) {
              if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
              else (mat as THREE.Material).dispose();
            }
          }
        });
      }
    };

    // If there is an actual 3D model (GLB, GLTF, FBX, OBJ) from URL or local files, load it!
    const hasExternalModel = Boolean(activeModelGlbUrl || (activeModelFiles && activeModelFiles.length > 0));

    if (hasExternalModel) {
      clearMeshGroupChildren(meshGroup);
      setIsModelLoading(true);
      const cancelLoad = load3DModel({
        url: activeModelGlbUrl,
        files: activeModelFiles,
        fileType: activeModelFileType,
        onSuccess: (loadedModel) => {
          // Xóa bỏ mọi mesh cũ/procedural mesh (đảm bảo chỉ có duy nhất 1 model chính trong scene)
          clearMeshGroupChildren(meshGroup);
          loadedModelRef.current = loadedModel;
          loadedModel.name = 'ACTIVE_3D_MODEL';

          // 1. Setup original materials & textures (preserving sRGB colorSpace & PBR maps)
          setupOriginalMaterials(loadedModel);

          // 2. Compute accurate geometric metrics (faces, vertices, volume, surface area, dimensions)
          const metrics = computeAccurateModelMetrics(loadedModel);
          onModelMetricsCalculated?.(metrics);
          onBaseDimensionsCalculated?.(metrics.dimensions);

          // 3. Auto-center horizontally (X=0, Z=0) and place bottom at floor (Y=0), normalize scale
          autoCenterAndNormalizeModel(loadedModel);

          // 4. Default to PBR mode (Only volume + original textures, clean without wireframe)
          setShadingMode('pbr');
          applyShadingAndTexture(loadedModel, 'pbr', true);

          // 5. Add to meshGroup
          meshGroup.add(loadedModel);
          updateBoundingBoxAndDimensions(meshGroup);
          setIsModelLoading(false);
        },
        onError: (err) => {
          console.warn('Failed to load 3D file, falling back to procedural:', err);
          setIsModelLoading(false);
          clearMeshGroupChildren(meshGroup);
          loadedModelRef.current = null;
          buildProceduralGeometry(meshGroup);
          updateBoundingBoxAndDimensions(meshGroup);
        },
      });

      return () => {
        cancelLoad();
      };
    }

    // Otherwise, build procedural 3D Mesh reflecting Face Count
    clearMeshGroupChildren(meshGroup);
    loadedModelRef.current = null;
    buildProceduralGeometry(meshGroup);
    updateBoundingBoxAndDimensions(meshGroup);
  }, [faceCount, activeModelGlbUrl, activeModelFiles, activeModelFileType]);

  // Fast material / texture update when shadingMode or shouldTexture changes
  useEffect(() => {
    if (loadedModelRef.current) {
      applyShadingAndTexture(
        loadedModelRef.current,
        shadingMode,
        shouldTexture
      );
    }
  }, [shadingMode, shouldTexture]);

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

  // 3d. Sync Slicing clipping plane and laser plane
  useEffect(() => {
    const meshGroup = meshGroupRef.current;
    if (!meshGroup) return;

    const worldHeight = baseHeightRef.current * (meshScale.y || 1);
    const progress = Math.max(0, Math.min(100, slicingProgress ?? 100));
    // When slicing is active, cut height in world coordinates
    const yCut = Math.max(0.001, (progress / 100) * worldHeight);

    clipPlaneRef.current.constant = yCut;

    if (laserPlaneRef.current) {
      laserPlaneRef.current.visible = !!isSlicingActive;
      laserPlaneRef.current.position.y = (progress / 100) * baseHeightRef.current;
    }

    meshGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh || (child as THREE.LineSegments).isLineSegments) {
        if (
          isDescendantOf(child, 'CAD_Bounding_Cage') ||
          isDescendantOf(child, 'Laser_Slicing_Plane')
        ) {
          return;
        }
        const mat = (child as THREE.Mesh).material;
        if (mat) {
          const mats = Array.isArray(mat) ? mat : [mat];
          mats.forEach((m) => {
            m.clippingPlanes = isSlicingActive ? [clipPlaneRef.current] : [];
            m.clipShadows = true;
            m.needsUpdate = true;
          });
        }
      }
    });
  }, [isSlicingActive, slicingProgress, meshScale.y]);

  // 3e. Sync Support Structure visibility & type updates
  useEffect(() => {
    if (supportHelperRef.current) {
      supportHelperRef.current.visible = !!isSupportActive;
    }
  }, [isSupportActive]);

  useEffect(() => {
    const meshGroup = meshGroupRef.current;
    if (!meshGroup || !supportHelperRef.current) return;

    if (supportHelperRef.current.parent) {
      supportHelperRef.current.parent.remove(supportHelperRef.current);
    }
    supportHelperRef.current.traverse((child) => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      const mat = (child as THREE.Mesh).material;
      if (mat) {
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });

    const H = baseHeightRef.current || 2.26;
    const size = new THREE.Vector3(H * 1.05, H, H * 1.05);
    const anchors =
      overhangAnchorsRef.current.length > 0
        ? overhangAnchorsRef.current
        : extractOverhangAnchors(meshGroup, size);
    const newSupport = create3DSupportStructure(
      size,
      supportType,
      adhesionType,
      supportStrength,
      anchors
    );
    newSupport.visible = !!isSupportActive;

    if (isSlicingActive && newSupport) {
      newSupport.traverse((child) => {
        if ((child as THREE.Mesh).isMesh || (child as THREE.LineSegments).isLineSegments) {
          const mat = (child as THREE.Mesh).material;
          if (mat) {
            const mats = Array.isArray(mat) ? mat : [mat];
            mats.forEach((m) => {
              m.clippingPlanes = [clipPlaneRef.current];
              m.clipShadows = true;
              m.needsUpdate = true;
            });
          }
        }
      });
    }

    meshGroup.add(newSupport);
    supportHelperRef.current = newSupport;
  }, [supportType, supportStrength, adhesionType, hasBrim]);

  // 4. Smooth Camera Angle Setter (Blender Gizmo Orbit Navigation around Fixed Target)
  const setCameraView = useCallback(
    (view: 'iso' | 'front' | 'top' | 'right' | 'left' | 'back' | 'bottom') => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls || animatingCamera) return;

      if (['iso', 'front', 'right', 'top', 'bottom'].includes(view)) {
        setActiveView(view as 'iso' | 'front' | 'right' | 'top' | 'bottom');
      }

      // Tạm tắt auto-rotate khi người dùng chọn góc nhìn
      setIsAutoRotate(false);

      const modelCenterY = (baseHeightRef.current * (meshScale.y || 1)) / 2 || 1.1;
      const target = controls.target.clone();
      if (Math.abs(target.y - modelCenterY) > 2.0 || target.lengthSq() < 0.0001) {
        target.set(0, modelCenterY, 0);
      }

      const dist = Math.max(2.0, camera.position.distanceTo(target));

      let targetPos = new THREE.Vector3();
      switch (view) {
        case 'front': // Trục Z: Nhìn chính diện
          targetPos.set(target.x, target.y, target.z + dist);
          break;
        case 'back': // Trục -Z: Nhìn phía sau
          targetPos.set(target.x, target.y, target.z - dist);
          break;
        case 'right': // Trục X: Nhìn bên phải
          targetPos.set(target.x + dist, target.y, target.z);
          break;
        case 'left': // Trục -X: Nhìn bên trái
          targetPos.set(target.x - dist, target.y, target.z);
          break;
        case 'top': // Trục Y: Nhìn từ trên xuống (thêm 0.01 ở Z tránh Gimbal Lock)
          targetPos.set(target.x, target.y + dist, target.z + 0.01);
          break;
        case 'bottom': // Nhìn từ dưới lên
          targetPos.set(target.x, target.y - dist, target.z + 0.01);
          break;
        case 'iso':
        default:
          targetPos.set(target.x + dist * 0.65, target.y + dist * 0.5, target.z + dist * 0.65);
          break;
      }

      const startOffset = camera.position.clone().sub(target);
      const targetOffset = targetPos.clone().sub(target);

      const startSpherical = new THREE.Spherical().setFromVector3(startOffset);
      const endSpherical = new THREE.Spherical().setFromVector3(targetOffset);

      // Shortest angle wrap-around for theta
      let deltaTheta = endSpherical.theta - startSpherical.theta;
      while (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
      while (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;

      const deltaPhi = endSpherical.phi - startSpherical.phi;
      const startRadius = startSpherical.radius;
      const deltaRadius = endSpherical.radius - startRadius;

      const startTarget = controls.target.clone();
      const finalTarget = target.clone();

      setAnimatingCamera(true);
      const startTime = performance.now();
      const duration = 400; // 400ms chuẩn

      const step = (now: number) => {
        const elapsed = now - startTime;
        const rawT = Math.min(1, elapsed / duration);
        const t = 1 - Math.pow(1 - rawT, 3); // easeOutCubic

        const currentSpherical = new THREE.Spherical(
          startRadius + deltaRadius * t,
          startSpherical.phi + deltaPhi * t,
          startSpherical.theta + deltaTheta * t
        );
        currentSpherical.makeSafe();

        const currentTarget = new THREE.Vector3().lerpVectors(startTarget, finalTarget, t);
        camera.position.setFromSpherical(currentSpherical).add(currentTarget);
        controls.target.copy(currentTarget);
        controls.update();

        if (rawT < 1) {
          requestAnimationFrame(step);
        } else {
          camera.position.copy(targetPos);
          controls.target.copy(finalTarget);
          controls.update();
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

    // Tạm tắt auto-rotate khi căn giữa
    setIsAutoRotate(false);

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
    const duration = 400; // 400ms

    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / duration);
      const t = 1 - Math.pow(1 - rawT, 3); // easeOutCubic

      camera.position.lerpVectors(startPos, targetPos, t);
      controls.target.lerpVectors(startTarget, center, t);
      controls.update();

      if (rawT < 1) {
        requestAnimationFrame(step);
      } else {
        camera.position.copy(targetPos);
        controls.target.copy(center);
        controls.update();
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
    const laserPlane = laserPlaneRef.current;
    const supportHelper = supportHelperRef.current;

    const prevGrid = gridHelper ? gridHelper.visible : false;
    const prevAxes = axesGroup ? axesGroup.visible : false;
    const prevBox = boxHelper ? boxHelper.visible : false;
    const prevLaser = laserPlane ? laserPlane.visible : false;
    const prevSupport = supportHelper ? supportHelper.visible : false;

    if (gridHelper) gridHelper.visible = false;
    if (axesGroup) axesGroup.visible = false;
    if (boxHelper) boxHelper.visible = false;
    if (laserPlane) laserPlane.visible = false;
    if (supportHelper) supportHelper.visible = false;

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
    if (laserPlane) laserPlane.visible = prevLaser;
    if (supportHelper) supportHelper.visible = prevSupport;
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
        setShadingMode((prev) => {
          if (prev === 'pbr' || prev === 'solid' || prev === 'solid-wire') return 'wireframe';
          if (prev === 'wireframe') return 'clay';
          return 'pbr';
        });
      } else if (key === 'r') {
        e.preventDefault();
        setIsAutoRotate((prev) => !prev);
      } else if (key === 's') {
        e.preventDefault();
        onToggleSlicing?.();
      } else if (key === 'arrowup' && isSlicingActive) {
        e.preventDefault();
        onSlicingProgressChange?.(Math.min(100, (slicingProgress ?? 100) + 100 / totalLayers));
      } else if (key === 'arrowdown' && isSlicingActive) {
        e.preventDefault();
        onSlicingProgressChange?.(Math.max(0, (slicingProgress ?? 100) - 100 / totalLayers));
      } else if (key === 'g') {
        e.preventDefault();
        onToggleGroundGrid();
      } else if (key === 'b') {
        e.preventDefault();
        onToggleBoundingBox?.();
      } else if (key === 'p') {
        e.preventDefault();
        takeTransparentSnapshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setCameraView,
    focusModel,
    onToggleGroundGrid,
    onToggleBoundingBox,
    takeTransparentSnapshot,
    onToggleSlicing,
    isSlicingActive,
    slicingProgress,
    totalLayers,
    onSlicingProgressChange,
  ]);

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
    <div className="relative w-full h-full overflow-hidden select-none bg-[radial-gradient(circle_at_50%_40%,_#2e2e2e_0%,_#1c1c1c_75%,_#141414_100%)]">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* FLOATING VERTICAL 3D SLICER HUD (Cura / Bambu Studio Style) */}
      {isSlicingActive && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 bg-[#22221F]/95 backdrop-blur-2xl border border-[#33322E] rounded-2xl p-2.5 shadow-2xl shadow-black/60 transition-all duration-300 pointer-events-auto ${
            isRightPanelOpen ? 'right-4 sm:right-[305px]' : 'right-4'
          }`}
        >
          {/* Header Icon & Close button */}
          <div className="flex items-center justify-between w-full pb-1.5 border-b border-[#33322E] gap-1.5">
            <span className="text-[10px] font-bold text-[#E2DFD7] font-mono tabular-nums flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#4A5D4E]" />
              <span>LÁT CẮT</span>
            </span>
            <button
              onClick={onToggleSlicing}
              className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng chế độ cắt lớp (Phím S)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time-lapse 3D Print Simulation Play / Pause Button */}
          <button
            onClick={onToggleSimulatingPrint}
            className={`w-full py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isSimulatingPrint
                ? 'bg-[#4A5D4E] border-[#33322E] text-[#E2DFD7] shadow-sm'
                : 'bg-[#4A5D4E]/20 border-[#33322E] text-[#E2DFD7] hover:bg-[#4A5D4E] shadow-sm'
            }`}
            title={isSimulatingPrint ? 'Tạm dừng mô phỏng in 3D' : 'Bắt đầu mô phỏng in 3D từ đáy lên (Time-lapse)'}
          >
            {isSimulatingPrint ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulatingPrint ? 'Dừng in' : 'Mô phỏng'}</span>
          </button>

          {/* Step Up (+1 Layer) */}
          <button
            onClick={() => onSlicingProgressChange?.(Math.min(100, (slicingProgress ?? 100) + 100 / totalLayers))}
            className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-[#E2DFD7] transition-colors cursor-pointer"
            title="Tăng 1 lớp (+1 Layer / Phím Mũi tên lên)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Vertical Slider Track */}
          <div className="relative h-44 w-7 flex items-center justify-center my-0.5">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={slicingProgress ?? 100}
              onChange={(e) => onSlicingProgressChange?.(parseFloat(e.target.value))}
              className="h-40 w-2.5 accent-[#4A5D4E] cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
              style={{ transform: 'rotate(180deg)' }}
              title={`Lớp cắt: ${currentLayer} / ${totalLayers} (${currentHeightMm} mm)`}
            />
          </div>

          {/* Step Down (-1 Layer) */}
          <button
            onClick={() => onSlicingProgressChange?.(Math.max(0, (slicingProgress ?? 100) - 100 / totalLayers))}
            className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-[#E2DFD7] transition-colors cursor-pointer"
            title="Giảm 1 lớp (-1 Layer / Phím Mũi tên xuống)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Mini Telemetry Display */}
          <div className="w-full flex flex-col items-center border-t border-[#33322E] pt-1.5 text-[9.5px] font-mono tabular-nums text-center leading-tight">
            <span className="font-bold text-white text-[11px]">{currentLayer}</span>
            <span className="text-zinc-500 text-[8.5px]">/{totalLayers}</span>
            <span className="text-[#E2DFD7] font-bold mt-1 text-[9.5px]">{currentHeightMm} mm</span>
            <span className="text-[#4A5D4E] text-[8.5px] mt-0.5 font-mono tabular-nums font-medium">{Math.round(slicingProgress ?? 100)}%</span>
          </div>

          {/* 3D Printing Support Column Status & Overhang Alert */}
          <div className="w-full pt-1.5 border-t border-[#33322E] flex flex-col gap-1">
            <button
              onClick={onToggleSupport}
              className={`w-full py-1 px-1.5 rounded-lg border text-[9px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isSupportActive
                  ? 'bg-[#4A5D4E]/20 border-[#4A5D4E]/40 text-[#E2DFD7]'
                  : 'bg-white/5 border-[#33322E] text-zinc-400 hover:text-white'
              }`}
              title={isSupportActive ? 'Đang bật Cột đỡ Support (Nhấn để tắt)' : 'Đang tắt Cột đỡ Support (Nhấn để bật)'}
            >
              <ShieldCheck className="w-3 h-3 text-[#4A5D4E]" />
              <span>{isSupportActive ? 'Cột đỡ: BẬT' : 'Cột đỡ: TẮT'}</span>
            </button>

            {/* Overhang / Floating Island Warning when Support is OFF */}
            {!isSupportActive && (slicingProgress ?? 100) > 8 && (slicingProgress ?? 100) < 52 ? (
              <div className="w-full bg-[#A85448]/20 border border-[#A85448]/40 rounded-lg p-1 text-[7.5px] text-[#E2DFD7] leading-tight text-center flex items-center justify-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-[#A85448]" />
                <span>Rơi nhựa trên không!</span>
              </div>
            ) : isSupportActive ? (
              <div className="w-full bg-[#22221F] border border-[#4A5D4E]/40 rounded-lg p-0.5 text-[7.5px] text-[#4A5D4E] leading-tight text-center font-mono tabular-nums">
                {adhesionType === 'raft' ? '✓ Bè Raft: Vững 98%' : '✓ Có điểm tựa Tree Support'}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TOP-CENTER STUDIO VIEWPORT TOOLBAR (Blender / Unity Style) */}
      <div
        className={`absolute top-3.5 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 pointer-events-auto max-w-[calc(100vw-40px)] ${
          isLeftPanelOpen ? 'sm:ml-16' : ''
        } ${isRightPanelOpen ? 'sm:-mr-16' : ''}`}
      >
        <div className="bg-[#FFFFFF]/90 backdrop-blur-md border border-[#E2D9D0] rounded-2xl p-1.5 shadow-sm flex items-center gap-1.5 text-xs text-[#231F1E] overflow-x-auto no-scrollbar whitespace-nowrap">
          {/* Shading Mode Selector with Smooth Motion Indicator */}
          <div className="relative flex items-center bg-[#F6F3EE] p-0.5 rounded-lg border border-[#E2D9D0] shrink-0">
            {(
              [
                { id: 'pbr', label: 'Lưới + Khối', title: 'PBR Chuẩn: Khối + Texture gốc (Phím Z)' },
                { id: 'wireframe', label: 'Wireframe', title: 'Chỉ khung dây (Phím Z)' },
                { id: 'clay', label: 'In 3D SLA', title: 'Chế độ in 3D Nhựa Resin SLA / Clay (Phím Z)' },
              ] as const
            ).map((mode) => {
              const isActive =
                (mode.id === 'pbr' && (shadingMode === 'pbr' || shadingMode === 'solid' || shadingMode === 'solid-wire')) ||
                (mode.id === 'wireframe' && shadingMode === 'wireframe') ||
                (mode.id === 'clay' && (shadingMode === 'clay' || shadingMode === 'sla-resin'));
              return (
                <button
                  key={mode.id}
                  onClick={() => setShadingMode(mode.id)}
                  className={`relative px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer select-none ${isActive ? 'text-white font-semibold' : 'text-[#7A706C] hover:text-[#231F1E]'
                    }`}
                  title={mode.title}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeShadingBadge"
                      className="absolute inset-0 rounded-md bg-[#B83B2A] border border-[#B83B2A] shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{mode.label}</span>
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-[#E2D9D0] mx-0.5 shrink-0" />

          {/* Ground Grid Switch */}
          <button
            onClick={onToggleGroundGrid}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${groundGridEnabled
                ? 'bg-[#FDF2F0] border-[#B83B2A] text-[#B83B2A] font-semibold'
                : 'bg-[#F6F3EE] border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E]'
              }`}
            title={groundGridEnabled ? 'Tắt lưới sàn 3D (Phím G)' : 'Bật lưới sàn 3D (Phím G)'}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium hidden md:inline">Lưới</span>
          </button>

          {/* Turntable Auto-Rotate Switch */}
          <button
            onClick={() => setIsAutoRotate((prev) => !prev)}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${isAutoRotate
                ? 'bg-[#FDF2F0] border-[#B83B2A] text-[#B83B2A]'
                : 'bg-[#F6F3EE] border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E]'
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
            className="p-1.5 rounded-lg bg-[#F6F3EE] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Căn giữa & Phóng to mô hình (Phím F hoặc Space)"
          >
            <Focus className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium hidden xl:inline">Căn giữa</span>
          </button>

          <div className="w-[1px] h-4 bg-[#E2D9D0] mx-0.5 shrink-0" />

          {/* High-Res Transparent PNG Snapshot Button */}
          <button
            onClick={takeTransparentSnapshot}
            className="px-2.5 py-1.5 rounded-lg bg-[#B83B2A] hover:bg-[#9E2F20] border border-[#B83B2A] text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
            title="Chụp ảnh Render PNG trong suốt chất lượng cao (Phím P)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-semibold hidden sm:inline">Chụp Render</span>
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
            className="p-1.5 rounded-lg bg-[#F6F3EE] hover:bg-[#EFEAE2] border border-[#E2D9D0] text-[#7A706C] hover:text-[#231F1E] transition-all cursor-pointer shrink-0"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* TOP-RIGHT BLENDER / UNITY 3D GIZMO & QUICK VIEW BAR (Positioned below top toolbar to prevent collision) */}
      <div
        className={`absolute top-[68px] z-20 flex flex-col items-end gap-2 transition-all duration-300 pointer-events-auto ${isRightPanelOpen ? 'right-4 sm:right-[305px]' : 'right-4'
          }`}
      >
        {/* Interactive 3-Axis Orientation Gizmo Box */}
        <div className="bg-[#FFFFFF]/90 backdrop-blur-md border border-[#E2D9D0] rounded-2xl p-2 shadow-sm flex flex-col items-center gap-1.5 text-[#231F1E]">
          {/* Circular Orientation Widget */}
          <div className="relative w-13 h-13 rounded-full bg-[#F6F3EE] border border-[#E2D9D0] flex items-center justify-center">
            {/* Center Isometric Snap Button */}
            <button
              onClick={() => setCameraView('iso')}
              className="w-3.5 h-3.5 rounded-full bg-[#231F1E]/15 hover:bg-[#B83B2A] text-white flex items-center justify-center transition-all hover:scale-125 z-10 cursor-pointer"
              title="Đặt lại góc nhìn Isometric"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </button>

            {/* X Axis Button (Right / Red) */}
            <button
              onClick={() => setCameraView('right')}
              className="absolute right-0.5 w-4 h-4 rounded-full bg-[#B83B2A] hover:brightness-110 text-[8px] font-bold text-white flex items-center justify-center shadow-none hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn bên phải (Trục X)"
            >
              X
            </button>

            {/* Z Axis Button (Bottom / Warm Stone) */}
            <button
              onClick={() => setCameraView('bottom')}
              className="absolute bottom-0.5 w-4 h-4 rounded-full bg-[#7A706C] hover:brightness-110 text-[8px] font-bold text-white flex items-center justify-center shadow-none hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn từ dưới lên (Trục Z - Nhìn mặt đáy)"
            >
              Z
            </button>

            {/* Y Axis Button (Top / Vermilion Soft) */}
            <button
              onClick={() => setCameraView('top')}
              className="absolute top-0.5 w-4 h-4 rounded-full bg-[#D98276] hover:brightness-110 text-[8px] font-bold text-white flex items-center justify-center shadow-none hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn từ trên xuống (Trục Y)"
            >
              Y
            </button>

            {/* Left Button (-X) */}
            <button
              onClick={() => setCameraView('left')}
              className="absolute left-0.5 w-2.5 h-2.5 rounded-full bg-[#231F1E]/15 hover:bg-[#B83B2A] hover:scale-125 transition-all cursor-pointer"
              title="Góc nhìn bên trái (-X)"
            />
          </div>

          {/* Quick View Snap Buttons (Blender Numpad Standard) with Smooth Motion Indicator */}
          <div className="relative flex items-center p-0.5 rounded-lg bg-[#F6F3EE] border border-[#E2D9D0] text-[9.5px] font-mono tabular-nums">
            {QUICK_VIEWS.map((v) => {
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setCameraView(v.id)}
                  className={`relative px-1.5 py-0.5 rounded-md transition-colors cursor-pointer select-none ${isActive ? 'text-white font-semibold' : 'text-[#7A706C] hover:text-[#231F1E]'
                    }`}
                  title={v.title}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCameraViewBadge"
                      className="absolute inset-0 rounded-md bg-[#B83B2A] border border-[#B83B2A] shadow-none"
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

      {/* FLOATING PILL TOOLBAR: AUTO-ROTATE & 4 SHADING MODES (PBR, CLAY, WIREFRAME, NORMAL) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 pointer-events-auto ${
          isLeftPanelOpen ? 'sm:ml-28' : ''
        } ${isRightPanelOpen ? 'sm:-mr-24' : ''}`}
      >
        <div className="bg-[#1C1C1C]/92 backdrop-blur-xl border border-white/10 rounded-full px-3.5 py-1.5 shadow-2xl flex items-center gap-2.5 text-white">
          {/* Auto Rotate Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              isAutoRotate
                ? 'bg-[#B83B2A] text-white shadow-sm'
                : 'text-[#8C8881] hover:text-[#E2DFD7] hover:bg-white/10'
            }`}
            title={isAutoRotate ? 'Tắt tự xoay (Phím R)' : 'Bật tự xoay (Phím R)'}
          >
            <RotateCcw className={`w-3.5 h-3.5 transition-transform ${isAutoRotate ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
          </button>

          <div className="w-[1px] h-4 bg-white/15" />

          {/* 4 Shading Spheres */}
          <div className="flex items-center gap-2">
            {/* 1. PBR Textured */}
            <button
              type="button"
              onClick={() => setShadingMode('pbr')}
              className={`relative w-6 h-6 rounded-full transition-all cursor-pointer p-0.5 border ${
                shadingMode === 'pbr' || shadingMode === 'solid'
                  ? 'border-[#B83B2A] ring-2 ring-[#B83B2A]/40 scale-110 shadow-sm'
                  : 'border-white/20 hover:border-white/50 opacity-80 hover:opacity-100'
              }`}
              title="PBR Textured: 100% màu sắc, độ bóng kim loại và texture gốc"
            >
              <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_35%_35%,_#4ecdc4_0%,_#1a535c_60%,_#0b252a_100%)] shadow-inner" />
            </button>

            {/* 2. Clay / MatCap */}
            <button
              type="button"
              onClick={() => setShadingMode('clay')}
              className={`relative w-6 h-6 rounded-full transition-all cursor-pointer p-0.5 border ${
                shadingMode === 'clay' || shadingMode === 'sla-resin'
                  ? 'border-[#B83B2A] ring-2 ring-[#B83B2A]/40 scale-110 shadow-sm'
                  : 'border-white/20 hover:border-white/50 opacity-80 hover:opacity-100'
              }`}
              title="Clay / MatCap: Đất sét trắng xám mịn (#D4CFC7) soi chi tiết khối điêu khắc"
            >
              <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_35%_35%,_#ffffff_0%,_#d4cfc7_55%,_#8c8881_100%)] shadow-inner" />
            </button>

            {/* 3. Wireframe */}
            <button
              type="button"
              onClick={() => setShadingMode('wireframe')}
              className={`relative w-6 h-6 rounded-full transition-all cursor-pointer p-0.5 border ${
                shadingMode === 'wireframe'
                  ? 'border-[#B83B2A] ring-2 ring-[#B83B2A]/40 scale-110 shadow-sm'
                  : 'border-white/20 hover:border-white/50 opacity-80 hover:opacity-100'
              }`}
              title="Wireframe: Khung lưới đa giác mảnh"
            >
              <div className="w-full h-full rounded-full bg-[#1c1c1c] border border-dashed border-[#d4cfc7] flex items-center justify-center">
                <Grid className="w-2.5 h-2.5 text-[#d4cfc7]" />
              </div>
            </button>

            {/* 4. Normal / Print Check */}
            <button
              type="button"
              onClick={() => setShadingMode('normal')}
              className={`relative w-6 h-6 rounded-full transition-all cursor-pointer p-0.5 border ${
                shadingMode === 'normal'
                  ? 'border-[#B83B2A] ring-2 ring-[#B83B2A]/40 scale-110 shadow-sm'
                  : 'border-white/20 hover:border-white/50 opacity-80 hover:opacity-100'
              }`}
              title="Normal / Print Check: Kiểm tra hướng pháp tuyến và in SLA"
            >
              <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_35%_35%,_#a855f7_0%,_#3b82f6_45%,_#22c55e_80%,_#eab308_100%)] shadow-inner" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-white/15" />

          {/* Loading or Face Count */}
          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-[#E2DFD7]">
            {isModelLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B83B2A]" />
                <span className="text-[11px] text-[#E2DFD7]">Đang nạp file...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#B83B2A] animate-pulse" />
                <span className="text-[11px] font-medium text-[#E2DFD7]">{customFaceCountDisplay || faceCount} Faces</span>
              </>
            )}
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
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#22221F]/95 border border-[#33322E] rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs text-white shadow-black/60"
        >
          <div className="w-6 h-6 rounded-lg bg-[#4A5D4E]/25 border border-[#33322E] flex items-center justify-center text-[#E2DFD7]">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-[#E2DFD7]">{snapshotToast}</span>
          <span className="text-[10px] text-zinc-400 ml-1 font-mono tabular-nums">PNG Trong Suốt</span>
        </motion.div>
      )}

      {/* Generating Overlay Animation */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#33322E] border-t-[#4A5D4E] animate-spin" />
            <Sparkles className="w-6 h-6 text-[#E2DFD7] animate-pulse" />
          </div>
          <span className="text-sm font-semibold text-white">Đang khởi tạo lưới 3D ({faceCount})...</span>
          <span className="text-xs text-zinc-400">Hệ thống đang nội suy bề mặt đa giác và tối ưu hóa file STL/GLB</span>
        </div>
      )}
    </div>
  );
}
