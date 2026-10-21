# Spatial 3D & Canvas Math Reference

This reference contains the exact mathematical models, projection algorithms, and interaction controllers extracted from Awwwards-grade 3D web experiences.

---

## 1. 3D Fibonacci Sphere & Counter-Rotated Center Headline

Use this pattern when building a 3D photo archive, portfolio cloud, or spatial node explorer where a headline sits dead-center inside the sphere and nearest cards pass in front of the text.

### Required DOM & CSS Structure

```html
<div id="scrolltrack"></div>
<div id="stage">
  <div id="world">
    <div id="orb"></div>
    <h1 id="headline"><span class="inner"></span></h1>
  </div>
</div>
```

```css
:root {
  --hw: min(56vw, 640px);
  --persp: 1150px;
}
#scrolltrack {
  height: 116vh; /* 16vh total scrollable dolly distance */
  pointer-events: none;
}
#stage {
  position: fixed;
  inset: 0;
  z-index: 10;
  perspective: var(--persp);
  perspective-origin: 50% 50%;
  overflow: hidden;
  touch-action: none;
}
@media (pointer: coarse) {
  #stage { touch-action: pan-y; }
}
#world {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  will-change: transform;
}
#orb {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}
#headline {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--hw);
  margin-left: calc(var(--hw) / -2); /* Pixel half-width pullback from 0x0 origin */
  text-align: center;
  pointer-events: none;
  user-select: none;
}
#headline .inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transform: translateY(-50%); /* Keeps vertical center forever; never touch in JS */
}
.card {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--cw);
  height: calc(var(--cw) / 1.5);
  margin-left: calc(var(--cw) / -2);
  margin-top: calc(var(--cw) / -3);
  transform-style: preserve-3d;
}
.card figure {
  width: 100%;
  height: 100%;
  margin: 0;
  border-radius: 3px;
  overflow: hidden;
  background: #0a0a0a;
  position: relative;
  transition: transform 0.5s cubic-bezier(.22, .61, .36, 1);
}
.card figure:hover {
  transform: scale(1.045);
}
/* Lightweight depth wash instead of expensive CSS filter:brightness() */
.card figure::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, var(--d, 0));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
  border-radius: 3px;
  pointer-events: none;
}
```

### Fibonacci Sphere Math & Per-Frame Camera Loop

```javascript
const N = items.length;
const GA = Math.PI * (3 - Math.sqrt(5)); // Golden angle
const nodes = [];

for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * GA;
  const x = Math.cos(theta) * rad;
  const z = Math.sin(theta) * rad;
  const lat = (Math.asin(y) * 180) / Math.PI;
  const lon = (Math.atan2(x, z) * 180) / Math.PI;
  nodes.push({ x, y, z, lat, lon, el: cardEl, lastD: -1, lastOp: -1 });
}

function computeSphereMetrics() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const hr = w <= 380 ? 0.38 : w <= 640 ? 0.42 : 0.46;
  const wr = w <= 380 ? 0.48 : w <= 640 ? 0.52 : 0.58;
  const floor = w <= 380 ? 108 : w <= 640 ? 120 : 155;
  const R = Math.max(floor, Math.min(480, h * hr, w * wr));
  const scale = w <= 380 ? 0.44 : w <= 640 ? 0.46 : 0.47;
  const cw = Math.round(Math.max(72, R * scale));
  const persp = w <= 380 ? 620 : w <= 640 ? 760 : w <= 900 ? 920 : 1150;

  document.documentElement.style.setProperty('--cw', `${cw}px`);
  document.documentElement.style.setProperty('--persp', `${persp}px`);

  for (const n of nodes) {
    n.el.style.transform = `translate3d(${n.x * R}px, ${-n.y * R}px, ${n.z * R}px) rotateY(${n.lon}deg) rotateX(${n.lat}deg)`;
  }
  return { R, persp };
}

// Per-frame render loop:
// sx = tilt + dragY (clamped to +-32 deg), sy = spin + dragX
// p = clamp(scrollY / (innerHeight * 0.16), 0, 1)
// camZ += (p * Math.min(64, R * 0.12) - camZ) * 0.075
function renderSphereFrame(sx, sy, camZ, p, R, persp, focusedIdx) {
  world.style.transform = `translateZ(${camZ}px) rotateY(${sy}deg) rotateX(${sx}deg)`;

  // Counter-rotate headline so it stays square to camera, pushed 0.62*R forward
  headline.style.transform = `rotateX(${-sx}deg) rotateY(${-sy}deg) translateZ(${R * 0.62}px)`;
  headline.style.opacity = Math.max(0, 1 - p * 0.55);

  const rx = (sx * Math.PI) / 180;
  const ry = (sy * Math.PI) / 180;
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const near = persp * 0.66;
  const shade = 1 - Math.min(1, p * 1.6);

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    // Rotate unit vector (n.x, -n.y, n.z) by yaw (ry) then pitch (rx)
    const z1 = -n.x * sinY + n.z * cosY;
    const y1 = -n.y;
    const zf = y1 * sinX + z1 * cosX; // World-space depth in [-1, 1]

    const base = 0.14 + 0.86 * Math.pow((zf + 1) / 2, 0.85);
    let dim = shade * (1 - base);
    if (focusedIdx !== -1) dim = Math.min(1, dim + 0.78);

    const absZ = zf * R + camZ;
    let fade = absZ > near ? Math.max(0, 1 - (absZ - near) / 190) : 1;
    if (i === focusedIdx) fade = 0;

    const dRound = Math.round(dim * 1000) / 1000;
    const opRound = Math.round(fade * 1000) / 1000;
    if (n.lastD !== dRound) {
      n.el.style.setProperty('--d', dRound);
      n.lastD = dRound;
    }
    if (n.lastOp !== opRound) {
      n.el.style.opacity = opRound;
      n.lastOp = opRound;
    }
  }
}
```

---

## 2. True 3D Perspective Cylinder Ring (Camera-At-Center)

Use this pattern when placing a ring of vertical cards in the mid-ground behind a foreground UI mockup or hero callout. Because `perspective` equals the cylinder radius `R`, the camera sits at the center of the cylinder and every card is tangent to the ring.

### CSS & JS Ring Implementation

```css
.ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 1172px;
  height: 657px;
  z-index: 5;
  perspective: 891px;
  perspective-origin: 586px 918px;
  transform-style: preserve-3d;
  pointer-events: none;
}
.ring .card {
  position: absolute;
  left: 586px;
  top: 616px;
  width: 130px;
  height: 300px;
  margin: -150px 0 0 -65px;
  border-radius: 12px;
  overflow: hidden;
  background: #0d1117;
  box-shadow: 0 24px 46px rgba(0, 0, 0, 0.6), 0 3px 8px rgba(0, 0, 0, 0.5);
  backface-visibility: hidden;
  will-change: transform;
}
```

```javascript
const R = 891;
const TOTAL_CARDS = 37;
const STEP = 360 / TOTAL_CARDS;
const CULL_ANGLE = 42;
let phase = -2;
let lastTime = performance.now();

document.addEventListener('visibilitychange', () => {
  lastTime = performance.now(); // Prevent jump after tab backgrounding
});

function placeCards(cards) {
  for (let i = 0; i < TOTAL_CARDS; i++) {
    const el = cards[i];
    const a = (((i * STEP + phase) % 360) + 540) % 360 - 180; // Signed angle [-180, 180]
    if (Math.abs(a) > CULL_ANGLE) {
      el.style.visibility = 'hidden';
      continue;
    }
    el.style.visibility = 'visible';
    const r = (a * Math.PI) / 180;
    const c = Math.cos(r);
    el.style.transform = `translate3d(${R * Math.sin(r)}px, 0, ${R * (1 - c)}px) rotateY(${-a}deg)`;
    el.style.filter = `brightness(${0.84 + 0.5 * (1 / c - 1)})`;
  }
}

function tickRing(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    phase -= 1.9 * dt;
  }
  placeCards(cardElements);
  requestAnimationFrame(tickRing);
}
```

---

## 3. Fake-3D Canvas Portal Window (Screen-Locked Parallax Mask)

Use this pattern to render a tilting 3D rounded-rectangle portal in the center of the screen that acts as a window into a stationary full-viewport video or image behind it, and expands to fill the screen on click.

### Point Sampling & Fake Perspective Projection

```javascript
function sampleRoundedRect(w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  const corners = [
    [w / 2 - rad, -h / 2 + rad, -Math.PI / 2, 0],
    [w / 2 - rad, h / 2 - rad, 0, Math.PI / 2],
    [-w / 2 + rad, h / 2 - rad, Math.PI / 2, Math.PI],
    [-w / 2 + rad, -h / 2 + rad, Math.PI, Math.PI * 1.5],
  ];
  const pts = [];
  const steps = 10;
  for (const [cx, cy, a0, a1] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
  }
  return pts;
}

function projectPoint(x, y, rx, ry, cx, cy) {
  const ax = (rx * Math.PI) / 180;
  const ay = (ry * Math.PI) / 180;
  const xx = x * Math.cos(ay);
  const yy = y * Math.cos(ax);
  const z = x * Math.sin(ay) - y * Math.sin(ax);
  const p = 850 / (850 + z);
  return [cx + xx * p, cy + yy * p];
}

function drawCover(ctx, media, vw, vh) {
  const mw = media.videoWidth || media.naturalWidth || vw;
  const mh = media.videoHeight || media.naturalHeight || vh;
  if (!mw || !mh) return;
  const scale = Math.max(vw / mw, vh / mh);
  const w = mw * scale;
  const h = mh * scale;
  ctx.drawImage(media, (vw - w) / 2, (vh - h) / 2, w, h);
}

// Per-frame portal draw:
// expansion (e) animates 0 -> 1 during travel; maskScale animates 0 -> 1 on reveal
function drawPortalFrame(ctx, portalEl, media, rotX, rotY, expansion, maskScale, canvasOpacity) {
  const vw = window.innerWidth;
  const vh