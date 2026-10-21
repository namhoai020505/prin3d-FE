# Shaders, Typography & Choreography Reference

This reference contains exact CSS shaders, fixed-canvas responsive math, 2D canvas font-metric fitting, and Web Animations API choreography patterns.

---

## 1. Pooled-Light Glow Button & Glass Badge Shaders

### The 18-Stop Pooled-Light Button (`.btn`)

Instead of an outer neon drop-shadow, this shader pools cyan light inside the bottom 18px of a near-black button, clipped by `overflow: hidden`, with masked side-edge attenuation and a top specular streak.

```css
.btn {
  display: grid;
  place-items: center;
  color: #fff;
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(
    to top,
    #9ad9ec 1px, #89dff0 2px, #79e0f1 3px, #61daef 4px, #3ec8e4 5px,
    #14a8c6 6px, #0596b3 7px, #038aa8 8px, #047796 9px, #006180 10px,
    #025066 12px, #0a4f5e 13px, #04465a 14px, #073746 16px,
    #0a2a37 18px, #0d212e 20px, #0f1824 24px, #0a121e 30px,
    #0a111d 34px, #0a111d 100%
  );
  box-shadow:
    inset 0 3px 3px -2px rgba(180, 228, 255, 0.10),
    inset 1px 0 0 rgba(255, 255, 255, 0.09),
    inset -1px 0 0 rgba(255, 255, 255, 0.09),
    var(--hair, 0 1px 0 rgba(152, 218, 234, 0.38)),
    1px 0 0 rgba(152, 218, 234, 0.17),
    -1px 0 0 rgba(152, 218, 234, 0.17),
    0 0 8px rgba(60, 190, 235, 0.10),
    0 2px 5px -3px rgba(90, 220, 255, 0.45);
  transition: transform 0.25s, box-shadow 0.25s, filter 0.25s;
}
/* Top specular streak (hide on secondary/hero buttons if needed via ::before { display: none }) */
.btn::before {
  content: "";
  position: absolute;
  left: 22%;
  right: 38%;
  top: 0.8px;
  height: 1.9px;
  z-index: 1;
  filter: blur(0.55px);
  background: linear-gradient(
    90deg,
    rgba(120, 225, 255, 0) 0%,
    rgba(120, 225, 255, 0.58) 34%,
    rgba(160, 240, 255, 0.74) 50%,
    rgba(120, 225, 255, 0.58) 66%,
    rgba(120, 225, 255, 0) 100%
  );
}
/* Side rim light attenuated upward by mask */
.btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(200, 245, 255, 0.70), rgba(200, 245, 255, 0) 13px),
    linear-gradient(270deg, rgba(200, 245, 255, 0.70), rgba(200, 245, 255, 0) 13px);
  -webkit-mask: linear-gradient(
    to top,
    #000 0, #000 6px, rgba(0, 0, 0, 0.40) 12px,
    rgba(0, 0, 0, 0.15) 18px, rgba(0, 0, 0, 0.09) 24px,
    rgba(0, 0, 0, 0.02) 30px, rgba(0, 0, 0, 0.02) 100%
  );
  mask: linear-gradient(
    to top,
    #000 0, #000 6px, rgba(0, 0, 0, 0.40) 12px,
    rgba(0, 0, 0, 0.15) 18px, rgba(0, 0, 0, 0.09) 24px,
    rgba(0, 0, 0, 0.02) 30px, rgba(0, 0, 0, 0.02) 100%
  );
}
.btn span {
  position: relative;
  z-index: 2;
  display: block;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 20, 30, 0.5);
}
.btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.12);
  box-shadow:
    inset 0 1px 0 rgba(200, 245, 255, 0.6),
    inset 1px 0 0 rgba(170, 225, 255, 0.35),
    inset -1px 0 0 rgba(170, 225, 255, 0.35),
    0 6px 22px rgba(20, 180, 225, 0.55);
}
```

### Non-Overlapping Glass Badge with Icon Tile (`.badge`)

```css
.badge {
  position: relative;
  width: 250px;
  height: 39px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.115);
  background: linear-gradient(
    to top,
    rgba(190, 225, 255, 0.175) 0px,
    rgba(190, 225, 255, 0.128) 2px,
    rgba(190, 225, 255, 0.075) 4px,
    rgba(190, 225, 255, 0.026) 6px,
    rgba(255, 255, 255, 0.012) 9px,
    rgba(255, 255, 255, 0.012) 100%
  );
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}
.badge i {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 29px;
  height: 29px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: linear-gradient(
    to top,
    #46afc8 0px, #35abc7 2px, #0b859d 4px, #026c84 6px, #004e66 8px,
    #053f58 10px, #012c3d 12px, #031a2a 14px, #061125 16px, #090f25 19px,
    #090c1c 23px, #060d16 29px
  );
  box-shadow:
    inset 1px 0 0 rgba(150, 220, 250, 0.40),
    inset -1px 0 0 rgba(150, 220, 250, 0.52),
    0 0 6px rgba(60, 190, 230, 0.20),
    0 3px 8px -5px rgba(90, 220, 255, 0.6);
}
.badge b {
  position: absolute;
  left: 45px; /* Leaves a clean 12px gap after the 4+29=33px icon tile */
  top: 0;
  height: 39px;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
```

### Procedural 2-Layer Box-Shadow Starfield

```javascript
function makeStars(el, count, alphaMin, alphaMax) {
  const shadows = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(2);
    const y = (Math.random() * 100).toFixed(2);
    const a = (alphaMin + Math.random() * (alphaMax - alphaMin)).toFixed(3);
    shadows.push(`${x}vw ${y}vh 0 rgba(255,255,255,${a})`);
  }
  el.style.boxShadow = shadows.join(',');
}
// Layer A: 150 sharp dim stars (.05 - .30 alpha)
// Layer B: 18 soft bright stars (.35 - .70 alpha, filter: blur(1.2px))
```

---

## 2. Three-Tier Scaled Canvas & 2D Canvas Font-Metric Fitter

### Continuous Scale Law & Tablet Ramp

```javascript
const CW = 1172, TAB_MAX = 1080, TAB_MIN = 701, DW_MIN = 920;
let k = 1, tboost = 1, mobile = false, tablet = false;

function updateCanvasScale(canvasEl) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  mobile = vw <= 700;
  tablet = vw >= TAB_MIN && vw <= TAB_MAX;

  if (mobile) {
    k = 1;
    tboost = 1;
    ['--k', '--fill', '--stshift', '--sshift', '--rs'].forEach((p) =>
      canvasEl.style.removeProperty(p)
    );
    return;
  }

  let W = CW;
  let ramp = 0;
  if (tablet) {
    W = DW_MIN + ((vw - TAB_MIN) * (CW - DW_MIN)) / (TAB_MAX - TAB_MIN);
    if (vh > vw * 1.15) W = Math.min(W, 900); // Portrait tablet tightening
    ramp = Math.min(1, (TAB_MAX - vw) / 120);
  }

  k = Math.min(vw / W, vh / 560); // 560 divisor lets bottom mockup bleed off-screen
  tboost = 1 + 0.14 * ramp;

  let fill = Math.max(0, vh / k - 657);
  let ss = 0, rs = 1, st = 0;
  if (tablet && fill > 0) {
    ss = Math.min(fill * 0.55, 420) * ramp;
    rs = 1 + Math.min(fill / 1100, 0.75) * ramp;
    const slack = 219.5 - 125 * rs + ss;
    st = Math.max(0, slack / 2 - 28) * ramp;
    fill -= ss;
  }

  canvasEl.style.setProperty('--k', k);
  canvasEl.style.setProperty('--fill', `${fill}px`);
  canvasEl.style.setProperty('--stshift', `${st}px`);
  canvasEl.style.setProperty('--sshift', `${ss}px`);
  canvasEl.style.setProperty('--rs', rs);
}
```

### Detached Canvas Font-Metric Type Fitter

```javascript
const mctx = document.createElement('canvas').getContext('2d');

function fontOf(el) {
  const cs = getComputedStyle(el);
  return {
    css: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    size: parseFloat(cs.fontSize),
    weight: cs.fontWeight,
    family: cs.fontFamily,
  };
}

function capRatio(el) {
  const f = fontOf(el);
  mctx.font = `${f.weight} 100px ${f.family}`;
  const m = mctx.measureText('H');
  return (m.actualBoundingBoxAscent || 70) / 100;
}

function inkWidth(el, scaleK) {
  return el.getBoundingClientRect().width / scaleK;
}

function fitBox(el, targetWidth, targetCap, preTransform = '', scaleK = 1) {
  el.style.transform = preTransform;
  const fs = targetCap / capRatio(el);
  el.style.fontSize = `${fs}px`;
  const w = inkWidth(el, scaleK);
  const sx = w > 0 ? targetWidth / w : 1;
  el.style.transform = `${preTransform} scaleX(${sx})`.trim();
}

function baseline(el, targetY) {
  const f = fontOf(el);
  mctx.font = f.css;
  const m = mctx.measureText('H');
  const A = m.fontBoundingBoxAscent ?? f.size * 0.8;
  const D = m.fontBoundingBoxDescent ?? f.size * 0.2;
  el.style.top = `${targetY - ((f.size - (A + D)) / 2 + A)}px`;
}
```

---

## 3. Master Entrance Choreography (`Element.animate` + Composable Properties)

Use individual CSS transform properties (`translate`, `scale`, `clipPath`) so entrance animations compose cleanly with elements whose `transform` is owned by 3D loops or type fitters.

```javascript
(function runEntranceTimeline() {
  const root = document.documentElement;
  if (
    !root.classList.contains('intro') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    !Element.prototype.animate
  ) {
    root.classList.remove('intro');
    return;
  }

  const D = window.innerWidth <= 700 ? 0.66 : 1;
  const EXPO = 'cubic-bezier(.16, 1, .3, 1)';
  const SOFT = 'cubic-bezier(.22, .61, .36, 1)';
  const Y = (px) => `0 ${px * D}px`;
  let seq = 0;
  let lastAnim = null;
  let maxEnd = 0;

  function play(el, from, duration, delay, easing) {
    if (!el) return;
    const to = { opacity: 1 };
    if ('translate' in from) to.translate = '0 0';
    if ('scale' in from) to.scale = '1';
    if ('clipPath' in from) to.clipPath = 'inset(-30% 0 -30% 0)';

    const anim = el.animate([from, to], { duration, delay, easing, fill: 'both' });
    anim.id = `intro:${seq++}`;
    if (delay + duration >= maxEnd) {
      maxEnd = delay + duration;
      lastAnim = anim;
    }
  }

  // Example choreography sequence:
  play(document.querySelector('.nav'), { opacity: 0, translate: Y(-9) }, 620, 60, EXPO);
  play(document.querySelector('.badge'), { opacity: 0, translate: Y(11), scale: 0.985 }, 560, 270, EXPO);
  play(document.querySelector('#h1a'), { opacity: 0, translate: Y(15), clipPath: 'inset(100% 0 -30% 0)' }, 900, 380, EXPO);
  play(document.querySelector('#h1b'), { opacity: 0, translate: Y(15), clipPath: 'inset(100% 0 -30% 0)' }, 900, 470, EXPO);
  play(document.querySelector('.ring'), { opacity: 0, translate: Y(18), scale: 0.99 }, 950, 700, EXPO);
  play(document.querySelector('.browser'), { opacity: 0, translate: Y(26) }, 900, 900, EXPO);

  function settle() {
    document.getAnimations().forEach((a) => {
      if (a.id && a.id.startsWith('intro:')) a.cancel();
    });
    root.classList.remove('intro');
  }

  if (lastAnim && lastAnim.finished) {
    lastAnim.finished.then(settle).catch(settle);
  } else {
    setTimeout(settle, maxEnd + 50);
  }
})();
```

---

## 4. Dual-Element Lerped Custom Cursor

```javascript
function setupOrbitCursor(cursorEl, dotEl, orbitEl, portalEl) {
  let ptrX = window.innerWidth / 2, ptrY = window.innerHeight / 2;
  let orbX = ptrX, orbY = ptrY;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    ptrX = e.clientX;
    ptrY = e.clientY;
    cursorEl.classList.add('is-visible');
  });

  document.addEventListener('mouseleave', () => {
    cursorEl.classList.remove('is-visible');
  });

  if (portalEl) {
    portalEl.addEventListener('pointerenter', () => cursorEl.classList.add('is-enter'));
    portalEl.addEventListener('pointerleave', () => cursorEl.classList.remove('is-enter'));
  }

  function loop() {
    orbX += (ptrX - orbX) * 0.2;
    orbY += (ptrY - orbY) * 0.2;
    dotEl.style.transform = `translate3d(${ptrX}px, ${ptrY}px, 0) translate(-50%, -50%)`;
    orbitEl.style.transform = `translate3d(${orbX}px, ${orbY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
```