import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import Svg, { Circle, G, Text as SvgText, Path, Rect } from 'react-native-svg';
import { Audio } from 'expo-av';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import { enrichArtwork, recommendArtwork } from '../data/artworks';
import { FONTS } from '../theme';

// ─── Per-artwork local images ─────────────────────────────────────────────────
// Only used in BeaconPanel cards. ArtworkPlayer shows the animated blob instead.
const ARTWORK_IMAGES = {
  'SW-01': require('../../assets/images/sw-01.jpg'),
  'SW-02': require('../../assets/images/sw-02.jpg'),
  'SW-03': require('../../assets/images/sw-03.jpg'),
  'SW-04': require('../../assets/images/sw-04.jpg'),
  'SW-05': require('../../assets/images/sw-05.jpg'),
  'SW-06': require('../../assets/images/sw-06.jpg'),
  'SW-07': require('../../assets/images/sw-07.jpg'),
  'SW-08': require('../../assets/images/sw-08.jpg'),
  'SW-09': require('../../assets/images/sw-09.jpg'),
  'SW-10': require('../../assets/images/sw-10.jpg'),
  'SW-11': require('../../assets/images/sw-11.jpg'),
  'SW-12': require('../../assets/images/sw-12.jpg'),
};

// ─── Per-artwork audio files ───────────────────────────────────────────────────
const ARTWORK_AUDIO = {
  'SW-01': require('../../assets/audio/sw-01.mp3'),
  'SW-02': require('../../assets/audio/sw-02.mp3'),
  'SW-03': require('../../assets/audio/sw-03.mp3'),
  'SW-04': require('../../assets/audio/sw-04.mp3'),
  'SW-05': require('../../assets/audio/sw-05.mp3'),
  'SW-06': require('../../assets/audio/sw-06.mp3'),
  'SW-07': require('../../assets/audio/sw-07.mp3'),
  'SW-08': require('../../assets/audio/sw-08.mp3'),
  'SW-09': require('../../assets/audio/sw-09.mp3'),
  'SW-10': require('../../assets/audio/sw-10.mp3'),
  'SW-11': require('../../assets/audio/sw-11.mp3'),
  'SW-12': require('../../assets/audio/sw-12.mp3'),
};

// ─── Beacon-proximity ambient audio (optional intro tones) ────────────────────
const AUDIO_MAP = {
  A: require('../../assets/audio/beacon-a.mp3'),
  B: require('../../assets/audio/beacon-b.mp3'),
  C: require('../../assets/audio/beacon-c.mp3'),
  D: require('../../assets/audio/beacon-d.mp3'),
};

// BeaconManager ID ('A'–'D') → BEACON_CONFIGS blobIndex (0–3)
// Mirrors the Beacon A/B/C/D → blob comments inside BLOBS below
const BEACON_ID_TO_BLOB = { A: 0, C: 1, B: 2, D: 3 };

const { width, height } = Dimensions.get('window');

const ARTWORK_DURATION = 180; // 3:00

// ─── Beacon configs (one per blob) ───────────────────────────────────────────
// Artwork IDs are globally unique so a single listenedArtworks Set works for all beacons.
// Placeholders — the user will provide the real artwork titles/artists later.
const BEACON_CONFIGS = [
  // ── 0 · Blue — Beacon 1 ───────────────────────────────────────────────────
  {
    blobIndex: 0,
    color: '#3A9FFF',
    artworks: [
      {
        id:     0,
        code:   'SW-01',
        title:  'INFANTE AND DOG',
        artist: 'Diego Velázquez',
        year:   '1660',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Diego_Vel%C3%A1zquez_-_Felipe_Pr%C3%B3spero.jpg/400px-Diego_Vel%C3%A1zquez_-_Felipe_Pr%C3%B3spero.jpg',
      },
      {
        id:     1,
        code:   'SW-02',
        title:  'A LADY AND GENTLEMAN\nIN BLACK',
        artist: 'Rembrandt van Rijn',
        year:   '1633',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Rembrandt_van_Rijn_-_A_Lady_and_Gentleman_in_Black.jpg/400px-Rembrandt_van_Rijn_-_A_Lady_and_Gentleman_in_Black.jpg',
      },
      {
        id:     2,
        code:   'SW-07',
        title:  'STILL LIFE WITH CHERRIES',
        artist: 'Paul Cézanne',
        year:   '1885',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Cezanne_-_Still_Life_with_Cherries_and_Peaches.jpg/400px-Cezanne_-_Still_Life_with_Cherries_and_Peaches.jpg',
      },
    ],
  },

  // ── 1 · Orange — Beacon 2 ─────────────────────────────────────────────────
  {
    blobIndex: 1,
    color: '#FF6820',
    artworks: [
      {
        id:     3,
        code:   'SW-12',
        title:  'PORTRAIT OF A YOUNG MAN',
        artist: 'Raphael',
        year:   '1513',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Raffaello_Sanzio_-_Portrait_of_a_Young_Man.jpg/400px-Raffaello_Sanzio_-_Portrait_of_a_Young_Man.jpg',
      },
      {
        id:     4,
        code:   'SW-05',
        title:  'POPPY FLOWER',
        artist: 'Vincent van Gogh',
        year:   '1887',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Van_Gogh_-_Vase_with_Poppies.jpg/400px-Van_Gogh_-_Vase_with_Poppies.jpg',
      },
      {
        id:     5,
        code:   'SW-08',
        title:  'ODALISQUE SUR LA TERRASSE',
        artist: 'Henri Matisse',
        year:   '1928',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Henri_Matisse%2C_1923_-_Odalisque_with_Magnolias.jpg/400px-Henri_Matisse%2C_1923_-_Odalisque_with_Magnolias.jpg',
      },
    ],
  },

  // ── 2 · Pink — Beacon 4 ───────────────────────────────────────────────────
  {
    blobIndex: 2,
    color: '#FF2D78',
    artworks: [
      {
        id:     6,
        code:   'SW-03',
        title:  'THE STORM ON THE\nSEA OF GALILEE',
        artist: 'Rembrandt van Rijn',
        year:   '1633',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/f/f3/Rembrandt_Christ_in_the_Storm_on_the_Sea_of_Galilee.jpg',
      },
      {
        id:     7,
        code:   'SW-04',
        title:  'MAN WITH A PIPE',
        artist: 'Jean Metzinger',
        year:   '1912',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Jean_Metzinger%2C_1912%2C_Le_fumeur_%28Man_with_a_Pipe%29%2C_oil_on_canvas%2C_129.5_x_96.5_cm%2C_Solomon_R._Guggenheim_Museum.jpg/400px-Jean_Metzinger%2C_1912%2C_Le_fumeur_%28Man_with_a_Pipe%29%2C_oil_on_canvas%2C_129.5_x_96.5_cm%2C_Solomon_R._Guggenheim_Museum.jpg',
      },
      {
        id:     8,
        code:   'SW-11',
        title:  'THE PAINTER ON HIS\nWAY TO WORK',
        artist: 'Vincent van Gogh',
        year:   '1888',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vincent_van_Gogh_-_The_Painter_on_His_Way_to_Work.jpg/400px-Vincent_van_Gogh_-_The_Painter_on_His_Way_to_Work.jpg',
      },
    ],
  },

  // ── 3 · Green — Beacon 3 ──────────────────────────────────────────────────
  {
    blobIndex: 3,
    color: '#AAFF22',
    artworks: [
      {
        id:     9,
        code:   'SW-06',
        title:  'A BOY DRINKING',
        artist: 'Annibale Carracci',
        year:   '1582',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Annibale_Carracci_-_A_Boy_Drinking.jpg/400px-Annibale_Carracci_-_A_Boy_Drinking.jpg',
      },
      {
        id:     10,
        code:   'SW-10',
        title:  'LE PIGEON AUX PETITS POIS',
        artist: 'Pablo Picasso',
        year:   '1911',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Pablo_Picasso%2C_1911%2C_The_Poet_%28Le_po%C3%A8te%29%2C_oil_on_linen%2C_131.2_x_89.5_cm.jpg/400px-Pablo_Picasso%2C_1911%2C_The_Poet_%28Le_po%C3%A8te%29%2C_oil_on_linen%2C_131.2_x_89.5_cm.jpg',
      },
      {
        id:     11,
        code:   'SW-09',
        title:  'NATIVITY WITH ST. FRANCIS\nAND ST. LAWRENCE',
        artist: 'Caravaggio',
        year:   '1609',
        uri:    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Caravaggio_-_Nativit%C3%A0_con_i_Santi_Lorenzo_e_Francesco_d%27Assisi.jpg/400px-Caravaggio_-_Nativit%C3%A0_con_i_Santi_Lorenzo_e_Francesco_d%27Assisi.jpg',
      },
    ],
  },
];

// Merge CSV metadata into every artwork object
BEACON_CONFIGS.forEach(cfg => {
  cfg.artworks = cfg.artworks.map(enrichArtwork);
});

// Total number of unique artworks across all beacons
const TOTAL_ARTWORKS = BEACON_CONFIGS.reduce((sum, cfg) => sum + cfg.artworks.length, 0);

// ─── WebGL lava-lamp background (web only) ────────────────────────────────────
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

const WGL_VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}`;

const WGL_FRAG = `precision highp float;
uniform vec2 u_res;uniform float u_time;uniform float u_d[24];
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);
  float a=hash(i);float b=hash(i+vec2(1,0));
  float c=hash(i+vec2(0,1));float d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.;float a=0.5;
  for(int i=0;i<4;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;float ar=u_res.x/u_res.y;
  float bx0=u_d[0],by0=u_d[1],r0=u_d[8];
  float bx1=u_d[2],by1=u_d[3],r1=u_d[9];
  float bx2=u_d[4],by2=u_d[5],r2=u_d[10];
  float bx3=u_d[6],by3=u_d[7],r3=u_d[11];
  vec3 c0=vec3(u_d[12],u_d[13],u_d[14]);
  vec3 c1=vec3(u_d[15],u_d[16],u_d[17]);
  vec3 c2=vec3(u_d[18],u_d[19],u_d[20]);
  vec3 c3=vec3(u_d[21],u_d[22],u_d[23]);
  vec2 d0=vec2((uv.x-bx0)*ar,uv.y-by0);
  vec2 d1=vec2((uv.x-bx1)*ar,uv.y-by1);
  vec2 d2=vec2((uv.x-bx2)*ar,uv.y-by2);
  vec2 d3=vec2((uv.x-bx3)*ar,uv.y-by3);
  float w0=(r0*r0)/(dot(d0,d0)+0.0001);
  float w1=(r1*r1)/(dot(d1,d1)+0.0001);
  float w2=(r2*r2)/(dot(d2,d2)+0.0001);
  float w3=(r3*r3)/(dot(d3,d3)+0.0001);
  float sum=w0+w1+w2+w3;
  float dn=max(w0+w1+w2+w3,0.0001);
  vec3 bc=(c0*w0+c1*w1+c2*w2+c3*w3)/dn;
  vec3 bg=vec3(0.02,0.02,0.02);
  float alpha=smoothstep(0.82,1.05,sum);
  float glow=smoothstep(0.28,0.92,sum)*0.38;
  vec3 col=mix(bg+bc*glow,bc,alpha);
  col*=mix(.7,1.,1.-smoothstep(.3,.9,length(uv-.5)*1.4));
  gl_FragColor=vec4(col,1.);}`;

function LavaLampWebGL({ nudgingBlobIndex }) {
  const viewRef    = useRef(null);
  const nudgeRef   = useRef(nudgingBlobIndex);
  useEffect(() => { nudgeRef.current = nudgingBlobIndex; }, [nudgingBlobIndex]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const container = viewRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    container.appendChild(canvas);

    const resize = () => {
      canvas.width  = container.clientWidth  || window.innerWidth;
      canvas.height = container.clientHeight || window.innerHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { ro.disconnect(); canvas.remove(); return; }

    const mkS = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, mkS(gl.VERTEX_SHADER, WGL_VERT));
    gl.attachShader(prog, mkS(gl.FRAGMENT_SHADER, WGL_FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uD    = gl.getUniformLocation(prog, 'u_d');

    const colors  = BLOBS.map(b => hexToRgb(b.color));
    const bState  = BLOBS.map(blob => {
      const W = window.innerWidth, H = window.innerHeight;
      return {
        x: blob.cx / W, y: 1 - blob.cy / H,
        baseX: blob.cx / W, baseY: 1 - blob.cy / H,
        r: blob.radius / H,
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.002,
      };
    });

    const t0 = performance.now();
    let raf;

    const frame = (now) => {
      const T = (now - t0) / 1000;
      const W = canvas.width, H = canvas.height;

      // All blobs locked to their base positions — no drift
      const d = new Float32Array(24);
      for (let i = 0; i < 4; i++) {
        const isNudging = i === nudgeRef.current;
        d[i * 2]          = bState[i].baseX;
        d[i * 2 + 1]      = bState[i].baseY;
        // Recommended blob pulses gently; all others stay at exact radius
        d[8 + i]          = bState[i].r * (isNudging ? (1.0 + 0.07 * Math.sin(T * 3.0)) : 1.0);
        d[12 + i * 3]     = colors[i][0];
        d[12 + i * 3 + 1] = colors[i][1];
        d[12 + i * 3 + 2] = colors[i][2];
      }

      gl.viewport(0, 0, W, H);
      gl.uniform2f(uRes, W, H);
      gl.uniform1fv(uD, d);
      gl.uniform1f(uTime, T);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.remove();
    };
  }, []);

  return (
    <View
      ref={viewRef}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    />
  );
}

// ─── Map data ─────────────────────────────────────────────────────────────────
// ─── Layout matching the reference floorplan image ────────────────────────────
// Beacon D (Lime)   = top-centre
// Beacon C (Orange) = left-middle
// Beacon B (Pink)   = right-middle
// Beacon A (Blue)   = bottom-centre
const BLOBS = [
  { id: 0, cx: width * 0.54, cy: height * 0.11, color: '#3A9FFF', radius: 210 }, // Beacon A Blue   — top
  { id: 1, cx: width * 0.88, cy: height * 0.50, color: '#FF6820', radius: 195 }, // Beacon C Orange — right
  { id: 2, cx: width * 0.46, cy: height * 0.89, color: '#FF2D78', radius: 185 }, // Beacon B Pink   — bottom
  { id: 3, cx: width * 0.12, cy: height * 0.50, color: '#AAFF22', radius: 210 }, // Beacon D Lime   — left
];

// Floorplan walls
// • Main hall  : left→right 10–95 %, top→bottom 7–93 %
// • EXIT       : notch on LEFT wall, upper area, going LEFT
// • ENTRANCE   : notch on BOTTOM wall, right portion, going DOWN
const FP = {
  l: width  * 0.10,  r: width  * 0.95,
  t: height * 0.07,  b: height * 0.93,
  // EXIT — left wall, upper notch (going left)
  exLeft: width  * 0.02,
  exTop:  height * 0.19,
  exBot:  height * 0.31,
  // ENTRANCE — bottom wall, right portion (going down)
  enLeft: width  * 0.67,
  enBot:  height * 0.98,
};

// SVG beacon circles — positions mirror BLOBS above
const BEACONS = [
  { id: 'A', x: width * 0.50, y: height * 0.84, label: 'Beacon A' }, // Blue  — bottom
  { id: 'B', x: width * 0.84, y: height * 0.52, label: 'Beacon B' }, // Pink  — right
  { id: 'C', x: width * 0.22, y: height * 0.52, label: 'Beacon C' }, // Orange— left
  { id: 'D', x: width * 0.50, y: height * 0.14, label: 'Beacon D' }, // Lime  — top
];

// ─── Gallery map container dimensions ────────────────────────────────────────
// The map card sits between the top safe-area and the bottom controls.
// Controls: bottom 48, height 46 → bottom edge at screen_h - 48 - 46 = screen_h - 94
// We add 16 breathing room → MAP_BOTTOM = 110
const MAP_PAD_H  = 16;   // horizontal inset from screen edges
const MAP_TOP    = 80;   // top offset (below safe-area / status bar)
const MAP_BOTTOM = 110;  // bottom offset (above bottom controls)
const mapW = width  - MAP_PAD_H * 2;
const mapH = height - MAP_TOP - MAP_BOTTOM;

// ─── Liquid gradient blob config (web only) ──────────────────────────────────
// Each blob morphs shape + carries a radial gradient for the glossy 3D liquid look.
// Targeting via CSS attribute selectors [style*="blur(72px)"][style*="rgb(...)"]
// because className is NOT forwarded by Animated.View in this RNW version.
// CSS version token — bump to force re-injection after shape changes
const LAVA_CSS_VERSION = 'v4';

const BLOB_SHAPES = [
  // 0 · Blue — top  (#3A9FFF)
  {
    rgb:      'rgb(58, 159, 255)',
    dur:       13,
    gradient: `radial-gradient(circle at 38% 30%, rgba(200,232,255,0.85) 0%, rgba(58,159,255,0) 55%),
               radial-gradient(circle at 70% 74%, rgba(0,18,80,0.50)     0%, rgba(0,0,0,0)     48%)`,
    frames: [
      '62% 38% 46% 54% / 44% 58% 42% 56%',
      '38% 62% 62% 38% / 58% 38% 62% 42%',
      '50% 50% 38% 62% / 38% 62% 50% 50%',
      '46% 54% 54% 46% / 52% 48% 56% 44%',
    ],
  },
  // 1 · Orange — right  (#FF6820)
  {
    rgb:      'rgb(255, 104, 32)',
    dur:       16,
    gradient: `radial-gradient(circle at 36% 28%, rgba(255,220,170,0.85) 0%, rgba(255,104,32,0) 55%),
               radial-gradient(circle at 72% 76%, rgba(90,20,0,0.50)     0%, rgba(0,0,0,0)     48%)`,
    frames: [
      '68% 32% 42% 58% / 38% 72% 28% 62%',
      '32% 68% 68% 32% / 62% 28% 72% 38%',
      '52% 48% 32% 68% / 48% 52% 38% 62%',
      '42% 58% 58% 42% / 62% 38% 52% 48%',
    ],
  },
  // 2 · Pink — bottom  (#FF2D78)
  {
    rgb:      'rgb(255, 45, 120)',
    dur:       11,
    gradient: `radial-gradient(circle at 34% 28%, rgba(255,190,220,0.85) 0%, rgba(255,45,120,0) 55%),
               radial-gradient(circle at 68% 74%, rgba(90,0,35,0.50)     0%, rgba(0,0,0,0)     48%)`,
    frames: [
      '54% 46% 38% 62% / 62% 38% 58% 42%',
      '38% 62% 58% 42% / 44% 58% 38% 62%',
      '62% 38% 46% 54% / 52% 48% 62% 38%',
      '48% 52% 62% 38% / 38% 62% 44% 56%',
    ],
  },
  // 3 · Lime — left  (#AAFF22)
  {
    rgb:      'rgb(170, 255, 34)',
    dur:       14,
    gradient: `radial-gradient(circle at 36% 30%, rgba(220,255,160,0.85) 0%, rgba(170,255,34,0) 55%),
               radial-gradient(circle at 68% 72%, rgba(25,60,0,0.50)     0%, rgba(0,0,0,0)     48%)`,
    frames: [
      '46% 54% 52% 48% / 54% 46% 48% 52%',
      '58% 42% 46% 54% / 42% 58% 52% 48%',
      '42% 58% 58% 42% / 56% 44% 42% 58%',
      '52% 48% 44% 56% / 46% 54% 56% 44%',
    ],
  },
];

// Lava-lamp drift — large sweeping paths so blobs visibly overlap and separate.
// Each blob has a unique multi-phase orbit at a different speed so they go
// in and out of phase organically, just like real lava-lamp globules rising
// and falling past each other.
const BLOB_DRIFT = [
  // 0 · Blue — top: sweeps DOWN into centre, drifts sideways, rises back
  { durMs: 11000, phases: [
    { tx:  25, ty: 110 },   // plunge toward centre
    { tx: -30, ty:  75 },   // drift left while still low
    { tx:  20, ty:  35 },   // rise slightly, sway right
    { tx: -10, ty: -20 },   // nearly home
    { tx:   0, ty:   0 },
  ]},
  // 1 · Orange — right: sweeps LEFT across centre, bobs up/down
  { durMs: 13500, phases: [
    { tx: -115, ty:  20 },  // cross toward centre-left
    { tx:  -70, ty: -30 },  // linger mid-screen, drift up
    { tx:  -40, ty:  25 },  // drift down a bit
    { tx:  -12, ty:  -8 },  // nearly home
    { tx:    0, ty:   0 },
  ]},
  // 2 · Pink — bottom: sweeps UP into centre, sways
  { durMs: 9800, phases: [
    { tx: -20, ty: -115 },  // rise toward centre
    { tx:  30, ty:  -70 },  // drift right while high
    { tx: -15, ty:  -35 },  // sink a bit
    { tx:   8, ty:   15 },  // nearly home
    { tx:   0, ty:    0 },
  ]},
  // 3 · Lime — left: sweeps RIGHT across centre, bobs
  { durMs: 14500, phases: [
    { tx: 115, ty: -20 },   // cross toward centre-right
    { tx:  65, ty:  30 },   // linger, drift down
    { tx:  35, ty: -25 },   // drift back up
    { tx:  10, ty:   8 },   // nearly home
    { tx:   0, ty:   0 },
  ]},
];

// Inject one shared <style> block; attribute selectors match each blob by color.
// LAVA_CSS_VERSION bump forces re-injection after shape/blur changes.
const BLOB_BLUR = 52; // px — lower = more visible organic shape, higher = softer

function injectLavaBlobCSS() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const styleId = `wl-lava-blobs-${LAVA_CSS_VERSION}`;
  if (document.getElementById(styleId)) return;
  // Remove any stale version
  document.querySelectorAll('[id^="wl-lava-blobs"]').forEach(el => el.remove());

  const css = BLOB_SHAPES.map(({ rgb, gradient, frames }, id) => `
    @keyframes wlMorph${id} {
      0%,100% { border-radius: ${frames[0]}; }
      25%     { border-radius: ${frames[1]}; }
      50%     { border-radius: ${frames[2]}; }
      75%     { border-radius: ${frames[3]}; }
    }
    [style*="blur(${BLOB_BLUR}px)"][style*="${rgb}"] {
      background-image: ${gradient} !important;
    }
  `).join('\n');

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = css;
  document.head.appendChild(style);
}

// ─── AnimatedBlob ─────────────────────────────────────────────────────────────
// Blobs are completely static by default.
// When nudging=true, a single gentle bump plays once, then the blob returns to rest.
function AnimatedBlob({ blob, index, nudging = false }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => { injectLavaBlobCSS(); }, []);

  useEffect(() => {
    scale.setValue(1);
    if (!nudging) return;

    // Single-shot nudge: expand gently, then settle back — no loop
    const anim = Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 550, easing: Easing.out(Easing.ease),    useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1.00, duration: 750, easing: Easing.inOut(Easing.ease),  useNativeDriver: false }),
    ]);
    anim.start();
    return () => { anim.stop(); scale.setValue(1); };
  }, [nudging]);

  // blur value is the attribute-selector hook for the CSS morph animation
  const blurStyle = Platform.OS === 'web' ? { filter: `blur(${BLOB_BLUR}px)` } : {};

  return (
    <Animated.View
      style={[
        styles.blob,
        blurStyle,
        {
          left:            blob.cx - blob.radius,
          top:             blob.cy - blob.radius,
          width:           blob.radius * 2,
          height:          blob.radius * 2,
          borderRadius:    blob.radius,
          backgroundColor: blob.color,
          transform:       [{ scale }],
        },
      ]}
    />
  );
}

// ─── GalleryFloorPlan ─────────────────────────────────────────────────────────
// Full-screen overlay: room outline + beacon markers + artwork pills + "you" dot.
// Blobs glow through the dark veil behind this SVG layer.
// listenedArtworks: Set of artwork IDs already listened to (dimmed pills).
function GalleryFloorPlan({ w, h, listenedArtworks = new Set() }) {
  const font = FONTS.body;

  // ── Room outline coordinates (proportions of full-screen w/h) ──
  const L  = w * 0.09,  R  = w * 0.94;
  const T  = h * 0.08,  B  = h * 0.92;
  const exL = w * 0.02, exT = h * 0.22, exB = h * 0.34;
  const enL = w * 0.67, enB = h * 0.98;

  const wallD = [
    `M ${L} ${T} L ${R} ${T}`,
    `L ${R} ${B}`,
    `L ${enL} ${B}`,
    `M ${enL} ${B} L ${enL} ${enB}`,
    `M ${L} ${B} L ${L} ${exB}`,
    `L ${exL} ${exB} L ${exL} ${exT} L ${L} ${exT}`,
    `L ${L} ${T}`,
  ].join(' ');

  // Beacon positions + artwork IDs (match BEACON_CONFIGS blobIndex mapping)
  const beacons = [
    { id: 'A', x: w * 0.50, y: h * 0.16, color: '#3A9FFF', label: 'Beacon A', artIds: [0, 1, 2],   axis: 'h' }, // Blue   — top
    { id: 'B', x: w * 0.50, y: h * 0.82, color: '#FF2D78', label: 'Beacon B', artIds: [6, 7, 8],   axis: 'h' }, // Pink   — bottom
    { id: 'C', x: w * 0.86, y: h * 0.52, color: '#FF6820', label: 'Beacon C', artIds: [3, 4, 5],   axis: 'v' }, // Orange — right
    { id: 'D', x: w * 0.18, y: h * 0.52, color: '#AAFF22', label: 'Beacon D', artIds: [9, 10, 11], axis: 'v' }, // Lime   — left
  ];

  // Pill dimensions
  const PW = 38, PH = 13, GAP = 7, RX = 5; // horizontal pill
  const VW = 13, VH = 38;                   // vertical pill (same rx)

  // Returns pill anchor (top-left x,y) for each of 3 pills in a group,
  // centered on (cx, cy) in the given axis direction.
  const pillPositions = (cx, cy, axis) => {
    if (axis === 'h') {
      const totalW = 3 * PW + 2 * GAP;
      return [0, 1, 2].map(i => ({
        x: cx - totalW / 2 + i * (PW + GAP),
        y: cy - PH / 2,
        w: PW, h: PH,
      }));
    } else {
      const totalH = 3 * VH + 2 * GAP;
      return [0, 1, 2].map(i => ({
        x: cx - VW / 2,
        y: cy - totalH / 2 + i * (VH + GAP),
        w: VW, h: VH,
      }));
    }
  };

  // Pill group centre — pushed toward the wall (away from the beacon circle)
  const pillCentre = (b) => {
    if (b.id === 'A') return { cx: b.x, cy: T + (b.y - T) * 0.28 };    // top (Blue):   near top wall
    if (b.id === 'B') return { cx: b.x, cy: b.y + (B - b.y) * 0.72 };  // bottom (Pink): near bottom wall
    if (b.id === 'D') return { cx: L + (b.x - L) * 0.28, cy: b.y };    // left (Lime):  near left wall
    if (b.id === 'C') return { cx: b.x + (R - b.x) * 0.72, cy: b.y };  // right (Orange): near right wall
  };

  const you  = { x: w * 0.62, y: h * 0.68 };
  const wc   = 'rgba(255,255,255,0.45)';
  const tc   = 'rgba(255,255,255,0.60)';

  return (
    <Svg width={w} height={h}>

      {/* ── Room walls ── */}
      <Path d={wallD} stroke={wc} strokeWidth={1} fill="none" />

      {/* ── EXIT label ── */}
      <SvgText
        x={exL - 2} y={(exT + exB) / 2 + 3}
        fontSize={7} fill={tc} fontWeight="300" fontFamily={font}
        letterSpacing={1.5} textAnchor="middle"
        transform={`rotate(-90, ${exL - 2}, ${(exT + exB) / 2 + 3})`}
      >
        EXIT
      </SvgText>

      {/* ── ENTRANCE label ── */}
      <SvgText
        x={(enL + R) / 2} y={enB - 4}
        fontSize={7} fill={tc} fontWeight="300" fontFamily={font}
        letterSpacing={1.5} textAnchor="middle"
      >
        ENTRANCE
      </SvgText>

      {/* ── Per-beacon: artwork pills + beacon circle ── */}
      {beacons.map((b) => {
        const onRight    = b.id === 'C'; // Orange is now on the right
        const labelX     = onRight ? b.x - 22 : b.x + 22;
        const anchor     = onRight ? 'end' : 'start';
        const { cx, cy } = pillCentre(b);
        const pills      = pillPositions(cx, cy, b.axis);

        return (
          <G key={b.id}>

            {/* ── Artwork pills ── */}
            {pills.map((p, i) => {
              const artId   = b.artIds[i];
              const visited = listenedArtworks.has(artId);
              return (
                <Rect
                  key={i}
                  x={p.x} y={p.y}
                  width={p.w} height={p.h}
                  rx={RX} ry={RX}
                  fill="white"
                  opacity={visited ? 0.20 : 0.80}
                />
              );
            })}


          </G>
        );
      })}

      {/* ── You dot ── */}
      <Circle cx={you.x} cy={you.y} r={4.5} fill="white" />
      <SvgText
        x={you.x + 8} y={you.y + 4}
        fontSize={8} fill="rgba(255,255,255,0.70)"
        fontWeight="300" fontFamily={font}
      >
        you
      </SvgText>

    </Svg>
  );
}

// ─── ProfileGlowRing — slow breathing border on blobs matching the user's profile ─
// Shown from the very start (no listening required). Fades out once that beacon
// has been fully visited.
function ProfileGlowRing({ blob }) {
  const opacity = useRef(new Animated.Value(0.18)).current;
  const scale   = useRef(new Animated.Value(1.00)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.70, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(scale,   { toValue: 1.06, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.18, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(scale,   { toValue: 1.00, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const r = blob.radius;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:     'absolute',
        left:         blob.cx - r,
        top:          blob.cy - r,
        width:        r * 2,
        height:       r * 2,
        borderRadius: r,
        borderWidth:  4,
        borderColor:  blob.color,
        opacity,
        transform:    [{ scale }],
      }}
    />
  );
}

// ─── RecommendedRing — sonar ripple rings radiating from the recommended blob ──
// Two rings staggered 600 ms apart give a continuous ping feel.
function RecommendedRing({ blob }) {
  function Ring({ delay }) {
    const scale   = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.9)).current;
    useEffect(() => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 2.2, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(opacity, { toValue: 0,   duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          ]),
          // reset instantly before next loop
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: false }),
            Animated.timing(opacity, { toValue: 0.9, duration: 0, useNativeDriver: false }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    }, []);

    const r = blob.radius;
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position:     'absolute',
          left:         blob.cx - r,
          top:          blob.cy - r,
          width:        r * 2,
          height:       r * 2,
          borderRadius: r,
          borderWidth:  3,
          borderColor:  blob.color,
          opacity,
          transform:    [{ scale }],
        }}
      />
    );
  }
  return (
    <>
      <Ring delay={0} />
      <Ring delay={600} />
    </>
  );
}

// ─── PulsingBorder — soft pulsing glow on the suggested artwork card ────────────
// Rendered OUTSIDE the card's overflow:hidden so the glow isn't clipped.
function PulsingBorder({ color }) {
  const pulse = useRef(new Animated.Value(0.18)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.62, duration: 900,  easing: Easing.inOut(Easing.sine), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.18, duration: 1200, easing: Easing.inOut(Easing.sine), useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const glowStyle = Platform.OS === 'web'
    ? { boxShadow: `0 0 22px 10px ${color}88` }
    : { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 18, elevation: 14 };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position:     'absolute',
          top:          -6, left: -6, right: -6, bottom: -6,
          borderRadius: 26,
          borderWidth:  1.5,
          borderColor:  color,
          opacity:      pulse,
        },
        glowStyle,
      ]}
    />
  );
}

// ─── BeaconPanel ──────────────────────────────────────────────────────────────
const CARD_H = Math.floor((height - 260) / 3);

function BeaconPanel({ artworks, listened, color, onSelect, onClose, recommendedId }) {
  const cardGlow = Platform.OS === 'web'
    ? { boxShadow: `0 0 12px 4px ${color}33` }
    : { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 };

  return (
    <View style={[StyleSheet.absoluteFill, panelStyles.container]}>
      <View style={panelStyles.list}>
        {artworks.map((art) => {
          const isRec = art.id === recommendedId;
          return (
            // Wrapper sits outside overflow:hidden so PulsingBorder can bleed out
            <View key={art.id} style={panelStyles.cardWrapper}>
              <TouchableOpacity
                style={[
                  panelStyles.card,
                  cardGlow,
                  { borderColor: color },
                  listened.has(art.id) && panelStyles.cardDim,
                ]}
                onPress={() => onSelect(art)}
                activeOpacity={0.8}
              >
                {/* Artwork photo — local image, only shown in this panel card */}
                <Image
                  source={ARTWORK_IMAGES[art.code]}
                  style={panelStyles.cardImg}
                  resizeMode="cover"
                />

                {/* Code badge — top left */}
                <View style={[panelStyles.codeBadge, { backgroundColor: color + 'CC' }]}>
                  <Text style={panelStyles.codeText}>{art.code}</Text>
                </View>

                {/* Title + artist overlay — bottom */}
                <View style={panelStyles.cardOverlay}>
                  <Text style={panelStyles.cardTitle} numberOfLines={1}>{art.title.replace('\n', ' ')}</Text>
                  <Text style={panelStyles.cardArtist} numberOfLines={1}>{art.artist} · {art.year}</Text>
                </View>
              </TouchableOpacity>

              {/* Pulsing glow — outside overflow:hidden so it bleeds freely */}
              {isRec && <PulsingBorder color={color} />}
            </View>
          );
        })}
      </View>

      {/* Close button — bottom left */}
      <TouchableOpacity style={[styles.blobBtn, panelStyles.closeBtn]} onPress={onClose} activeOpacity={0.8}>
        <Text style={styles.blobBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── AudioBlob ─────────────────────────────────────────────────────────────────
const BLOB_SIZE = Math.min(width * 0.55, 220);

function injectAudioBlobCSS() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('wl-audio-blob-style')) return;
  const el = document.createElement('style');
  el.id = 'wl-audio-blob-style';
  // Morphing border-radius animation — same style as the splash START button blob
  el.textContent = `
    #wl-audio-blob {
      animation: wlAudioMorph 9s ease-in-out infinite !important;
    }
    @keyframes wlAudioMorph {
      0%,100% { border-radius: 58% 42% 34% 66% / 52% 36% 64% 48%; }
      25%     { border-radius: 38% 62% 62% 38% / 58% 38% 62% 42%; }
      50%     { border-radius: 66% 34% 42% 58% / 40% 60% 40% 60%; }
      75%     { border-radius: 44% 56% 56% 44% / 58% 38% 62% 42%; }
    }
  `;
  document.head.appendChild(el);
}

function AudioBlob({ color, isPlaying }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => { injectAudioBlobCSS(); }, []);

  useEffect(() => {
    const dur = isPlaying ? 500 : 1600;

    const aScale = Animated.loop(Animated.sequence([
      Animated.timing(scale,   { toValue: isPlaying ? 1.18 : 1.06, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(scale,   { toValue: isPlaying ? 0.84 : 0.94, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    const aOpacity = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: isPlaying ? 1.00 : 0.92, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(opacity, { toValue: isPlaying ? 0.65 : 0.78, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));

    aScale.start();
    aOpacity.start();
    return () => { aScale.stop(); aOpacity.stop(); };
  }, [isPlaying]);

  const S    = BLOB_SIZE;
  const blur = Platform.OS === 'web' ? { filter: 'blur(20px)' } : {};

  return (
    <Animated.View
      nativeID="wl-audio-blob"
      style={[
        {
          width:           S,
          height:          S,
          borderRadius:    S / 2,
          backgroundColor: color,
          opacity,
          transform:       [{ scale }],
        },
        blur,
      ]}
    />
  );
}

// ─── ArtworkPlayer ────────────────────────────────────────────────────────────
function ArtworkPlayer({ artwork, color, onBack, onFinish }) {
  const soundRef      = useRef(null);
  const trackWidthRef = useRef(1);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate,       setRate]       = useState(1);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const source = ARTWORK_AUDIO[artwork.code];
        if (!source) return;
        const { sound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: false },
          (status) => {
            if (!mounted || !status.isLoaded) return;
            setPositionMs(status.positionMillis ?? 0);
            setDurationMs(status.durationMillis ?? 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              onFinish(artwork.id, Math.floor((status.durationMillis ?? 0) / 1000));
            }
          }
        );
        soundRef.current = sound;
        const status = await sound.getStatusAsync();
        if (mounted && status.isLoaded) setDurationMs(status.durationMillis ?? 0);
      } catch (e) {
        console.warn('[Audio] load error:', e.message);
      }
    };
    load();
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, [artwork.code]);

  const togglePlay = async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        if (status.positionMillis >= (status.durationMillis ?? 0) - 200)
          await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (e) { console.warn('[Audio] toggle error:', e.message); }
  };

  const seek = async (ratio) => {
    if (!soundRef.current || durationMs === 0) return;
    try { await soundRef.current.setPositionAsync(Math.floor(Math.max(0, Math.min(1, ratio)) * durationMs)); } catch (_) {}
  };

  const skip = async (deltaMs) => {
    if (!soundRef.current || durationMs === 0) return;
    try { await soundRef.current.setPositionAsync(Math.max(0, Math.min(positionMs + deltaMs, durationMs))); } catch (_) {}
  };

  const cycleSpeed = async () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    try { await soundRef.current?.setRateAsync(next, true); } catch (_) {}
  };

  const fmt = (ms) => {
    const s = Math.floor(((!ms || isNaN(ms)) ? 0 : ms) / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const progress = durationMs > 0 && !isNaN(durationMs) ? Math.min(positionMs / durationMs, 1) : 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Solid dark veil */}
      <View style={playerStyles.veil} />

      {/* ── Main column ── */}
      <View style={playerStyles.outerContainer}>

        {/* ── Header: badge · title · meta · mood ── */}
        <View style={playerStyles.header}>
          <View style={[playerStyles.codePill, { backgroundColor: color }]}>
            <Text style={playerStyles.codePillText}>{artwork.code}</Text>
          </View>
          <Text style={playerStyles.title} numberOfLines={2}>
            {artwork.title.replace('\n', ' ')}
          </Text>
          <Text style={playerStyles.meta}>
            {artwork.artist}{'  ·  '}{artwork.year}
            {artwork.period ? `  ·  ${artwork.period}` : ''}
          </Text>
          {artwork.emotionalResonance && (
            <Text style={[playerStyles.mood, { color }]}>
              {artwork.emotionalResonance}
            </Text>
          )}
        </View>

        {/* ── Blob — fills remaining space ── */}
        <View style={playerStyles.blobSection}>
          <AudioBlob color={color} isPlaying={isPlaying} />
        </View>

        {/* ── Bottom: seek + controls ── */}
        <View style={playerStyles.bottomSection}>

          <View style={playerStyles.separator} />

          {/* Seek bar */}
          <View
            style={playerStyles.trackWrapper}
            onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width || 1; }}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => seek(e.nativeEvent.locationX / trackWidthRef.current)}
            onResponderMove={(e)  => seek(e.nativeEvent.locationX / trackWidthRef.current)}
          >
            <View style={playerStyles.track} />
            <View style={[playerStyles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
            <View style={[playerStyles.handle, { left: `${progress * 100}%`, backgroundColor: color }]} />
          </View>
          <View style={playerStyles.timeRow}>
            <Text style={playerStyles.timeText}>{fmt(positionMs)}</Text>
            <Text style={playerStyles.timeText}>{fmt(durationMs)}</Text>
          </View>

          {/* Transport: [15s] ── [▶] ── [30s][1×] */}
          <View style={playerStyles.controlsRow}>

            {/* Left wing */}
            <View style={playerStyles.leftWing}>
              <TouchableOpacity style={playerStyles.skipBtn} onPress={() => skip(-15000)} activeOpacity={0.7}>
                <Text style={playerStyles.skipIcon}>↺</Text>
                <Text style={playerStyles.skipLabel}>15s</Text>
              </TouchableOpacity>
            </View>

            {/* Centre — play/pause */}
            <TouchableOpacity
              style={[playerStyles.playBtn, { borderColor: color }]}
              onPress={togglePlay}
              activeOpacity={0.85}
            >
              <Text style={[playerStyles.playIcon, { color }, !isPlaying && { marginLeft: 4 }]}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            </TouchableOpacity>

            {/* Right wing */}
            <View style={playerStyles.rightWing}>
              <TouchableOpacity style={playerStyles.skipBtn} onPress={() => skip(30000)} activeOpacity={0.7}>
                <Text style={playerStyles.skipIcon}>↻</Text>
                <Text style={playerStyles.skipLabel}>30s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={playerStyles.speedBtn} onPress={cycleSpeed} activeOpacity={0.75}>
                <Text style={[playerStyles.speedText, { color }]}>
                  {rate === 1 ? '1×' : rate === 1.5 ? '1.5×' : '2×'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>

          {artwork.theftLocation && (
            <Text style={playerStyles.theftLine}>
              Stolen {artwork.theftYear}  ·  {artwork.theftLocation}
            </Text>
          )}

        </View>
      </View>

      {/* Back button — bottom-left */}
      <TouchableOpacity
        style={[styles.blobBtn, playerStyles.backBtn]}
        onPress={onBack}
        activeOpacity={0.8}
      >
        <Text style={styles.blobBtnText}>←</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
// Flat list of all artworks across every beacon (used by the recommendation engine)
const ALL_ARTWORKS = BEACON_CONFIGS.flatMap(cfg => cfg.artworks);

export default function SerendipityMapScreen({ onEnd, profile = {} }) {
  const [mapVisible, setMapVisible] = useState(false);
  const mapOpacity = useRef(new Animated.Value(0)).current;

  // null = no panel open; 0-3 = which blob's panel is shown
  const [activeBeaconId,   setActiveBeaconId]   = useState(null);
  const [selectedArtwork,  setSelectedArtwork]  = useState(null);
  const [listenedArtworks, setListenedArtworks] = useState(new Set());

  // ── Continuous behaviour-based suggestions ───────────────────────────────────
  // Scores every unvisited artwork against ALL available data:
  //   1. Visit profile (intentions + word cloud + serendipity)
  //   2. Listening history — themes/tags of artworks already heard boost related ones
  // Always returns the best match per beacon — no score threshold, always a suggestion.
  const perBeaconProfileRec = useMemo(() => {
    const pInts  = (profile.intentions || []).map(i => i.toLowerCase());
    const pWords = (profile.words      || []).map(w => w.toLowerCase());
    const sera   = profile.serendipity ?? 0.5;

    // Build a frequency map of themes + tags from every artwork the user has heard
    const heardThemes = new Map();   // theme → count
    const heardTags   = new Map();   // tag   → count
    ALL_ARTWORKS.forEach(a => {
      if (!listenedArtworks.has(a.id)) return;
      (a.themes   || []).forEach(t => heardThemes.set(t.toLowerCase(), (heardThemes.get(t.toLowerCase()) || 0) + 1));
      (a.wordTags || []).forEach(t => heardTags.set(t.toLowerCase(),   (heardTags.get(t.toLowerCase())   || 0) + 1));
    });

    const scoreArt = (art) => {
      let s = 0;

      // 1. Profile: visit intentions match artwork themes
      (art.themes || []).forEach(t => {
        const tl = t.toLowerCase();
        if (pInts.some(i => tl.includes(i) || i.includes(tl))) s += 2.5;
      });
      // 2. Profile: word cloud selections match artwork tags
      (art.wordTags || []).forEach(t => {
        const tl = t.toLowerCase();
        if (pWords.some(w => tl.includes(w) || w.includes(tl))) s += 2.0;
      });
      // 3. Listening history: reward artworks sharing themes/tags with what was enjoyed
      (art.themes   || []).forEach(t => { const c = heardThemes.get(t.toLowerCase()); if (c) s += c * 1.8; });
      (art.wordTags || []).forEach(t => { const c = heardTags.get(t.toLowerCase());   if (c) s += c * 1.4; });

      // 4. Serendipity dial
      const amb = art.ambiguity || 1;
      const emo = art.emotionalIntensity || 1;
      if (sera > 0.6)      s += amb * sera * 1.5;
      else if (sera < 0.4) s += (6 - amb) * (1 - sera) * 1.0;
      else                 s += emo * 0.5;

      return s;
    };

    const rec = {};
    BEACON_CONFIGS.forEach(cfg => {
      const unvisited = cfg.artworks.filter(a => !listenedArtworks.has(a.id));
      if (!unvisited.length) { rec[cfg.blobIndex] = null; return; }
      // Always pick the best — no threshold, there's always a suggestion
      const sorted = [...unvisited].sort((a, b) => scoreArt(b) - scoreArt(a));
      rec[cfg.blobIndex] = sorted[0];
    });
    return rec;
  }, [profile, listenedArtworks]);

  // Map-level glow: all beacons that still have unvisited artworks get a breathing ring
  const profileGlowBlobIndices = Object.entries(perBeaconProfileRec)
    .filter(([, art]) => art !== null)
    .map(([idx]) => Number(idx));

  // ── Recommendation state ──────────────────────────────────────────────────────
  const [recommendedArtwork,   setRecommendedArtwork]   = useState(null);
  const [recommendedBlobIndex, setRecommendedBlobIndex] = useState(null);

  const pendingRecArtworkRef   = useRef(null);
  const pendingRecBlobIndexRef = useRef(null);

  // nudging is driven purely by the recommendation engine — no idle timer

  // ── Session tracking (refs so they never cause re-renders) ───────────────────
  const sessionStartRef       = useRef(Date.now());
  const artworkOpenTimeRef    = useRef(null);   // ms timestamp when player opened
  const currentWasRecRef      = useRef(false);  // was the open artwork a recommendation?
  const followedCountRef      = useRef(0);      // times user tapped the recommended card
  const ignoredCountRef       = useRef(0);      // times user tapped something else while rec active
  const beaconOrderRef        = useRef([]);     // unique beacon IDs in visit order ['A','C',…]
  const momentsRef            = useRef([]);     // { beacon, type:'followed'|'against' }[]
  // blob index → beacon ID (inverse of BEACON_ID_TO_BLOB)
  const BLOB_TO_BEACON = { 0: 'A', 1: 'C', 2: 'B', 3: 'D' };

  // ── Proximity toast (shown when a beacon first gets close) ───────────────────
  const [toastMsg,     setToastMsg]     = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer   = useRef(null);

  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Audio ─────────────────────────────────────────────────────────────────────
  const soundRef = useRef(null);

  const playBeaconAudio = useCallback(async (beaconId) => {
    try {
      // Stop previous audio
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(AUDIO_MAP[beaconId]);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn('[Audio] playBeaconAudio:', e.message);
    }
  }, []);

  // Unload audio on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ── Real BLE proximity ────────────────────────────────────────────────────────
  const { nearestBeacon } = useBeaconProximity({
    onTriggered: useCallback((beaconId, rssi) => {
      const blobIndex = BEACON_ID_TO_BLOB[beaconId];
      if (blobIndex === undefined) return;

      // Auto-open the panel for this beacon (if nothing else is open)
      setActiveBeaconId(prev => (prev === null ? blobIndex : prev));

      // Play audio narration
      playBeaconAudio(beaconId);

      // Toast so user knows why the panel appeared
      const cfg = BEACON_CONFIGS[blobIndex];
      showToast(`📍 ${cfg?.artworks[0]?.artist ?? 'Beacon ' + beaconId} zone`);
    }, [playBeaconAudio, showToast]),
  });

  // Exit-confirm overlay — hold to confirm (3 s countdown)
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [exitCountdown,      setExitCountdown]      = useState(5);
  const exitConfirmOpacity = useRef(new Animated.Value(0)).current;
  const exitIntervalRef    = useRef(null);

  const showExitConfirm = () => {
    setExitCountdown(5);
    setExitConfirmVisible(true);
    Animated.timing(exitConfirmOpacity, {
      toValue: 1, duration: 180,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
    let n = 5;
    exitIntervalRef.current = setInterval(() => {
      n -= 1;
      setExitCountdown(n);
      if (n <= 0) {
        clearInterval(exitIntervalRef.current);
        handleEnd();
      }
    }, 1000);
  };
  const hideExitConfirm = () => {
    clearInterval(exitIntervalRef.current);
    setExitCountdown(5);
    Animated.timing(exitConfirmOpacity, {
      toValue: 0, duration: 200,
      easing: Easing.in(Easing.quad), useNativeDriver: true,
    }).start(() => setExitConfirmVisible(false));
  };

  // Session-complete overlay
  const [sessionComplete,  setSessionComplete]  = useState(false);
  const completeOpacity = useRef(new Animated.Value(0)).current;
  const completeFired   = useRef(false); // guard against double-fire

  const showMap = () => {
    setMapVisible(true);
    Animated.timing(mapOpacity, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  };
  const hideMap = () => {
    Animated.timing(mapOpacity, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setMapVisible(false));
  };

  const openBeacon    = (blobIndex) => {
    setActiveBeaconId(blobIndex);
    // Record first-visit order (deduplicated)
    const beaconId = BLOB_TO_BEACON[blobIndex];
    if (beaconId && !beaconOrderRef.current.includes(beaconId)) {
      beaconOrderRef.current = [...beaconOrderRef.current, beaconId];
    }
  };
  const closeBeacon   = () => {
    setActiveBeaconId(null);
    setSelectedArtwork(null);
    setRecommendedArtwork(null);
    setRecommendedBlobIndex(null);
    soundRef.current?.stopAsync().catch(() => {});
  };

  const selectArtwork = (art) => {
    setSelectedArtwork(art);
    artworkOpenTimeRef.current = Date.now();

    // Track whether the user followed or ignored the active recommendation
    const wasRecommended = !!(recommendedArtwork && art.id === recommendedArtwork.id);
    currentWasRecRef.current = wasRecommended;
    if (recommendedArtwork !== null) {
      if (wasRecommended) followedCountRef.current += 1;
      else                ignoredCountRef.current  += 1;
    }

    // Compute next recommendation — store in refs only.
    // The visible map effects (fast blob, ripple ring) are applied AFTER the
    // user returns to the map, not while the player is open.
    const rec     = recommendArtwork(art, ALL_ARTWORKS, listenedArtworks, profile);
    const recBlob = rec
      ? (BEACON_CONFIGS.find(c => c.artworks.some(a => a.id === rec.id))?.blobIndex ?? null)
      : null;
    pendingRecArtworkRef.current   = rec;
    pendingRecBlobIndexRef.current = recBlob;

    // Clear any existing map-level recommendation so effects hide while player is open
    setRecommendedArtwork(null);
    setRecommendedBlobIndex(null);
  };
  // ── Shared helper — fires the "all done" overlay once all artworks clicked ──
  const triggerCompleteIfAllVisited = useCallback((nextSet) => {
    if (nextSet.size >= TOTAL_ARTWORKS && !completeFired.current) {
      completeFired.current = true;
      setTimeout(() => {
        setSessionComplete(true);
        Animated.timing(completeOpacity, {
          toValue:         1,
          duration:        600,
          easing:          Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, 600);
    }
  }, [completeOpacity]);

  const backFromPlayer = () => {
    // Record moment for this artwork visit
    if (selectedArtwork?.beacon) {
      const listenedSec = artworkOpenTimeRef.current
        ? Math.round((Date.now() - artworkOpenTimeRef.current) / 1000)
        : 0;
      momentsRef.current = [
        ...momentsRef.current,
        {
          beacon:          selectedArtwork.beacon,
          type:            currentWasRecRef.current ? 'followed' : 'against',
          listenedSeconds: listenedSec,
          completed:       false,
          title:           selectedArtwork.title?.replace('\n', ' ') ?? '',
        },
      ];
    }
    artworkOpenTimeRef.current = null;

    // Now back on the map — reveal the recommendation that was computed while listening
    setRecommendedArtwork(pendingRecArtworkRef.current);
    setRecommendedBlobIndex(pendingRecBlobIndexRef.current);

    setListenedArtworks(prev => {
      const next = new Set([...prev, selectedArtwork.id]);
      triggerCompleteIfAllVisited(next);
      return next;
    });
    setSelectedArtwork(null);
  };

  const artworkFinished = (id, actualDurationSec) => {
    const art = ALL_ARTWORKS.find(a => a.id === id);
    if (art?.beacon) {
      momentsRef.current = [
        ...momentsRef.current,
        {
          beacon:          art.beacon,
          type:            currentWasRecRef.current ? 'followed' : 'against',
          listenedSeconds: actualDurationSec ?? ARTWORK_DURATION,
          completed:       true,
          title:           art.title?.replace('\n', ' ') ?? '',
        },
      ];
    }
    artworkOpenTimeRef.current = null;

    // Reveal recommendation on the map now that listening is complete
    setRecommendedArtwork(pendingRecArtworkRef.current);
    setRecommendedBlobIndex(pendingRecBlobIndexRef.current);

    setListenedArtworks(prev => {
      const next = new Set([...prev, id]);
      triggerCompleteIfAllVisited(next);
      return next;
    });
  };

  // ── Build session payload and hand off ───────────────────────────────────────
  const buildSessionData = () => ({
    durationSeconds:    Math.round((Date.now() - sessionStartRef.current) / 1000),
    artworksVisited:    listenedArtworks.size,
    totalArtworks:      TOTAL_ARTWORKS,
    followedSuggestions: followedCountRef.current,
    ignoredSuggestions:  ignoredCountRef.current,
    beaconOrder:         beaconOrderRef.current,
    moments:             momentsRef.current,
    listenedArtworks:    Array.from(listenedArtworks),
  });

  const handleEnd = () => onEnd(buildSessionData());

  // Any overlay = hide bottom controls + blob tap-zones
  const overlayOpen  = activeBeaconId !== null || !!selectedArtwork
                     || sessionComplete;
  // Note: exitConfirmVisible is intentionally NOT in overlayOpen — we need
  // the controls (and the X Pressable) to stay mounted so onPressOut fires.
  const activeBeacon = activeBeaconId !== null ? BEACON_CONFIGS[activeBeaconId] : null;

  return (
    <View style={styles.container}>
      {/* Background: WebGL lava lamp (web) or animated blobs (native) */}
      {Platform.OS === 'web'
        ? <LavaLampWebGL nudgingBlobIndex={recommendedBlobIndex} />
        : BLOBS.map((blob, i) => (
            <AnimatedBlob key={blob.id} blob={blob} index={i} nudging={i === recommendedBlobIndex} />
          ))
      }

      {/* Rings removed — clean blob-only aesthetic */}

      {/* Invisible tap zones — one per blob, hidden while a panel is open */}
      {!overlayOpen && BEACON_CONFIGS.map((cfg) => {
        const blob = BLOBS[cfg.blobIndex];
        return (
          <Pressable
            key={cfg.blobIndex}
            style={{
              position:     'absolute',
              left:         blob.cx - 95,
              top:          blob.cy - 95,
              width:        190,
              height:       190,
              borderRadius: 95,
            }}
            onPress={() => openBeacon(cfg.blobIndex)}
          />
        );
      })}

      {/* Map overlay — full-screen dark veil, blobs show through, floor plan on top */}
      {mapVisible && (
        <Animated.View
          pointerEvents="none"
          style={[styles.mapContainer, { opacity: mapOpacity }]}
        >
          {/* Constrained map card — sits within the yellow margins */}
          <View style={styles.mapCard}>
            <GalleryFloorPlan w={mapW} h={mapH} listenedArtworks={listenedArtworks} />
          </View>
        </Animated.View>
      )}

      {/* ── Proximity toast ── */}
      <Animated.View
        style={[styles.toast, { opacity: toastOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      {/* Bottom controls — hidden when a panel is open */}
      {!overlayOpen && (
        <View style={styles.controls}>

          {/* Exit door — shows countdown overlay while held, cancels on release */}
          {!mapVisible && (
            <Pressable
              style={styles.blobBtn}
              onPressIn={showExitConfirm}
              onPressOut={hideExitConfirm}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                {/* Door frame */}
                <Path
                  d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"
                  stroke="rgba(255,255,255,0.80)"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Arrow pointing right (exit) */}
                <Path
                  d="M9 12h12M17 9l4 3-4 3"
                  stroke="rgba(255,255,255,0.80)"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          )}

          {/* Gallery map — invisible while map is open, but still receives onPressOut */}
          <Pressable
            style={[styles.glassBtn, mapVisible && { opacity: 0 }]}
            onPressIn={showMap}
            onPressOut={hideMap}
          >
            <View style={styles.glowCircle} />
          </Pressable>

        </View>
      )}

      {/* ── Beacon panel (colour-matched to the tapped blob) ── */}
      {activeBeaconId !== null && !selectedArtwork && (
        <BeaconPanel
          artworks={activeBeacon.artworks}
          listened={listenedArtworks}
          color={activeBeacon.color}
          onSelect={selectArtwork}
          onClose={closeBeacon}
          recommendedId={
            // Priority 1: post-listen recommendation that belongs to this beacon
            (recommendedArtwork && activeBeacon.artworks.some(a => a.id === recommendedArtwork.id))
              ? recommendedArtwork.id
              // Priority 2: profile-based match (intentions + words + serendipity)
              : perBeaconProfileRec[activeBeaconId]?.id ?? null
          }
        />
      )}

      {/* ── Artwork player ── */}
      {!!selectedArtwork && (
        <ArtworkPlayer
          key={selectedArtwork.id}
          artwork={selectedArtwork}
          color={activeBeacon.color}
          onBack={backFromPlayer}
          onFinish={artworkFinished}
        />
      )}

      {/* ── Exit-confirm overlay (hold-to-confirm countdown) ── */}
      {exitConfirmVisible && (
        <Animated.View
          pointerEvents="none"
          style={[exitStyles.backdrop, { opacity: exitConfirmOpacity }]}
        >
          <View
            style={[
              exitStyles.card,
              Platform.OS === 'web' ? { backdropFilter: 'blur(24px)' } : {},
            ]}
          >
            <Text style={exitStyles.topLabel}>Keep holding to end session</Text>
            <Text style={exitStyles.number}>{Math.max(exitCountdown, 1)}</Text>
            <Text style={exitStyles.hint}>Release to cancel</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Session-complete overlay ── */}
      {sessionComplete && (
        <Animated.View
          style={[
            completeStyles.backdrop,
            { opacity: completeOpacity },
          ]}
        >
          <View
            style={[
              completeStyles.card,
              Platform.OS === 'web' ? { backdropFilter: 'blur(28px)' } : {},
            ]}
          >
            {/* Title */}
            <Text style={completeStyles.title}>
              You've visited{'\n'}every artwork.
            </Text>

            {/* KEEP WANDERING — top */}
            <TouchableOpacity
              style={completeStyles.primaryBtn}
              onPress={() => {
                Animated.timing(completeOpacity, {
                  toValue:         0,
                  duration:        350,
                  easing:          Easing.in(Easing.quad),
                  useNativeDriver: true,
                }).start(() => setSessionComplete(false));
              }}
              activeOpacity={0.8}
            >
              <Text style={completeStyles.primaryText}>KEEP WANDERING</Text>
            </TouchableOpacity>

            {/* END SESSION — bottom, red */}
            <TouchableOpacity
              style={completeStyles.dangerBtn}
              onPress={handleEnd}
              activeOpacity={0.8}
            >
              <Text style={completeStyles.dangerText}>END SESSION</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', overflow: 'hidden' },
  blob:      { position: 'absolute' },
  controls: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 32, alignItems: 'center',
  },
  // Gallery map — full-screen dark veil so blobs glow through behind the floor plan
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  // Constrained card — sits within the defined margins
  mapCard: {
    position:     'absolute',
    top:          MAP_TOP,
    left:         MAP_PAD_H,
    right:        MAP_PAD_H,
    bottom:       MAP_BOTTOM,
    borderRadius: 16,
    overflow:     'hidden',
  },

  // ── Proximity toast — floats above bottom controls ──
  toast: {
    position:         'absolute',
    bottom:           108,
    left:             24,
    right:            24,
    backgroundColor:  'rgba(20,20,20,0.80)',
    borderRadius:     12,
    paddingVertical:  10,
    paddingHorizontal: 16,
    alignItems:       'center',
    borderWidth:      1,
    borderColor:      'rgba(255,255,255,0.15)',
  },
  toastText: {
    fontFamily: FONTS.body,
    color:      '#fff',
    fontSize:   13,
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  // Left exit — glass button
  blobBtn: {
    width:           46,
    height:          46,
    borderRadius:    14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.22)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  blobBtnText: {
    color:      'rgba(255,255,255,0.85)',
    fontSize:   17,
    fontWeight: '300',
  },

  // Right map — glass button
  glassBtn: {
    width:           46,
    height:          46,
    borderRadius:    14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.22)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  glowCircle: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: '#fff',
    shadowColor:     '#fff',
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.7,
    shadowRadius:    8,
  },
});

// ─── Beacon panel styles ──────────────────────────────────────────────────────
const panelStyles = StyleSheet.create({
  container: {
    backgroundColor: '#050505',
    paddingHorizontal: 24,
    paddingTop:    72,
    paddingBottom: 48,
  },
  list: {
    flex: 1,
    gap:             18,
    justifyContent: 'center',
  },
  // Wrapper sits outside the card's overflow:hidden — lets the glow bleed out
  cardWrapper: {
    position: 'relative',
  },
  card: {
    height:           CARD_H,
    borderRadius:     20,
    borderWidth:      1.5,
    overflow:         'hidden',
    backgroundColor:  '#050505',
  },
  cardImg: { width: '100%', height: '100%', position: 'absolute' },
  cardDim: { opacity: 0.35 },

  // Code badge (top-left corner)
  codeBadge: {
    position:      'absolute',
    top:           10,
    left:          10,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:  6,
  },
  codeText: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Title + artist overlay (bottom of card)
  cardOverlay: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical:   8,
  },
  cardTitle: {
    fontFamily: FONTS.title,
    color:      '#fff',
    fontSize:   12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardArtist: {
    fontFamily: FONTS.body,
    color:    'rgba(255,255,255,0.60)',
    fontSize: 10,
    marginTop: 1,
  },

  closeBtn: {
    position: 'absolute',
    top:      52,
    right:    24,
  },

  // "✦ SUGGESTED" badge — top-right corner of recommended card
  suggestedBadge: {
    position:          'absolute',
    top:               10,
    right:             10,
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      20,
  },
  suggestedText: {
    color:         '#000',
    fontSize:      9,
    fontWeight:    '800',
    letterSpacing: 1.0,
  },
});

// ─── Player styles ────────────────────────────────────────────────────────────
const playerStyles = StyleSheet.create({

  // Solid dark veil — blobs stay hidden while the player is open
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,5,0.97)',
  },

  // Root column — flex:1 so blobSection expands to fill available height
  outerContainer: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    paddingTop:        Platform.OS === 'ios' ? 110 : 100,
    paddingHorizontal: 28,
    paddingBottom:     4,
    alignItems:        'center',
  },

  codePill: {
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderRadius:      20,
    marginBottom:      12,
    alignSelf:         'center',
  },
  codePillText: {
    color:         '#000',
    fontSize:      10,
    fontWeight:    '800',
    letterSpacing: 0.8,
  },

  title: {
    fontFamily:    FONTS.title,
    color:         '#fff',
    fontSize:      20,
    fontWeight:    '700',
    textAlign:     'center',
    letterSpacing: 0.8,
    lineHeight:    28,
    marginBottom:  5,
    maxWidth:      '92%',
  },
  meta: {
    fontFamily:    FONTS.body,
    color:         'rgba(255,255,255,0.42)',
    fontSize:      12,
    fontWeight:    '300',
    textAlign:     'center',
    letterSpacing: 0.3,
    marginBottom:  5,
  },
  mood: {
    fontFamily:    FONTS.body,
    fontSize:      12,
    fontStyle:     'italic',
    letterSpacing: 0.4,
    textAlign:     'center',
    opacity:       0.80,
  },

  // ── Blob section — flex:1 fills all remaining vertical space ──────────────
  blobSection: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Bottom section ────────────────────────────────────────────────────────
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom:     106,
    alignItems:        'center',
    width:             '100%',
  },

  separator: {
    height: 0,
  },

  // Seek bar
  trackWrapper: {
    width:          '100%',
    height:         24,
    justifyContent: 'center',
    marginBottom:   2,
  },
  track: {
    position:        'absolute',
    left: 0, right: 0,
    height:          2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    1,
  },
  fill: {
    position:     'absolute',
    left:         0,
    height:       2,
    borderRadius: 1,
  },
  handle: {
    position:     'absolute',
    top:          6,
    width:        12,
    height:       12,
    borderRadius: 6,
    marginLeft:   -6,
  },
  timeRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    width:          '100%',
    marginBottom:   18,
  },
  timeText: {
    color:      'rgba(255,255,255,0.35)',
    fontSize:   11,
    fontWeight: '300',
  },

  // ── Transport controls: leftWing | playBtn | rightWing ────────────────────
  // Using flex wings ensures the play button is always exactly centred.
  controlsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    width:          '100%',
    marginBottom:   18,
  },
  leftWing: {
    flex:           1,
    flexDirection:  'row',
    justifyContent: 'flex-end',
    alignItems:     'center',
    paddingRight:   22,
  },
  rightWing: {
    flex:           1,
    flexDirection:  'row',
    justifyContent: 'flex-start',
    alignItems:     'center',
    paddingLeft:    22,
    gap:            10,
  },
  skipBtn: {
    width:          50,
    height:         50,
    alignItems:     'center',
    justifyContent: 'center',
  },
  skipIcon: {
    color:      'rgba(255,255,255,0.70)',
    fontSize:   26,
    lineHeight: 28,
  },
  skipLabel: {
    color:         'rgba(255,255,255,0.38)',
    fontSize:      9,
    fontWeight:    '500',
    letterSpacing: 0.3,
    marginTop:     -2,
    textAlign:     'center',
  },
  playBtn: {
    width:           80,
    height:          80,
    borderRadius:    40,
    borderWidth:     1.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  playIcon: {
    fontSize: 28,
  },
  speedBtn: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  speedText: {
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },

  theftLine: {
    color:         'rgba(255,255,255,0.18)',
    fontSize:      10,
    letterSpacing: 0.3,
    textAlign:     'center',
  },

  backBtn: { position: 'absolute', top: 52, right: 24 },
});

// ─── Session-complete overlay styles ─────────────────────────────────────────
// ─── Hold-to-exit countdown styles ───────────────────────────────────────────
const exitStyles = StyleSheet.create({
  // Full-screen dim — pointer-events none so Pressable still fires onPressOut
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          200,
  },
  // Compact glass card — not bold, stays cohesive with the dark aesthetic
  card: {
    width:             200,
    backgroundColor:   'rgba(15,15,15,0.85)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.10)',
    borderRadius:      24,
    paddingVertical:   28,
    paddingHorizontal: 24,
    alignItems:        'center',
    gap:               6,
  },
  topLabel: {
    color:         'rgba(255,255,255,0.50)',
    fontSize:      11,
    fontWeight:    '300',
    letterSpacing: 0.4,
    textAlign:     'center',
    marginBottom:  6,
  },
  number: {
    color:         'rgba(255,255,255,0.82)',
    fontSize:      72,
    fontWeight:    '200',
    lineHeight:    80,
    letterSpacing: -2,
  },
  hint: {
    color:         'rgba(255,255,255,0.22)',
    fontSize:      10,
    fontWeight:    '300',
    letterSpacing: 0.3,
    marginTop:     6,
  },
});

const completeStyles = StyleSheet.create({
  // Full-screen dim backdrop — blobs still visible through it
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent:  'center',
    alignItems:      'center',
    paddingHorizontal: 28,
    zIndex:          200,
  },

  // Glass card
  card: {
    width:           '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.18)',
    borderRadius:    28,
    paddingVertical:   40,
    paddingHorizontal: 28,
    alignItems:      'center',
  },

  title: {
    fontFamily:    FONTS.title,
    color:         '#fff',
    fontSize:      26,
    fontWeight:    '700',
    textAlign:     'center',
    lineHeight:    34,
    letterSpacing: 0.2,
    marginBottom:  36,
  },

  // Primary — "KEEP WANDERING" glass button
  primaryBtn: {
    width:             '100%',
    backgroundColor:   'rgba(255,255,255,0.15)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.35)',
    borderRadius:      50,
    paddingVertical:   15,
    alignItems:        'center',
    marginBottom:      12,
  },
  primaryText: {
    fontFamily:    FONTS.title,
    color:         '#fff',
    fontSize:      13,
    fontWeight:    '600',
    letterSpacing: 2,
  },

  // Danger — "END SESSION" red button, same shape as primary
  dangerBtn: {
    width:             '100%',
    backgroundColor:   'rgba(220,38,38,0.20)',
    borderWidth:       1,
    borderColor:       'rgba(220,38,38,0.55)',
    borderRadius:      50,
    paddingVertical:   15,
    alignItems:        'center',
  },
  dangerText: {
    fontFamily:    FONTS.title,
    color:         '#FF6B6B',
    fontSize:      13,
    fontWeight:    '600',
    letterSpacing: 2,
  },
});
