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
  Layers,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
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

export type ShadingMode = 'wireframe' | 'solid-wire' | 'solid' | 'sla-resin';

function isDescendantOf(obj: THREE.Object3D | null, targetName: string): boolean {
  let curr = obj;
  while (curr) {
    if (curr.name === targetName) return true;
    curr = curr.parent;
  }
  return false;
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
    color: 0x06b6d4,
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
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.95,
  });
  const borderMesh = new THREE.LineSegments(borderGeo, borderMat);
  group.add(borderMesh);

  // 3. Subtle internal cross-section grid
  const gridHelper = new THREE.GridHelper(Math.max(w, d), 10, 0x38bdf8, 0x0369a1);
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
    color: 0x38bdf8,
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

  // Primary Support Material (Bambu / Cura Slicer Emerald Green)
  const supportMat = new THREE.MeshStandardMaterial({
    color: 0x10b981, // Emerald 500
    roughness: 0.42,
    metalness: 0.18,
    transparent: true,
    opacity: 0.85,
  });

  const wireMat = new THREE.LineBasicMaterial({
    color: 0x34d399, // Mint / Emerald 400
    transparent: true,
    opacity: 0.75,
  });

  // Breakaway Support Interface Material (Light Mint / Cyan for contact pads)
  const interfaceMat = new THREE.MeshStandardMaterial({
    color: 0x6ee7b7, // Emerald 300 / Mint
    roughness: 0.3,
    metalness: 0.25,
    transparent: true,
    opacity: 0.95,
  });

  const interfaceWireMat = new THREE.LineBasicMaterial({
    color: 0x00f2fe, // Neon cyan
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
      color: 0x064e3b, // Deep Emerald Teal (Sacrificial Raft plastic)
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
      color: 0x00f2fe,
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
      color: 0x34d399,
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
      color: 0x059669,
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
      color: 0x64748b,
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
  isSlicingActive = false,
  onToggleSlicing,
  slicingProgress = 100,
  onSlicingProgressChange,
  layerHeightMm = 0.2,
  isSimulatingPrint = false,
  onToggleSimulatingPrint,
  dimensionsYMm = 113,
  isSupportActive = true,
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
    renderer.localClippingEnabled = true;
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
      } else if (key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
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
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* FLOATING VERTICAL 3D SLICER HUD (Cura / Bambu Studio Style) */}
      {isSlicingActive && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 bg-[#090d16]/92 backdrop-blur-2xl border border-cyan-500/35 rounded-2xl p-2.5 shadow-2xl shadow-cyan-950/50 transition-all duration-300 pointer-events-auto ${
            isRightPanelOpen ? 'right-4 sm:right-[305px]' : 'right-4'
          }`}
        >
          {/* Header Icon & Close button */}
          <div className="flex items-center justify-between w-full pb-1.5 border-b border-white/10 gap-1.5">
            <span className="text-[10px] font-bold text-cyan-300 font-mono flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
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
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25 shadow-sm'
            }`}
            title={isSimulatingPrint ? 'Tạm dừng mô phỏng in 3D' : 'Bắt đầu mô phỏng in 3D từ đáy lên (Time-lapse)'}
          >
            {isSimulatingPrint ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulatingPrint ? 'Dừng in' : 'Mô phỏng'}</span>
          </button>

          {/* Step Up (+1 Layer) */}
          <button
            onClick={() => onSlicingProgressChange?.(Math.min(100, (slicingProgress ?? 100) + 100 / totalLayers))}
            className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer"
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
              className="h-40 w-2.5 accent-cyan-400 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
              style={{ transform: 'rotate(180deg)' }}
              title={`Lớp cắt: ${currentLayer} / ${totalLayers} (${currentHeightMm} mm)`}
            />
          </div>

          {/* Step Down (-1 Layer) */}
          <button
            onClick={() => onSlicingProgressChange?.(Math.max(0, (slicingProgress ?? 100) - 100 / totalLayers))}
            className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Giảm 1 lớp (-1 Layer / Phím Mũi tên xuống)"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Mini Telemetry Display */}
          <div className="w-full flex flex-col items-center border-t border-white/10 pt-1.5 text-[9.5px] font-mono text-center leading-tight">
            <span className="font-bold text-white text-[11px]">{currentLayer}</span>
            <span className="text-zinc-500 text-[8.5px]">/{totalLayers}</span>
            <span className="text-cyan-300 font-bold mt-1 text-[9.5px]">{currentHeightMm} mm</span>
            <span className="text-emerald-400/90 text-[8.5px] mt-0.5 font-sans font-medium">{Math.round(slicingProgress ?? 100)}%</span>
          </div>

          {/* 3D Printing Support Column Status & Overhang Alert */}
          <div className="w-full pt-1.5 border-t border-white/10 flex flex-col gap-1">
            <button
              onClick={onToggleSupport}
              className={`w-full py-1 px-1.5 rounded-lg border text-[9px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isSupportActive
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white'
              }`}
              title={isSupportActive ? 'Đang bật Cột đỡ Support (Nhấn để tắt)' : 'Đang tắt Cột đỡ Support (Nhấn để bật)'}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{isSupportActive ? 'Cột đỡ: BẬT' : 'Cột đỡ: TẮT'}</span>
            </button>

            {/* Overhang / Floating Island Warning when Support is OFF */}
            {!isSupportActive && (slicingProgress ?? 100) > 8 && (slicingProgress ?? 100) < 52 ? (
              <div className="w-full bg-rose-500/25 border border-rose-400/60 rounded-lg p-1 text-[7.5px] text-rose-200 leading-tight text-center animate-pulse flex items-center justify-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-400" />
                <span>Rơi nhựa trên không!</span>
              </div>
            ) : isSupportActive ? (
              <div className="w-full bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-0.5 text-[7.5px] text-emerald-300 leading-tight text-center">
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
        <div className="bg-[#0b0f17]/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 text-xs text-zinc-300 overflow-x-auto no-scrollbar whitespace-nowrap">
          {/* Shading Mode Selector with Smooth Motion Indicator */}
          <div className="relative flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0">
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

          <div className="w-[1px] h-4 bg-white/10 mx-0.5 shrink-0" />

          {/* Ground Grid Switch */}
          <button
            onClick={onToggleGroundGrid}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${groundGridEnabled
                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white'
              }`}
            title={groundGridEnabled ? 'Tắt lưới sàn 3D (Phím G)' : 'Bật lưới sàn 3D (Phím G)'}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium hidden md:inline">Lưới</span>
          </button>

          {/* 3D Layer Slicing Switch */}
          <button
            onClick={onToggleSlicing}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${isSlicingActive
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] font-semibold'
                : 'bg-white/5 border-white/8 text-zinc-400 hover:text-white'
              }`}
            title={isSlicingActive ? 'Tắt chế độ cắt lớp in 3D (Phím S)' : 'Bật mô phỏng cắt lớp in 3D (Phím S)'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium hidden md:inline">Cắt lớp</span>
          </button>

          {/* Turntable Auto-Rotate Switch */}
          <button
            onClick={() => setIsAutoRotate((prev) => !prev)}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${isAutoRotate
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
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/8 text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Căn giữa & Phóng to mô hình (Phím F hoặc Space)"
          >
            <Focus className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium hidden xl:inline">Căn giữa</span>
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5 shrink-0" />

          {/* High-Res Transparent PNG Snapshot Button */}
          <button
            onClick={takeTransparentSnapshot}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/40 text-cyan-300 hover:text-cyan-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)] shrink-0"
            title="Chụp ảnh Render PNG trong suốt chất lượng cao (Phím P)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-semibold hidden sm:inline">Chụp Render</span>
          </button>

          {/* Keyboard Shortcuts Help Button */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/8 text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer shrink-0"
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
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/8 text-zinc-300 hover:text-white transition-all cursor-pointer shrink-0"
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
        <div className="bg-[#0b0f17]/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-2 shadow-2xl flex flex-col items-center gap-1.5">
          {/* Circular Orientation Widget */}
          <div className="relative w-13 h-13 rounded-full bg-black/45 border border-white/10 flex items-center justify-center">
            {/* Center Isometric Snap Button */}
            <button
              onClick={() => setCameraView('iso')}
              className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-cyan-400 text-black flex items-center justify-center transition-all hover:scale-125 z-10 cursor-pointer"
              title="Đặt lại góc nhìn Isometric"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </button>

            {/* X Axis Button (Right / Coral Red) */}
            <button
              onClick={() => setCameraView('right')}
              className="absolute right-0.5 w-4 h-4 rounded-full bg-[#f43f5e] hover:brightness-125 text-[8px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)] hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn bên phải (Trục X)"
            >
              X
            </button>

            {/* Z Axis Button (Bottom / Electric Cyan) */}
            <button
              onClick={() => setCameraView('bottom')}
              className="absolute bottom-0.5 w-4 h-4 rounded-full bg-[#06b6d4] hover:brightness-125 text-[8px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.6)] hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn từ dưới lên (Trục Z - Nhìn mặt đáy)"
            >
              Z
            </button>

            {/* Y Axis Button (Top / Emerald Green) */}
            <button
              onClick={() => setCameraView('top')}
              className="absolute top-0.5 w-4 h-4 rounded-full bg-[#10b981] hover:brightness-125 text-[8px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.6)] hover:scale-125 transition-transform cursor-pointer"
              title="Góc nhìn từ trên xuống (Trục Y)"
            >
              Y
            </button>

            {/* Left Button (-X) */}
            <button
              onClick={() => setCameraView('left')}
              className="absolute left-0.5 w-2.5 h-2.5 rounded-full bg-white/20 hover:bg-[#f43f5e] hover:scale-125 transition-all cursor-pointer"
              title="Góc nhìn bên trái (-X)"
            />
          </div>

          {/* Quick View Snap Buttons (Blender Numpad Standard) with Smooth Motion Indicator */}
          <div className="relative flex items-center p-0.5 rounded-lg bg-black/50 border border-white/10 text-[9.5px] font-mono">
            {QUICK_VIEWS.map((v) => {
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setCameraView(v.id)}
                  className={`relative px-1.5 py-0.5 rounded-md transition-colors cursor-pointer select-none ${isActive ? 'text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-white'
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
