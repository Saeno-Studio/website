/**
 * WebGL layer — a raked-sand zen garden (karesansui) with the Saeno mark
 * floating as the central stone, a few pebbles placed along the page, and
 * slow drifting dust. The sand rakes around every stone, and the mouse leaves
 * soft ripples.
 */
import * as THREE from 'three';

const PALETTE = {
  paper: new THREE.Color('#F2EDE4'),
  shade: new THREE.Color('#D9CFC2'),
  light: new THREE.Color('#FBF8F2'),
  topA: new THREE.Color('#B09A87'),
  topB: new THREE.Color('#DCD0C3'),
  botA: new THREE.Color('#8E8A84'),
  botB: new THREE.Color('#262522'),
  olive: new THREE.Color('#857E4E'),
};

/* Pebbles, anchored to page sections. fx = fraction of viewport width,
   fy = fraction of the section's height, r = radius in world units. */
const PEBBLES = [
  { sel: '#work', fx: 0.93, fy: 0.02, r: 0.22, color: '#3A3833', squash: 0.62 },
  { sel: '#philosophy', fx: 0.06, fy: 0.08, r: 0.34, color: '#C9B8A6', squash: 0.55 },
  { sel: '#philosophy', fx: 0.13, fy: 0.2, r: 0.14, color: '#7F7849', squash: 0.7 },
  { sel: '#approach', fx: 0.9, fy: 0.95, r: 0.28, color: '#8C877F', squash: 0.6 },
  { sel: '#contact', fx: 0.12, fy: 0.78, r: 0.2, color: '#B09A87', squash: 0.6 },
];
const MAX_STONES = 8;

const vert = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;          // css px
  uniform float uDpr;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uMouse;        // css px, gl orientation (y up)
  uniform float uMouseAmt;
  uniform vec3 uStones[${MAX_STONES}]; // x, y (css px, y up), radius px
  uniform int uCount;
  uniform vec3 uPaper;
  uniform vec3 uShade;
  uniform vec3 uLight;
  uniform float uIntro;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 p = gl_FragCoord.xy / uDpr;

    // Straight rake lines that drift with the page and sway gently.
    float field = (p.y - uScroll * 0.35) + sin(p.x * 0.0032 + uTime * 0.12) * 12.0
                + sin(p.x * 0.011 - uTime * 0.07) * 3.0;
    float shadow = 0.0;
    float calm = 0.0;

    for (int i = 0; i < ${MAX_STONES}; i++) {
      if (i >= uCount) break;
      vec3 s = uStones[i];
      float d = distance(p, s.xy);
      // Concentric rings around the stone, blended into the straight lines.
      float inner = s.z * 1.15 + max(s.z * 0.5, 45.0);
      float w = 1.0 - smoothstep(inner, inner + max(s.z * 1.4, 90.0), d);
      field = mix(field, d * 1.0, w);
      // Calm, un-raked sand right next to the stone + soft contact shadow.
      calm = max(calm, 1.0 - smoothstep(s.z * 0.95, s.z * 1.15, d));
      float ds = distance(p, s.xy + vec2(s.z * 0.18, -s.z * 0.22));
      shadow += exp(-max(ds - s.z * 0.8, 0.0) / (s.z * 0.35)) * 0.55;
    }

    // Mouse ripples.
    float dm = distance(p, uMouse);
    field += sin(dm * 0.055 - uTime * 2.4) * 7.0 * exp(-dm / 160.0) * uMouseAmt;

    float spacing = 15.0;
    float wave = cos(field * 6.28318 / spacing);
    float groove = smoothstep(0.35, 1.0, wave);
    float ridge = smoothstep(0.55, 1.0, -wave);
    float rake = (1.0 - calm) * uIntro;

    vec3 col = uPaper;
    col = mix(col, uShade, groove * 0.2 * rake);
    col = mix(col, uLight, ridge * 0.3 * rake);
    col = mix(col, uShade * 0.86, clamp(shadow, 0.0, 1.0) * 0.35);

    // Vignette + paper grain.
    vec2 uv = p / uRes;
    float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
    col *= mix(0.94, 1.0, vig);
    col += (hash(p + fract(uTime)) - 0.5) * 0.018;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* The leaf from the logo, in the 352×337 SVG space (y down). */
function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(352, 0);
  s.lineTo(150, 0);
  s.bezierCurveTo(60, 0, 15, 55, 15, 110);
  s.bezierCurveTo(15, 170, 70, 214, 160, 214);
  s.bezierCurveTo(225, 214, 262, 175, 282, 132);
  s.lineTo(352, 0);
  return s;
}

function leafGeometry({ flip, colorA, colorB }) {
  const geo = new THREE.ExtrudeGeometry(leafShape(), {
    depth: 26,
    bevelEnabled: true,
    bevelThickness: 8,
    bevelSize: 6,
    bevelSegments: 6,
    curveSegments: 48,
  });
  // SVG → centred, y up.
  geo.translate(-176, -168.5, -13);
  geo.scale(1, -1, 1);
  if (flip) geo.rotateZ(Math.PI);
  geo.scale(1 / 150, 1 / 150, 1 / 150);
  geo.computeVertexNormals();

  // Diagonal gradient through vertex colours (same direction as the logo).
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = (pos.getX(i) - min.x) / (max.x - min.x);
    const y = (pos.getY(i) - min.y) / (max.y - min.y);
    const t = flip ? THREE.MathUtils.clamp((x + y) / 2, 0, 1) : THREE.MathUtils.clamp((x + (1 - y)) / 2, 0, 1);
    c.copy(colorA).lerp(colorB, t);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function pebbleGeometry(seed) {
  const geo = new THREE.IcosahedronGeometry(1, 24);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 2.1 + seed) * 0.05 + Math.sin(v.y * 3.3 + seed * 2) * 0.03 + Math.sin(v.z * 2.7 - seed) * 0.04;
    v.multiplyScalar(1 + n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  /* ---------- Background: sand ---------- */
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const stones = Array.from({ length: MAX_STONES }, () => new THREE.Vector3());
  const sandUniforms = {
    uRes: { value: new THREE.Vector2() },
    uDpr: { value: 1 },
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uMouse: { value: new THREE.Vector2(-9999, -9999) },
    uMouseAmt: { value: 0 },
    uStones: { value: stones },
    uCount: { value: 0 },
    uPaper: { value: PALETTE.paper },
    uShade: { value: PALETTE.shade },
    uLight: { value: PALETTE.light },
    uIntro: { value: reducedMotion ? 1 : 0 },
  };
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: sandUniforms, depthWrite: false, depthTest: false })
  );
  bgScene.add(sand);

  /* ---------- Foreground ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  scene.add(new THREE.HemisphereLight('#FFF8EE', '#B9AE9E', 1.6));
  const key = new THREE.DirectionalLight('#FFF3E2', 2.2);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#C9D0C0', 0.8);
  rim.position.set(4, -2, -3);
  scene.add(rim);

  // Logo: bottom leaf writes stencil, top leaf drawn normally,
  // then an olive copy of the top leaf only where they overlap.
  const logo = new THREE.Group();
  const leafMat = (extra = {}) => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), ...extra });

  const bottom = new THREE.Mesh(
    leafGeometry({ flip: true, colorA: PALETTE.botA, colorB: PALETTE.botB }),
    leafMat({ stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp })
  );
  bottom.renderOrder = 1;
  const topGeo = leafGeometry({ flip: false, colorA: PALETTE.topA, colorB: PALETTE.topB });
  const top = new THREE.Mesh(topGeo, leafMat());
  top.renderOrder = 2;
  const overlap = new THREE.Mesh(topGeo, new THREE.MeshPhysicalMaterial({
    color: PALETTE.olive, roughness: 0.5, clearcoat: 0.4,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc,
    depthFunc: THREE.LessEqualDepth,
  }));
  overlap.renderOrder = 3;
  const topPivot = new THREE.Group();
  topPivot.add(top, overlap);
  logo.add(bottom, topPivot);
  scene.add(logo);

  // Pebbles
  const pebbles = PEBBLES.map((p, i) => {
    const m = new THREE.Mesh(pebbleGeometry(i * 1.7 + 0.3), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.92 }));
    m.scale.set(p.r, p.r * p.squash, p.r * 0.9);
    m.rotation.set(0.9 + i * 0.2, i, 0.2 * i);
    m.userData = { ...p, el: document.querySelector(p.sel) };
    scene.add(m);
    return m;
  });

  // Dust
  const DUST = 260;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6], i * 3);
    dustSeed[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.045, map: dotTexture(), color: '#9C8B78', transparent: true, opacity: 0.55, depthWrite: false,
  }));
  scene.add(dust);

  /* ---------- State ---------- */
  const state = {
    w: 1, h: 1, dpr: 1,
    scroll: 0,
    mouse: new THREE.Vector2(0, 0),       // normalised -1..1
    mousePx: new THREE.Vector2(-9999, -9999),
    mouseSmooth: new THREE.Vector2(0, 0),
    mouseAmt: 0,
    intro: reducedMotion ? 1 : 0,
    introStarted: reducedMotion,
    t0: performance.now(),
  };

  const viewHeightAtZ0 = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

  function resize() {
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2);
    renderer.setPixelRatio(state.dpr);
    renderer.setSize(state.w, state.h, false);
    camera.aspect = state.w / state.h;
    camera.updateProjectionMatrix();
    sandUniforms.uRes.value.set(state.w, state.h);
    sandUniforms.uDpr.value = state.dpr;
  }

  // Screen px (y down) → world on the z=0 plane, and back.
  const pxToWorld = (x, y) => {
    const vh = viewHeightAtZ0();
    const vw = vh * camera.aspect;
    return new THREE.Vector3((x / state.w - 0.5) * vw, -(y / state.h - 0.5) * vh, 0);
  };
  const tmp = new THREE.Vector3();
  const worldToPx = (v) => {
    tmp.copy(v).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * state.w, y: (tmp.y * 0.5 + 0.5) * state.h }; // y up (gl)
  };

  function onMove(e) {
    state.mouse.set((e.clientX / state.w) * 2 - 1, -(e.clientY / state.h) * 2 + 1);
    const nx = e.clientX, ny = state.h - e.clientY;
    const dx = nx - state.mousePx.x, dy = ny - state.mousePx.y;
    if (state.mousePx.x > -9000) state.mouseAmt = Math.min(1, state.mouseAmt + Math.hypot(dx, dy) * 0.004);
    state.mousePx.set(nx, ny);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', () => { state.scroll = window.scrollY; }, { passive: true });
  resize();
  state.scroll = window.scrollY;

  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const clock = new THREE.Clock();

  function render() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const mobile = state.w < 760;

    // Intro: leaves glide together and the sand gets raked.
    if (state.introStarted && state.intro < 1) state.intro = Math.min(1, state.intro + dt / 2.4);
    const k = ease(state.intro);
    sandUniforms.uIntro.value = k;

    state.mouseSmooth.lerp(state.mouse, reducedMotion ? 1 : 0.05);
    state.mouseAmt *= 0.965;

    // Logo placement (hero, right side on desktop / top on mobile).
    const heroProgress = Math.min(state.scroll / state.h, 1.5);
    const anchor = mobile ? pxToWorld(state.w * 0.62, state.h * 0.24) : pxToWorld(state.w * 0.72, state.h * 0.5);
    const size = mobile ? 0.6 : Math.min(1.25, 0.9 + state.w / 4000);
    logo.scale.setScalar(size * (0.85 + 0.15 * k));
    logo.position.set(anchor.x, anchor.y + heroProgress * viewHeightAtZ0() * 1.15 + Math.sin(t * 0.8) * 0.06, 0);
    logo.visible = heroProgress < 1.4;
    logo.rotation.x = -state.mouseSmooth.y * 0.25 + heroProgress * 0.5;
    logo.rotation.y = state.mouseSmooth.x * 0.45 + (1 - k) * -1.2 + heroProgress * 0.9;
    logo.rotation.z = Math.sin(t * 0.4) * 0.03;

    const spread = (1 - k) * 2.2 + heroProgress * 0.35;
    topPivot.position.set(spread * 0.6, spread * 0.8, 0.12 + spread * 0.4);
    bottom.position.set(-spread * 0.6, -spread * 0.8, -spread * 0.2);
    topPivot.rotation.z = (1 - k) * 0.6;
    bottom.rotation.z = -(1 - k) * 0.6;

    // Stones for the sand shader.
    let n = 0;
    const lp = worldToPx(logo.position);
    const pxPerUnit = state.h / viewHeightAtZ0();
    stones[n++].set(lp.x, lp.y, 1.1 * size * pxPerUnit * k + 1);

    pebbles.forEach((m, i) => {
      const { el, fx, fy, r } = m.userData;
      if (!el) { m.visible = false; return; }
      const rect = el.getBoundingClientRect();
      const px = state.w * (mobile ? Math.min(Math.max(fx, 0.1), 0.9) : fx);
      const py = rect.top + rect.height * fy;
      const wpos = pxToWorld(px, py);
      m.position.set(wpos.x, wpos.y, 0);
      m.rotation.y += reducedMotion ? 0 : dt * 0.05;
      m.position.y += Math.sin(t * 0.6 + i) * 0.02;
      const onScreen = py > -300 && py < state.h + 300;
      m.visible = onScreen;
      if (onScreen && n < MAX_STONES) {
        stones[n++].set(px, state.h - py, r * pxPerUnit * 1.05);
      }
    });
    sandUniforms.uCount.value = n;

    sandUniforms.uTime.value = t;
    sandUniforms.uScroll.value = state.scroll;
    sandUniforms.uMouse.value.copy(state.mousePx);
    sandUniforms.uMouseAmt.value = reducedMotion ? 0 : state.mouseAmt;

    // Dust drifts upward slowly and parallaxes with scroll.
    if (!reducedMotion) {
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST; i++) {
        arr[i * 3 + 1] += dt * 0.08;
        arr[i * 3] += Math.sin(t * 0.3 + dustSeed[i]) * dt * 0.03;
        if (arr[i * 3 + 1] > 5) arr[i * 3 + 1] = -5;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }
    dust.position.y = (state.scroll / state.h) * 1.2;
    dust.rotation.y = state.mouseSmooth.x * 0.1;

    camera.position.x = state.mouseSmooth.x * 0.15;
    camera.position.y = state.mouseSmooth.y * 0.1;
    camera.lookAt(camera.position.x * 0.5, camera.position.y * 0.5, 0);

    renderer.clear(true, true, true);
    renderer.render(bgScene, bgCam);
    renderer.clearDepth();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(render);
  document.addEventListener('visibilitychange', () => {
    renderer.setAnimationLoop(document.hidden ? null : render);
    if (!document.hidden) clock.getDelta();
  });

  return {
    start() { state.introStarted = true; },
    dispose() { renderer.setAnimationLoop(null); renderer.dispose(); },
  };
}
