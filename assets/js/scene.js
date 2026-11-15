/**
 * WebGL layer: the Saeno mark as a floating 3D object, with slow drifting dust.
 * The background itself is plain paper (CSS), so the canvas is transparent.
 */
import * as THREE from 'three';

const PALETTE = {
  topA: new THREE.Color('#B09A87'),
  topB: new THREE.Color('#DCD0C3'),
  botA: new THREE.Color('#8E8A84'),
  botB: new THREE.Color('#262522'),
  olive: new THREE.Color('#857E4E'),
};

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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

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
    mouse: new THREE.Vector2(0, 0), // normalised -1..1
    mouseSmooth: new THREE.Vector2(0, 0),
    intro: reducedMotion ? 1 : 0,
    introStarted: reducedMotion,
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
  }

  // Screen px (y down) to world position on the z=0 plane.
  const pxToWorld = (x, y) => {
    const vh = viewHeightAtZ0();
    const vw = vh * camera.aspect;
    return new THREE.Vector3((x / state.w - 0.5) * vw, -(y / state.h - 0.5) * vh, 0);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    state.mouse.set((e.clientX / state.w) * 2 - 1, -(e.clientY / state.h) * 2 + 1);
  }, { passive: true });
  window.addEventListener('scroll', () => { state.scroll = window.scrollY; }, { passive: true });
  resize();
  state.scroll = window.scrollY;

  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const clock = new THREE.Clock();

  function render() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const mobile = state.w < 760;

    // Intro: the two leaves glide together.
    if (state.introStarted && state.intro < 1) state.intro = Math.min(1, state.intro + dt / 2.4);
    const k = ease(state.intro);

    state.mouseSmooth.lerp(state.mouse, reducedMotion ? 1 : 0.05);

    // Logo placement: right side of the hero on desktop, top on mobile.
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
