// Red Dot: scroll-driven real-time 3D evening (Three.js + GSAP ScrollTrigger).
// The procedural street and room are an impression, not a depiction of the actual building.
// Real photos (Red Dot's own gallery) appear only framed on the bar wall.
import * as THREE from 'three';
import { EffectComposer } from './vendor/pp/EffectComposer.js';
import { RenderPass } from './vendor/pp/RenderPass.js';
import { UnrealBloomPass } from './vendor/pp/UnrealBloomPass.js';
import { BokehPass } from './vendor/pp/BokehPass.js';
import { ShaderPass } from './vendor/pp/ShaderPass.js';
import { OutputPass } from './vendor/pp/OutputPass.js';

const B = document.body;
function fallback(){ B.classList.remove('exp','past'); const e = document.getElementById('exp'); if (e) e.remove(); }
if (B.classList.contains('exp')) { try { start(); } catch (e) { console.warn('3D unavailable, showing the full page', e); fallback(); } }

function start(){
const canvas = document.getElementById('scene');
const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 900;
const cores = navigator.hardwareConcurrency || 4;
const q = new URLSearchParams(location.search);
let tier = coarse ? (cores >= 6 ? 1 : 0) : 2;           // 0 low-power, 1 mobile, 2 desktop
if (q.has('tier')) tier = +q.get('tier');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier === 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, tier === 2 ? 1.75 : tier === 1 ? 1.5 : 1));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback(); });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060c);
scene.fog = new THREE.FogExp2(0x070812, 0.028);
const camera = new THREE.PerspectiveCamera(innerWidth < 900 ? 62 : 50, innerWidth / innerHeight, 0.05, 200);

// ---------- procedural textures ----------
function tex(w, h, draw, rep){ const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const rnd = (a, b) => a + Math.random() * (b - a);
function noise(g, w, h, n, a){ for (let i = 0; i < n; i++){ const v = Math.random() < .5 ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(rnd(0,w), rnd(0,h), rnd(1,3), rnd(1,3)); } }
const brick = tex(256, 256, (g, w, h) => { g.fillStyle = '#3a2620'; g.fillRect(0,0,w,h);
  for (let y = 0; y < h; y += 16) for (let x = (y/16)%2 ? -16 : 0; x < w; x += 32){ const v = rnd(.75, 1.1); g.fillStyle = `rgb(${92*v|0},${52*v|0},${40*v|0})`; g.fillRect(x+1, y+1, 30, 14); }
  noise(g, w, h, 1800, .05); }, [3, 3]);
const plaster = tex(256, 256, (g, w, h) => { g.fillStyle = '#5a1f1b'; g.fillRect(0,0,w,h); noise(g, w, h, 5000, .035); }, [3, 2]);
const wood = tex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32){ const v = rnd(.8, 1.15); g.fillStyle = `rgb(${88*v|0},${54*v|0},${32*v|0})`; g.fillRect(0, y, w, 31);
  for (let k = 0; k < 14; k++){ g.strokeStyle = `rgba(30,15,8,${rnd(.08,.22)})`; g.beginPath(); const yy = y + rnd(2, 29); g.moveTo(0, yy); g.bezierCurveTo(w*.3, yy+rnd(-3,3), w*.6, yy+rnd(-3,3), w, yy+rnd(-2,2)); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(rnd(0,w), y, 2, 31); } }, [4, 4]);
const asphalt = tex(256, 256, (g, w, h) => { g.fillStyle = '#16171b'; g.fillRect(0,0,w,h); noise(g, w, h, 6000, .06); }, [8, 30]);
function windowsTex(cols, rows){ return tex(256, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0,0,w,h);
  const cw = w/cols, rh = h/rows; for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++){ if (Math.random() > .38) continue;
    const warm = Math.random() < .8; g.fillStyle = warm ? `rgba(255,${rnd(170,205)|0},${rnd(100,140)|0},${rnd(.5,.95)})` : 'rgba(150,180,255,.55)';
    g.fillRect(c*cw + cw*.3, r*rh + rh*.22, cw*.4, rh*.52); g.fillStyle = 'rgba(20,12,8,.85)'; g.fillRect(c*cw + cw*.495, r*rh + rh*.22, cw*.03, rh*.52); g.fillRect(c*cw + cw*.3, r*rh + rh*.45, cw*.4, rh*.025); } }); }
const haloTex = tex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64,64,0,64,64,64); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.25,'rgba(255,255,255,.35)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0,0,w,h); });

const M = {
  brick: new THREE.MeshStandardMaterial({ map: brick, roughness: .92 }),
  plaster: new THREE.MeshStandardMaterial({ map: plaster, roughness: .85 }),
  wood: new THREE.MeshStandardMaterial({ map: wood, roughness: .55 }),
  darkwood: new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: .35, metalness: .1 }),
  road: new THREE.MeshStandardMaterial({ map: asphalt, roughness: .28, metalness: .55, color: 0x9a9aa4 }),
  curb: new THREE.MeshStandardMaterial({ color: 0x3b3b40, roughness: .8 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: .4, metalness: .85 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb98a46, roughness: .3, metalness: 1 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe0a524, roughness: .45 }),
};
const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
const glow = (color, s, op = .5) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(s, s, 1); return sp; };

// ---------- Warren Street ----------
add(new THREE.PlaneGeometry(10, 140), M.road, 0, 0, -10).rotation.x = -Math.PI/2;
[-6.2, 6.2].forEach(x => add(new THREE.BoxGeometry(2.6, .16, 140), M.curb, x, .08, -10));
const facades = new THREE.Group(); scene.add(facades);
function building(side, z0, len, h){
  const col = new THREE.Color().setHSL(rnd(0, .06), .35, rnd(.55, .8));
  const em = windowsTex(Math.max(2, len/1.6|0), Math.max(3, h/2.2|0));
  const mat = new THREE.MeshStandardMaterial({ map: brick, color: col, roughness: .9, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 1.1 });
  add(new THREE.BoxGeometry(1.5, h, len), mat, side*8.25, h/2, z0 - len/2, facades);
  add(new THREE.BoxGeometry(1.9, .35, len + .1), M.darkwood, side*7.7, h + .1, z0 - len/2, facades);
}
for (const side of [1, -1]){ let z = 52; while (z > -60){ const len = rnd(5, 9); if (!(side === 1 && z > -7 && z - len < 7)) building(side, z, len, rnd(7, 13)); z -= len + .05; } }

// Red Dot building: facade plane x = FX, door at z = 0 (an impression, not the real facade)
const FX = 6.75, rd = new THREE.Group(); scene.add(rd);
const facMat = new THREE.MeshStandardMaterial({ color: 0x7a2220, roughness: .7 });
const upper = new THREE.MeshStandardMaterial({ map: brick, color: 0x9a4a40, roughness: .85, emissive: 0xffffff, emissiveMap: windowsTex(4, 3), emissiveIntensity: .9 });
add(new THREE.BoxGeometry(.4, 4.6, 13), upper, FX + .2, 6.7, 0, rd);
add(new THREE.BoxGeometry(.4, 4.4, 2.0), facMat, FX + .2, 2.2, -5.5, rd);
add(new THREE.BoxGeometry(.4, 4.4, 2.0), facMat, FX + .2, 2.2, 5.5, rd);
add(new THREE.BoxGeometry(.4, 1.6, 9), facMat, FX + .2, 3.6, 0, rd);
add(new THREE.BoxGeometry(.4, .7, 3.7), facMat, FX + .2, .35, -2.65, rd);
add(new THREE.BoxGeometry(.4, .7, 3.7), facMat, FX + .2, .35, 2.65, rd);
add(new THREE.BoxGeometry(.4, 2.1, .3), facMat, FX + .2, 1.75, -.95, rd);
add(new THREE.BoxGeometry(.4, 2.1, .3), facMat, FX + .2, 1.75, .95, rd);
add(new THREE.BoxGeometry(.4, 2.1, .3), facMat, FX + .2, 1.75, -4.35, rd);
add(new THREE.BoxGeometry(.4, 2.1, .3), facMat, FX + .2, 1.75, 4.35, rd);
const glass = new THREE.MeshStandardMaterial({ color: 0x1a0e08, emissive: 0xffa94d, emissiveIntensity: .55, roughness: .05, metalness: .2, transparent: true, opacity: .5 });
[-2.65, 2.65].forEach(zz => { add(new THREE.PlaneGeometry(3.1, 2.1), glass, FX + .05, 1.75, zz, rd).rotation.y = -Math.PI/2; });
function drawNum(g){ g.fillStyle = '#120b07'; g.fillRect(0,0,512,128); g.fillStyle = '#e9b45c'; g.font = '600 92px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('321', 256, 70); }
const numTex = tex(512, 128, drawNum);
add(new THREE.PlaneGeometry(1.4, .35), new THREE.MeshStandardMaterial({ map: numTex, emissive: 0xffffff, emissiveMap: numTex, emissiveIntensity: .8 }), FX - .01, 3.05, 0, rd).rotation.y = -Math.PI/2;
add(new THREE.BoxGeometry(1.1, .08, 9.2), M.metal, FX - .5, 3.35, 0, rd);

// THE red dot sign, hung over the door
const sign = new THREE.Group(); sign.position.set(FX - 1.25, 4.35, .9); scene.add(sign);
add(new THREE.BoxGeometry(1.6, .06, .06), M.metal, .55, .78, 0, sign);
add(new THREE.CylinderGeometry(.012, .012, .2, 6), M.metal, -.1, .66, 0, sign);
add(new THREE.CylinderGeometry(.012, .012, .2, 6), M.metal, .1, .66, 0, sign);
const ring = add(new THREE.TorusGeometry(.62, .05, 16, 64), M.brass, 0, 0, 0, sign);
const dotMat = new THREE.MeshStandardMaterial({ color: 0x400806, emissive: 0xff1f1a, emissiveIntensity: 2.6, roughness: .3 });
const dot = add(new THREE.CylinderGeometry(.58, .58, .1, 64), dotMat, 0, 0, 0, sign); dot.rotation.x = Math.PI/2;
const signLight = new THREE.PointLight(0xff2a1f, 14, 9, 1.6); signLight.position.set(0, -.4, .6); sign.add(signLight);
const halo = glow(0xff3326, 3.4, .55); sign.add(halo);

// street lamps
[[-5.6, 30], [5.6, 16], [-5.6, 4], [5.6, -12], [-5.6, -24]].forEach(([x, zz], i) => {
  add(new THREE.CylinderGeometry(.06, .09, 4.6, 8), M.metal, x, 2.3, zz);
  add(new THREE.BoxGeometry(.7, .06, .06), M.metal, x - Math.sign(x)*.3, 4.6, zz);
  const head = add(new THREE.SphereGeometry(.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd8a0 }), x - Math.sign(x)*.6, 4.48, zz);
  head.add(glow(0xffb870, 2.2));
  if (i < (tier ? 4 : 2)){ const L = new THREE.PointLight(0xffb36b, 10, 14, 1.4); L.position.copy(head.position); L.position.y -= .2; scene.add(L); }
});
scene.add(new THREE.HemisphereLight(0x5a6aa0, 0x1a1210, .32));
const moon = new THREE.DirectionalLight(0x8090c0, .25); moon.position.set(-10, 20, 10); scene.add(moon);
{ const n = 500, p = new Float32Array(n*3); for (let i = 0; i < n; i++){ p[i*3] = rnd(-60,60); p[i*3+1] = rnd(16,50); p[i*3+2] = rnd(-90,30); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd6ff, size: .12, fog: false }))); }

// ---------- inside the bar ----------
const room = new THREE.Group(); scene.add(room);
const IX0 = 6.95, IX1 = 18, IZ = 5, IH = 3.8, IC = (IX0 + IX1)/2, IL = IX1 - IX0;
add(new THREE.PlaneGeometry(IL, IZ*2), M.wood, IC, .01, 0, room).rotation.x = -Math.PI/2;
add(new THREE.PlaneGeometry(IL, IZ*2), new THREE.MeshStandardMaterial({ color: 0x1b0f0b, roughness: .9 }), IC, IH, 0, room).rotation.x = Math.PI/2;
add(new THREE.PlaneGeometry(IL, IH), M.plaster, IC, IH/2, IZ, room).rotation.y = Math.PI;
add(new THREE.PlaneGeometry(IL, IH), M.brick, IC, IH/2, -IZ, room);
add(new THREE.BoxGeometry(.2, IH, IZ - .9), M.plaster, IX1, IH/2, -(IZ + .9)/2, room);
add(new THREE.BoxGeometry(.2, IH, IZ - .9), M.plaster, IX1, IH/2, (IZ + .9)/2, room);
add(new THREE.BoxGeometry(.2, IH - 2.5, 1.8), M.plaster, IX1, 2.5 + (IH - 2.5)/2, 0, room);
add(new THREE.BoxGeometry(IL, 1.0, .05), M.darkwood, IC, .5, IZ - .03, room);
// garden glimpse with the outdoor fire
add(new THREE.PlaneGeometry(6, 3.4), new THREE.MeshBasicMaterial({ color: 0x0a0604 }), IX1 + 3, 1.7, 0, room).rotation.y = -Math.PI/2;
const fireCore = add(new THREE.SphereGeometry(.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff7a2a }), IX1 + 2, .4, 0, room);
const fireSprite = glow(0xff8a3a, 3, .9); fireCore.add(fireSprite);
const fireLight = new THREE.PointLight(0xff7a2a, 12, 9, 1.5); fireLight.position.set(IX1 + .8, 1.0, 0); room.add(fireLight);
add(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0x0e0f0a, roughness: 1 }), IX1 + 3, .005, 0, room).rotation.x = -Math.PI/2;
// bar counter, back bar, bottles
add(new THREE.BoxGeometry(8.2, 1.05, .7), M.darkwood, 12, .525, -3.75, room);
add(new THREE.BoxGeometry(8.4, .07, .9), new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: .18, metalness: .2 }), 12, 1.085, -3.7, room);
add(new THREE.BoxGeometry(8.2, .04, .04), M.brass, 12, .22, -3.35, room);
for (let s = 0; s < 3; s++) add(new THREE.BoxGeometry(7.6, .05, .32), M.darkwood, 12, 1.5 + s*.5, -4.82, room);
add(new THREE.BoxGeometry(7.6, .03, .03), new THREE.MeshBasicMaterial({ color: 0xffc27a }), 12, 1.47, -4.68, room);
{ const g = new THREE.CylinderGeometry(.045, .05, .3, 10); const cols = [0x2f6b3a, 0x7a3b12, 0xb88a2c, 0x2a3e6b, 0x6b1414, 0xcfc8b0];
  const mats = cols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .15, emissive: c, emissiveIntensity: .35, transparent: true, opacity: .9 }));
  const n = tier ? 66 : 42; for (let i = 0; i < n; i++){ const s = i % 3; const m = add(g, mats[i % mats.length], 8.4 + (i/3|0) * (7.2/(n/3)) + rnd(-.03,.03), 1.68 + s*.5, -4.82, room); m.scale.y = rnd(.85, 1.25); } }
for (let i = 0; i < 7; i++){ const x = 8.6 + i*1.1; add(new THREE.CylinderGeometry(.2, .2, .07, 20), M.yellow, x, .78, -3.05, room); add(new THREE.CylinderGeometry(.025, .025, .75, 8), M.metal, x, .39, -3.05, room); }
// pendants with volumetric light cones
const coneMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uColor: { value: new THREE.Color(0xffb46a) }, uI: { value: .22 } },
  vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uColor; uniform float uI; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float rim = pow(abs(dot(vN, vV)), 1.6); gl_FragColor = vec4(uColor * uI * vY * vY * rim, 1.); }' });
for (let i = 0; i < 4; i++){ const x = 9 + i*2.1, y = 2.55;
  add(new THREE.CylinderGeometry(.006, .006, IH - y, 4), M.metal, x, y + (IH - y)/2, -3.6, room);
  add(new THREE.ConeGeometry(.24, .26, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d3a2c, roughness: .4, metalness: .5, side: THREE.DoubleSide }), x, y, -3.6, room);
  add(new THREE.SphereGeometry(.07, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe0b0 }), x, y - .1, -3.6, room);
  add(new THREE.CylinderGeometry(.18, .95, 2.4, 32, 1, true), coneMat, x, y - 1.3, -3.6, room);
}
const barLights = [new THREE.PointLight(0xffa860, 9, 7, 1.5), new THREE.PointLight(0xffa860, 9, 7, 1.5)];
barLights[0].position.set(10, 2.3, -3.3); barLights[1].position.set(14.2, 2.3, -3.3); barLights.forEach(l => room.add(l));
const fill = new THREE.PointLight(0xff9a55, 5, 12, 1.2); fill.position.set(11, 3.2, 2); room.add(fill);
const roomAmb = new THREE.AmbientLight(0x3a1c10, .9); room.add(roomAmb);
const flames = [];
for (let i = 0; i < 4; i++){ const x = 8.8 + i*2.2, zz = 3.6;
  add(new THREE.CylinderGeometry(.42, .42, .04, 28), M.darkwood, x, .76, zz, room);
  add(new THREE.CylinderGeometry(.04, .06, .74, 10), M.metal, x, .38, zz, room);
  add(new THREE.CylinderGeometry(.035, .035, .1, 12), new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: .6 }), x, .83, zz, room);
  const fl = glow(0xffb04a, .4, 1); fl.position.set(x, .92, zz); room.add(fl); flames.push(fl); }
const candleLight = new THREE.PointLight(0xffa040, 4, 6, 1.6); candleLight.position.set(11.5, 1.1, 3.4); room.add(candleLight);

// framed real photos on the north wall (on-screen size stays below the 800px source)
const loader = new THREE.TextureLoader(), frames = [];
[{ src: 'img/salmon.jpg', x: 8.6, w: 1, h: 1, tab: 'dinner' }, { src: 'img/shishito.jpg', x: 10.4, w: 1, h: 1, tab: 'dinner' },
 { src: 'img/bar-frame-504.jpg', x: 12.4, w: 1.04, h: 1.3, tab: 'cocktails' }, { src: 'img/benedict-latke.jpg', x: 14.4, w: 1, h: 1, tab: 'brunch' },
 { src: 'img/french-toast.jpg', x: 16.2, w: 1, h: 1, tab: 'brunch' }].forEach(p => {
  const g = new THREE.Group(); g.position.set(p.x, 1.95, IZ - .06); g.rotation.y = Math.PI; room.add(g);
  add(new THREE.BoxGeometry(p.w + .2, p.h + .2, .06), M.darkwood, 0, 0, 0, g);
  add(new THREE.PlaneGeometry(p.w + .08, p.h + .08), new THREE.MeshStandardMaterial({ color: 0xefe6d4, roughness: .9 }), 0, 0, .032, g);
  const t = loader.load(p.src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const ph = add(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshStandardMaterial({ map: t, roughness: .55, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .06 }), 0, 0, .036, g);
  ph.userData = p; frames.push(ph);
  add(new THREE.BoxGeometry(.5, .04, .06), M.brass, 0, p.h/2 + .22, .12, g);
});
// chalkboard with tonight's live status
const RD = window.__redDot || {};
function wrap(g, s, x, y, mw, lh){ let line = ''; for (const wd of s.split(' ')){ const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > mw && line){ g.fillText(line, x, y); y += lh; line = wd; } else line = t; } g.fillText(line, x, y); }
function drawChalk(g){ g.fillStyle = '#1e2420'; g.fillRect(0,0,512,640);
  g.fillStyle = '#efe6d4'; g.textAlign = 'center'; g.font = 'italic 600 56px Fraunces, Georgia, serif'; g.fillText('Tonight', 256, 96);
  g.font = '600 34px "Instrument Sans", system-ui, sans-serif'; wrap(g, (RD.status && RD.status.chip) || 'Call to confirm', 256, 170, 440, 44);
  g.font = '28px "Instrument Sans", system-ui, sans-serif'; g.fillStyle = '#e9b45c';
  ['Dinner Fri–Tue 5–9:30', 'Brunch Sat & Sun 11–3', 'Wed & Thu: call', '(518) 828-3657'].forEach((s, i) => g.fillText(s, 256, 360 + i*56)); }
const chalk = tex(512, 640, drawChalk);
add(new THREE.PlaneGeometry(1.2, 1.5), new THREE.MeshStandardMaterial({ map: chalk, roughness: .9, emissive: 0xffffff, emissiveMap: chalk, emissiveIntensity: .25 }), IX1 - .12, 1.9, -2.7, room).rotation.y = -Math.PI/2;
add(new THREE.BoxGeometry(.06, 1.62, 1.32), M.darkwood, IX1 - .08, 1.9, -2.7, room);
if (document.fonts) document.fonts.ready.then(() => { drawChalk(chalk.image.getContext('2d')); chalk.needsUpdate = true; drawNum(numTex.image.getContext('2d')); numTex.needsUpdate = true; });

// dust motes in the warm light + drizzle on the street
const dustN = tier === 2 ? 900 : tier === 1 ? 450 : 200, dustPos = new Float32Array(dustN*3), dustSeed = new Float32Array(dustN);
for (let i = 0; i < dustN; i++){ dustPos[i*3] = rnd(IX0, IX1); dustPos[i*3+1] = rnd(.2, IH); dustPos[i*3+2] = rnd(-IZ, IZ); dustSeed[i] = Math.random()*6.28; }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
room.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: haloTex, color: 0xffd09a, size: .045, transparent: true, opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending })));
const mistN = tier ? 700 : 300, mistPos = new Float32Array(mistN*3);
for (let i = 0; i < mistN; i++){ mistPos[i*3] = rnd(-6, 6); mistPos[i*3+1] = rnd(0, 8); mistPos[i*3+2] = rnd(-20, 48); }
const mistGeo = new THREE.BufferGeometry(); mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ map: haloTex, color: 0xaab4d8, size: .06, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(mist);
const pLight = new THREE.PointLight(0xffc488, 0, 5, 1.4); scene.add(pLight);   // follows the pointer

// ---------- post-processing: bloom, depth of field, film grain + vignette ----------
let composer = null, bokeh = null, grain = null;
const GrainShader = { uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmt: { value: .055 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmt; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); } void main(){ vec4 c = texture2D(tDiffuse, vUv); float n = h(vUv*vec2(1024.,768.)) - .5; float v = smoothstep(.85, .25, length(vUv - .5)*1.15); c.rgb = c.rgb * mix(.55, 1., v) + n * uAmt; gl_FragColor = c; }' };
if (tier > 0){
  composer = new EffectComposer(renderer); composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  if (tier === 2){ bokeh = new BokehPass(scene, camera, { focus: 6, aperture: .0012, maxblur: .006 }); composer.addPass(bokeh); }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth/2, innerHeight/2), tier === 2 ? .85 : .7, .55, .72));
  grain = new ShaderPass(GrainShader); composer.addPass(grain);
  composer.addPass(new OutputPass());
}

// ---------- scroll-driven camera path ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const posC = new THREE.CatmullRomCurve3([V(.4,1.8,46), V(1,2.0,26), V(1.8,2.4,12), V(2.4,3.0,8), V(4.2,1.7,1.6), V(5.4,1.65,0), V(7.0,1.72,-.2), V(7.6,1.75,-.5), V(11.5,1.65,.6), V(14.2,1.65,0), V(15.4,1.6,0)], false, 'centripetal');
const lookC = new THREE.CatmullRomCurve3([V(2,2.2,0), V(3.2,2.8,0), V(4.6,3.6,1), V(FX-1.25,4.35,.9), V(FX,1.8,0), V(11,1.6,0), V(14,1.5,.2), V(14,1.55,.6), V(17,1.6,-.6), V(19,1.4,0), V(20,1.3,0)], false, 'centripetal');
const state = { bk: 0, p: 0, target: 0, mode: 'dinner', yaw: 0, pitch: 0, yawT: 0, pitchT: 0, hoverSign: false, flick: 0 };
const isInside = () => state.p > .5;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.create({ trigger: '#track', start: 'top top', end: 'bottom bottom', onUpdate: s => { state.target = s.progress; } });
ScrollTrigger.create({ trigger: 'main', start: 'top 70%', onEnter: () => B.classList.add('past'), onLeaveBack: () => B.classList.remove('past') });
gsap.utils.toArray('.ch .card:not(.card--intro)').forEach(c => gsap.fromTo(c, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: c, start: 'top 85%', toggleActions: 'play none none reverse' } }));
gsap.from('.card--intro > *', { autoAlpha: 0, y: 24, duration: 1, stagger: .09, ease: 'power3.out', delay: .15 });

// dinner / brunch switch: relights the room and flips the menu
const sw = document.getElementById('switch');
const LOOK = { dinner: { amb: 0x3a1c10, ambI: .9, bar: 0xffa860, barI: 9, cone: .22, exp: 1.05, glass: .55 }, brunch: { amb: 0xfff2dc, ambI: 2.6, bar: 0xfff6e8, barI: 7, cone: .0, exp: 1.35, glass: 1.4 } };
function setMode(m, fromTab){ if (m !== 'dinner' && m !== 'brunch') return; state.mode = m; B.setAttribute('data-mode', m);
  sw.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  const L = LOOK[m], c = new THREE.Color(L.amb), bc = new THREE.Color(L.bar);
  gsap.to(roomAmb.color, { r: c.r, g: c.g, b: c.b, duration: 1.2 }); gsap.to(roomAmb, { intensity: L.ambI, duration: 1.2 });
  barLights.forEach(l => { gsap.to(l.color, { r: bc.r, g: bc.g, b: bc.b, duration: 1.2 }); gsap.to(l, { intensity: L.barI, duration: 1.2 }); });
  gsap.to(state, { bk: m === 'brunch' ? 1 : 0, duration: 1.2 }); gsap.to(coneMat.uniforms.uI, { value: L.cone, duration: 1.2 }); gsap.to(renderer, { toneMappingExposure: L.exp, duration: 1.2 }); gsap.to(glass, { emissiveIntensity: L.glass, duration: 1.2 });
  if (!fromTab){ const l = document.querySelector('#menu [role=tablist]'); if (l && l._sel) l._sel(m); } }
sw.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
document.addEventListener('rd:tab', e => { if (e.detail === 'dinner' || e.detail === 'brunch') setMode(e.detail, true); });
setMode(RD.status && RD.status.mode === 'brunch' ? 'brunch' : 'dinner');

// pointer / touch
const ndc = new THREE.Vector2(0, 0), ray = new THREE.Raycaster(); let pointerSeen = false, tx = null, ty = null;
addEventListener('pointermove', e => { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerSeen = true;
  if (e.pointerType === 'mouse'){ state.yawT = -ndc.x * .07; state.pitchT = ndc.y * .045; } }, { passive: true });
addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; ndc.set(tx / innerWidth * 2 - 1, -(ty / innerHeight) * 2 + 1); pointerSeen = true; }, { passive: true });
addEventListener('touchmove', e => { const t = e.touches[0]; if (tx === null) return; const dx = t.clientX - tx, dy = t.clientY - ty;
  if (Math.abs(dx) > Math.abs(dy)) state.yawT = THREE.MathUtils.clamp(state.yawT - dx * .0035, -.55, .55); tx = t.clientX; ty = t.clientY; ndc.set(tx / innerWidth * 2 - 1, -(ty / innerHeight) * 2 + 1); }, { passive: true });
const hit = objs => { ray.setFromCamera(ndc, camera); return ray.intersectObjects(objs, false)[0]; };
const track = document.getElementById('track');
track.addEventListener('click', e => { if (e.target.closest('a,button,.card')) return; ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (state.p < .5 && hit([dot, ring])){ state.flick = .9; document.getElementById('ch-bar').scrollIntoView({ behavior: 'smooth' }); return; }
  const f = isInside() && hit(frames); if (f && RD.open) RD.open('menu', { tab: f.object.userData.tab }); });

// hotspots projected from 3D anchors
const anchors = { menu: V(15.3, 2.85, IZ - .1), hours: V(IX1 - .15, 2.85, -2.7), reserve: V(11.5, 1.4, -3.5), parties: V(IX1 - .1, 2.2, 0), visit: V(15.3, .95, 3.6) };
const hots = [...document.querySelectorAll('.hot')], tmp = new THREE.Vector3();
function placeHots(){
  const show = isInside() && !B.classList.contains('past');
  sw.classList.toggle('on', show);
  hots.forEach(h => { tmp.copy(anchors[h.dataset.anchor]).project(camera);
    const vis = show && tmp.z < 1 && Math.abs(tmp.x) < .9 && tmp.y > -.72 && tmp.y < .74;
    h.classList.toggle('on', vis); h.tabIndex = vis ? 0 : -1;
    if (vis) h.style.transform = `translate(${((tmp.x*.5+.5)*innerWidth).toFixed(1)}px,${((-tmp.y*.5+.5)*innerHeight).toFixed(1)}px) translate(-50%,-50%)`; });
}

// ambient sound: synthesized room tone + soft chord, off by default
let ac = null, master = null; const snd = document.getElementById('snd');
snd.addEventListener('click', () => { const on = snd.getAttribute('aria-pressed') !== 'true';
  if (on && !ac){ ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++){ last = (last + .02 * (Math.random()*2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; src.connect(lp); lp.connect(master); src.start();
    [130.81, 164.81, 196, 246.94].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = .018; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .05 + i*.03; lg.gain.value = .012; lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(master); o.start(); lfo.start(); }); }
  if (ac){ ac.resume(); master.gain.setTargetAtTime(on ? .5 : 0, ac.currentTime, .4); }
  snd.setAttribute('aria-pressed', on); snd.setAttribute('aria-label', 'Ambient sound, ' + (on ? 'on' : 'off')); snd.querySelector('.snd-l').textContent = on ? 'SOUND ON' : 'SOUND OFF'; });

// render loop
const clock = new THREE.Clock(), prog = document.getElementById('prog'), lookV = new THREE.Vector3(); let slow = 0, nF = 0;
function resize(){ camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 900 ? 62 : 50; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); if (composer) composer.setSize(innerWidth, innerHeight); }
addEventListener('resize', resize);
let running = false;
function frame(){
  if (document.hidden){ running = false; return; }
  const dt = Math.min(clock.getDelta(), .1), t = clock.elapsedTime;
  state.p += (state.target - state.p) * Math.min(1, dt * 4); if (Math.abs(state.target - state.p) < 1e-4) state.p = state.target;
  const p = state.p;
  posC.getPoint(p, camera.position); lookC.getPoint(p, lookV);
  camera.position.y += Math.sin(t * .6) * .012;
  camera.lookAt(lookV);
  state.yaw += (state.yawT - state.yaw) * Math.min(1, dt * 3); state.pitch += (state.pitchT - state.pitch) * Math.min(1, dt * 3);
  camera.rotateOnWorldAxis(camera.up, state.yaw); camera.rotateX(state.pitch); camera.updateMatrixWorld();
  prog.style.width = (p * 100).toFixed(1) + '%';
  const hov = pointerSeen && p < .5 && !!hit([dot, ring]);
  if (hov && !state.hoverSign) state.flick = .7; state.hoverSign = hov; track.style.cursor = hov ? 'pointer' : '';
  let si = 2.6 + Math.sin(t * 2.1) * .12;
  if (state.flick > 0){ state.flick -= dt; si = Math.random() < .45 ? .2 : 3.0; }
  dotMat.emissiveIntensity = si; signLight.intensity = si * 4.4; halo.material.opacity = .17 * si;
  if (pointerSeen){ tmp.set(ndc.x, ndc.y, .5).unproject(camera).sub(camera.position).normalize().multiplyScalar(isInside() ? 2.6 : 4).add(camera.position); pLight.position.lerp(tmp, Math.min(1, dt * 6)); pLight.intensity = isInside() ? 6 : 3; }
  flames.forEach((f, i) => { const k = .85 + Math.sin(t * 9 + i * 2) * .08 + Math.random() * .07; f.scale.set(.32 * k, .5 * k, 1); });
  candleLight.intensity = 3.6 + Math.random() * .9;
  fireLight.intensity = 10 + Math.sin(t * 7) * 1.5 + Math.random() * 2.5; fireSprite.scale.setScalar(2.8 + Math.random() * .4);
  const a = dustGeo.attributes.position.array; for (let i = 0; i < dustN; i++){ a[i*3+1] += Math.sin(t * .3 + dustSeed[i]) * .0009 + .0004; if (a[i*3+1] > IH) a[i*3+1] = .2; a[i*3] += Math.cos(t * .2 + dustSeed[i]) * .0007; }
  dustGeo.attributes.position.needsUpdate = true;
  if (p < .6){ const m = mistGeo.attributes.position.array; for (let i = 0; i < mistN; i++){ m[i*3+1] -= .012; if (m[i*3+1] < 0) m[i*3+1] = 8; } mistGeo.attributes.position.needsUpdate = true; }
  const inside = THREE.MathUtils.smoothstep(p, .44, .56);
  scene.fog.density = .028 - inside * .012;
  const bk = state.bk * inside; scene.fog.color.setRGB(.027 + inside * .05 + bk * .45, .03 + inside * .02 + bk * .4, .07 - inside * .05 + bk * .33); scene.fog.density = (.028 - inside * .012) * (1 - bk * .5); scene.background.setRGB(.02 + bk * .5, .024 + bk * .45, .047 + bk * .38); fireLight.visible = bk < .9;
  room.visible = p > .3; facades.visible = p < .62; mist.visible = p < .6;
  if (bokeh){ bokeh.uniforms.focus.value = camera.position.distanceTo(lookV) * (inside > .5 ? .55 : .9); bokeh.uniforms.aperture.value = inside > .5 ? .0016 : .0008; }
  if (grain) grain.uniforms.uTime.value = t % 10;
  placeHots();
  if (composer) composer.render(dt); else renderer.render(scene, camera);
  if (++nF > 30){ slow = slow * .95 + (dt > .045 ? .05 : 0);
    if (slow > .6){ slow = 0; if (bokeh){ bokeh.enabled = false; bokeh = null; } else if (renderer.getPixelRatio() > 1){ renderer.setPixelRatio(1); if (composer) composer.setPixelRatio(1); resize(); } } }
  requestAnimationFrame(frame);
}
function go(){ if (!running){ running = true; clock.getDelta(); requestAnimationFrame(frame); } }
document.addEventListener('visibilitychange', go);
resize(); go();
window.__rd3d = { state, setMode, tier };
}
