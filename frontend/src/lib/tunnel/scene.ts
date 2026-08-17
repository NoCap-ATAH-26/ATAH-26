import * as THREE from "three";

// Tunnel geometry — a horizontal cylinder whose axis runs along -Z, camera
// fixed at the origin looking down that axis. Scroll never moves the camera;
// it moves `tunnelGroup` (translate along Z for forward motion, rotate
// around Z for the "spinning drum" feel), which is what "camera fixed,
// tunnel moves around you" actually means in practice.
const RADIUS = 6.4;
const LENGTH = 60;
const IDEAL_DISTANCE = 7; // world-Z distance at which an anchor reads at scale 1
const TOTAL_TRAVEL = 26; // how far tunnelGroup.position.z travels across progress 0→1
const TOTAL_SPIN = Math.PI * 0.55; // total drum rotation across the same range

function ringTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#050706";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(139, 232, 203, 0.16)";
  ctx.lineWidth = 1.5;
  for (let y = 0; y <= size; y += size / 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(126, 162, 170, 0.1)";
  for (let x = 0; x <= size; x += size / 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, LENGTH / 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildParticles(count: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * RADIUS * 0.85;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
    positions[i * 3 + 2] = -Math.random() * LENGTH;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x8be8cb,
    size: 0.05,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

export type Anchor = { x: number; y: number; z: number };

export type Projected = {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
  curveAngle: number;
  distance: number;
};

export function createTunnelScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.05);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, LENGTH + 20);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  const tunnelGroup = new THREE.Group();
  scene.add(tunnelGroup);

  const wallGeometry = new THREE.CylinderGeometry(RADIUS, RADIUS, LENGTH, 48, 1, true);
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: ringTexture(),
    side: THREE.BackSide,
    roughness: 0.85,
    metalness: 0.1,
    emissive: 0x0a1512,
    emissiveIntensity: 0.6,
  });
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.rotation.x = Math.PI / 2;
  wall.position.z = -LENGTH / 2 + 4;
  tunnelGroup.add(wall);

  // Faint structural ribs — thin glowing rings at intervals, echoing a
  // drum's hoops and giving the fog something to fade rings into.
  const ribMaterial = new THREE.MeshBasicMaterial({
    color: 0x8be8cb,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  });
  for (let z = -2; z > -LENGTH; z -= 6) {
    const rib = new THREE.Mesh(new THREE.RingGeometry(RADIUS - 0.06, RADIUS, 64), ribMaterial);
    rib.position.z = z;
    tunnelGroup.add(rib);
  }

  const particles = buildParticles(280);
  tunnelGroup.add(particles);

  const hemi = new THREE.HemisphereLight(0x8be8cb, 0x050403, 0.55);
  scene.add(hemi);

  // Headlamp — travels with the camera (camera never moves, so this just
  // sits at the origin), lighting whatever is currently closest.
  const headlamp = new THREE.PointLight(0x8be8cb, 6, 14, 2);
  headlamp.position.set(0, 0.4, 0.5);
  scene.add(headlamp);

  const deepLight = new THREE.PointLight(0x9c7a97, 4, 18, 2);
  deepLight.position.set(0, 0, -18);
  tunnelGroup.add(deepLight);

  let width = 1;
  let height = 1;

  function resize(w: number, h: number) {
    width = w;
    height = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function update(progress: number, elapsedSeconds: number) {
    tunnelGroup.position.z = progress * TOTAL_TRAVEL;
    tunnelGroup.rotation.z = progress * TOTAL_SPIN;
    particles.rotation.z = elapsedSeconds * 0.015;
    const mat = wall.material as THREE.MeshStandardMaterial;
    if (mat.map) mat.map.offset.y = elapsedSeconds * 0.006;

    camera.updateMatrixWorld();
    tunnelGroup.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  const worldPos = new THREE.Vector3();
  const ndc = new THREE.Vector3();

  function project(anchor: Anchor): Projected {
    worldPos.set(anchor.x, anchor.y, anchor.z).applyMatrix4(tunnelGroup.matrixWorld);
    const distance = -worldPos.z;
    ndc.copy(worldPos).project(camera);

    const visible = distance > 1.2 && distance < LENGTH && ndc.z < 1;
    const x = (ndc.x * 0.5 + 0.5) * width;
    const y = (1 - (ndc.y * 0.5 + 0.5)) * height;
    const scale = THREE.MathUtils.clamp(IDEAL_DISTANCE / Math.max(distance, 0.1), 0.15, 1.6);

    // How much of the wall's curvature this anchor still carries — 0 right
    // at the ideal reading distance (flattened to face the viewer), growing
    // as it recedes toward the fog, matching the "peels off the wall" cue.
    const curveAngle = THREE.MathUtils.clamp((distance - IDEAL_DISTANCE) / 10, -1, 1) * 22;

    return { x, y, scale, visible, curveAngle, distance };
  }

  function dispose() {
    wallGeometry.dispose();
    wallMaterial.dispose();
    wallMaterial.map?.dispose();
    ribMaterial.dispose();
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();
    renderer.dispose();
  }

  return { resize, update, project, dispose, IDEAL_DISTANCE };
}
