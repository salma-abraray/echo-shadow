import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import Svg, { Circle, Line, Polyline, G, Text as SvgText, Rect } from 'react-native-svg';
import { ghostBtn, ghostBtnTxt, FONTS } from '../theme';
import ScrollArrow from '../components/ScrollArrow';

const { width, height } = Dimensions.get('window');

// ─── Blobs (same palette + positions as the rest of the app) ─────────────────
const BLOBS = [
  { color: '#FF6820', cx: width * 0.80, cy: height * 0.18, radius: 175 },
  { color: '#FF2D78', cx: width * 0.12, cy: height * 0.46, radius: 200 },
  { color: '#3A9FFF', cx: width * 0.05, cy: height * 0.76, radius: 215 },
  { color: '#AAFF22', cx: width * 0.68, cy: height * 0.82, radius: 175 },
];

// ─── Layout constants ─────────────────────────────────────────────────────────
const TOTAL      = 3;
const SLIDE_PAD  = 24;
const MAP_W      = width - SLIDE_PAD * 2;
const MAP_H      = Math.round(height * 0.55);

const FONT = FONTS.body;

// ─── Stats computed from real session data ─────────────────────────────────────
function buildStats(sd) {
  if (!sd) return [
    { label: 'Total time',           value: '–:–'    },
    { label: 'Artworks visited',     value: '– / 12' },
    { label: 'Followed suggestions', value: '–×'     },
    { label: 'Went against guide',   value: '–×'     },
  ];
  const { durationSeconds = 0, artworksVisited = 0, totalArtworks = 12,
          followedSuggestions = 0, ignoredSuggestions = 0 } = sd;
  const mm = Math.floor(durationSeconds / 60);
  const ss = String(durationSeconds % 60).padStart(2, '0');
  return [
    { label: 'Total time',           value: `${mm}:${ss}` },
    { label: 'Artworks visited',     value: `${artworksVisited} / ${totalArtworks}` },
    { label: 'Followed suggestions', value: `${followedSuggestions}×` },
    { label: 'Went against guide',   value: `${ignoredSuggestions}×` },
  ];
}

// ─── Moment colours ───────────────────────────────────────────────────────────
const MC = {
  followed:   '#4F6EF5', // indigo
  against:    '#E8651A', // orange
  hesitation: '#E8B419', // gold
};

// ─── Map geometry helpers ─────────────────────────────────────────────────────
const buildFP = (mw, mh) => ({
  l: mw * 0.09, r: mw * 0.92,
  t: mh * 0.06, b: mh * 0.90,
  exLeft: 0,    exTop: mh * 0.22, exBot: mh * 0.34,
  enLeft: mw * 0.65, enBot: mh,
});

// D = top · B = right · C = left · A = bottom  (matches SerendipityMapScreen)
const buildBeacons = (mw, mh) => ({
  D: { x: mw * 0.50, y: mh * 0.12 },
  B: { x: mw * 0.87, y: mh * 0.50 },
  C: { x: mw * 0.15, y: mh * 0.50 },
  A: { x: mw * 0.50, y: mh * 0.84 },
});

// Artwork pills — 3 per beacon, pushed toward the nearest wall
// artId groups match BEACON_CONFIGS in SerendipityMapScreen (index 0-11)
const PW = 26, PH = 9, GAP = 5, RX = 4; // horizontal pill
const VW = 9,  VH = 26;                  // vertical pill

const buildPillGroups = (mw, mh) => {
  const bs = buildBeacons(mw, mh);
  const f  = buildFP(mw, mh);
  return [
    // D = top   → horizontal pills, pushed toward top wall
    { key: 'D', axis: 'h', cx: bs.D.x,      cy: f.t + (bs.D.y - f.t) * 0.30, artIds: [9, 10, 11] },
    // B = right → vertical pills, pushed toward right wall
    { key: 'B', axis: 'v', cx: bs.B.x + (f.r - bs.B.x) * 0.70, cy: bs.B.y,  artIds: [3, 4, 5]  },
    // C = left  → vertical pills, pushed toward left wall
    { key: 'C', axis: 'v', cx: f.l + (bs.C.x - f.l) * 0.30, cy: bs.C.y,     artIds: [6, 7, 8]  },
    // A = bottom → horizontal pills, pushed toward bottom wall
    { key: 'A', axis: 'h', cx: bs.A.x,      cy: bs.A.y + (f.b - bs.A.y) * 0.70, artIds: [0, 1, 2] },
  ].map(g => {
    const pills = g.axis === 'h'
      ? [0,1,2].map(i => ({ x: g.cx - (3*PW+2*GAP)/2 + i*(PW+GAP), y: g.cy - PH/2, w: PW, h: PH }))
      : [0,1,2].map(i => ({ x: g.cx - VW/2, y: g.cy - (3*VH+2*GAP)/2 + i*(VH+GAP), w: VW, h: VH }));
    return { ...g, pills };
  });
};

// Entrance → (real beacon order, or fallback D→B→C→A) → Exit
const buildPath = (mw, mh, beaconOrder = null) => {
  const bs       = buildBeacons(mw, mh);
  const entrance = { x: mw * 0.78, y: mh * 0.96 }; // bottom-right
  const exit_pt  = { x: 0,         y: mh * 0.28 }; // left wall
  if (beaconOrder && beaconOrder.length > 0) {
    const pts = beaconOrder.map(id => bs[id]).filter(Boolean);
    return [entrance, ...pts, exit_pt];
  }
  const { D, B, C, A } = bs;
  return [entrance, D, B, C, A, exit_pt];
};

// Moment icons — placed near their beacon when real data exists, or static fallback
const buildMoments = (mw, mh, moments = null) => {
  const bs = buildBeacons(mw, mh);

  if (moments && moments.length > 0) {
    const beaconCount = {};
    return moments
      .map((m) => {
        const beacon = bs[m.beacon];
        if (!beacon) return null;

        // Spread multiple moments around the same beacon in 90° steps
        const count   = beaconCount[m.beacon] || 0;
        beaconCount[m.beacon] = count + 1;
        const angle   = (count * 90 - 45) * (Math.PI / 180);
        const dist    = 30 + count * 14;
        const x       = beacon.x + Math.cos(angle) * dist;
        const y       = beacon.y + Math.sin(angle) * dist;

        // Format listened time
        const secs    = m.listenedSeconds ?? 0;
        const mm_     = Math.floor(secs / 60);
        const ss_     = String(secs % 60).padStart(2, '0');
        const time    = secs > 0 ? `${mm_}:${ss_}` : null;

        return { type: m.type, x, y, time, title: m.title };
      })
      .filter(Boolean);
  }

  // ── Static fallback (no session data) ────────────────────────────────────────
  const { D, B, C, A } = bs;
  return [
    { type: 'followed', x: D.x + 20,        y: D.y,              time: null },
    { type: 'against',  x: B.x - 22,        y: B.y,              time: null },
    { type: 'followed', x: (B.x + C.x) / 2, y: (B.y + C.y) / 2, time: null },
    { type: 'against',  x: C.x + 22,        y: C.y,              time: null },
  ];
};

// ─── PulsingBlob ──────────────────────────────────────────────────────────────
function PulsingBlob({ blob, index }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 500),
        Animated.timing(scale, { toValue: 1.08, duration: 1300, useNativeDriver: false }),
        Animated.timing(scale, { toValue: 0.94, duration: 1100, useNativeDriver: false }),
        Animated.timing(scale, { toValue: 1.00, duration: 1200, useNativeDriver: false }),
        Animated.delay(400),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const blurStyle = Platform.OS === 'web' ? { filter: 'blur(55px)' } : {};
  return (
    <Animated.View
      style={[{
        position:        'absolute',
        left:            blob.cx - blob.radius,
        top:             blob.cy - blob.radius,
        width:           blob.radius * 2,
        height:          blob.radius * 2,
        borderRadius:    blob.radius,
        backgroundColor: blob.color,
        transform:       [{ scale }],
      }, blurStyle]}
    />
  );
}

// ─── JourneyMapSvg ────────────────────────────────────────────────────────────
function JourneyMapSvg({ mw, mh, showMoments = false, beaconOrder = null, moments = null, active = false, listenedArtworks = null }) {
  const f    = buildFP(mw, mh);
  const bs   = buildBeacons(mw, mh);
  const path = buildPath(mw, mh, beaconOrder);
  const pts  = path.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const moms = showMoments ? buildMoments(mw, mh, moments) : [];

  // Animate moment icons fading in when this slide becomes active
  const momOpacityAnim = useRef(new Animated.Value(0)).current;
  const [momOpacity, setMomOpacity] = useState(0);

  useEffect(() => {
    const id = momOpacityAnim.addListener(({ value }) => setMomOpacity(value));
    return () => momOpacityAnim.removeListener(id);
  }, []);

  useEffect(() => {
    if (showMoments && active) {
      Animated.timing(momOpacityAnim, {
        toValue: 1, duration: 1400, delay: 300, useNativeDriver: false,
      }).start();
    } else {
      momOpacityAnim.setValue(0);
      setMomOpacity(0);
    }
  }, [active, showMoments]);

  const sc = 'rgba(255,255,255,0.40)'; // wall line colour
  const sw = 1;
  const tc = 'rgba(255,255,255,0.38)';
  const fs = 7.5;

  return (
    <Svg width={mw} height={mh}>

      {/* ── Floorplan walls ── */}
      <Line x1={f.l}      y1={f.t}     x2={f.r}      y2={f.t}     stroke={sc} strokeWidth={sw} />
      <Line x1={f.r}      y1={f.t}     x2={f.r}      y2={f.enBot} stroke={sc} strokeWidth={sw} />
      <Line x1={f.enLeft} y1={f.enBot} x2={f.r}      y2={f.enBot} stroke={sc} strokeWidth={sw} />
      <Line x1={f.enLeft} y1={f.b}     x2={f.enLeft} y2={f.enBot} stroke={sc} strokeWidth={sw} />
      <Line x1={f.l}      y1={f.b}     x2={f.enLeft} y2={f.b}     stroke={sc} strokeWidth={sw} />
      <Line x1={f.l}      y1={f.exBot} x2={f.l}      y2={f.b}     stroke={sc} strokeWidth={sw} />
      <Line x1={f.exLeft} y1={f.exBot} x2={f.l}      y2={f.exBot} stroke={sc} strokeWidth={sw} />
      <Line x1={f.exLeft} y1={f.exTop} x2={f.exLeft} y2={f.exBot} stroke={sc} strokeWidth={sw} />
      <Line x1={f.l}      y1={f.exTop} x2={f.exLeft} y2={f.exTop} stroke={sc} strokeWidth={sw} />
      <Line x1={f.l}      y1={f.t}     x2={f.l}      y2={f.exTop} stroke={sc} strokeWidth={sw} />

      {/* ── Labels ── */}
      <SvgText x={f.exLeft + 4} y={f.exTop - 3}
        fontSize={fs} fill={tc} fontFamily={FONT} letterSpacing={0.5}>
        EXIT
      </SvgText>
      <SvgText x={f.enLeft + 4} y={f.b - 3}
        fontSize={fs} fill={tc} fontFamily={FONT} letterSpacing={0.5}>
        ENTRANCE
      </SvgText>

      {/* ── Dotted journey path ── */}
      <Polyline
        points={pts}
        fill="none"
        stroke="rgba(255,255,255,0.80)"
        strokeWidth={1.5}
        strokeDasharray="3,7"
        strokeLinecap="round"
      />

      {/* ── Artwork pills ── */}
      {(() => {
        const visited = new Set(listenedArtworks ?? []);
        return buildPillGroups(mw, mh).map(g =>
          g.pills.map((p, i) => (
            <Rect
              key={`${g.key}-${i}`}
              x={p.x} y={p.y} width={p.w} height={p.h}
              rx={RX} ry={RX}
              fill="white"
              opacity={visited.has(g.artIds[i]) ? 0.18 : 0.75}
            />
          ))
        );
      })()}


      {/* ── Moment icons (slide 3 only) — fade in when active ── */}
      <G opacity={momOpacity}>
        {moms.map((m, i) => {
          const color  = MC[m.type];
          const symbol = m.type === 'followed' ? '→'
                       : m.type === 'against'  ? '↩'
                       :                         '✕';
          return (
            <G key={i}>
              <Circle cx={m.x} cy={m.y} r={12} fill={color} opacity={0.92} />
              <SvgText
                x={m.x} y={m.y + 4}
                fontSize={11} fill="#fff"
                fontFamily={FONT} textAnchor="middle" fontWeight="700"
              >
                {symbol}
              </SvgText>
              {m.time && (
                <SvgText
                  x={m.x} y={m.y - 17}
                  fontSize={8} fill={color}
                  fontFamily={FONT} textAnchor="middle" fontWeight="600"
                >
                  {m.time}
                </SvgText>
              )}
            </G>
          );
        })}
      </G>
    </Svg>
  );
}

// ─── DotIndicator (same style as IntroSlidesScreen) ──────────────────────────
function DotIndicator({ total, current }) {
  return (
    <View style={di.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[di.dot, i === current && di.dotActive]} />
      ))}
    </View>
  );
}

const di = StyleSheet.create({
  container: {
    position:       'absolute',
    right:          14,
    top:            0,
    bottom:         0,
    flexDirection:  'column',
    gap:            6,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         20,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: {
    width:           6,
    height:          20,
    borderRadius:    3,
    backgroundColor: '#fff',
  },
});

// ─── WrappedScreen ────────────────────────────────────────────────────────────
const ARCHIVE_URL = 'https://wanderlost-archive.example.com'; // placeholder — swap when live

export default function WrappedScreen({ sessionData, visitorName, onFinish, onArchive }) {
  const [slide, setSlide] = useState(0);
  const slideRef = useRef(0);

  // ── Consent overlay state ──────────────────────────────────────────────────
  const [consentVisible, setConsentVisible] = useState(false);
  const [consentState,   setConsentState]   = useState('idle'); // 'idle' | 'declined' | 'accepted'
  const consentOpacity = useRef(new Animated.Value(0)).current;

  // ── Save feedback state ────────────────────────────────────────────────────
  const [saveFeedback, setSaveFeedback] = useState(false);

  const showConsent = useCallback(() => {
    setConsentVisible(true);
    Animated.timing(consentOpacity, {
      toValue: 1, duration: 280,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();
  }, []);

  const hideConsent = useCallback(() => {
    Animated.timing(consentOpacity, {
      toValue: 0, duration: 220,
      easing: Easing.in(Easing.quad), useNativeDriver: false,
    }).start(() => setConsentVisible(false));
  }, []);

  const handleAccept = useCallback(() => {
    setConsentState('accepted');
    hideConsent();
    // Short pause so the overlay fades out before the screen transition
    setTimeout(() => onArchive && onArchive(), 300);
  }, [hideConsent, onArchive]);

  const handleDecline = useCallback(() => {
    setConsentState('declined');
    hideConsent();
  }, [hideConsent]);

  const handleSave = useCallback(() => {
    const stats = buildStats(sessionData);
    const name  = (visitorName || '').trim() || 'Visitor';

    if (Platform.OS !== 'web') {
      Share.share({ title: 'My WanderLost Journey', message: "Here's a summary of my WanderLost visit." });
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);
      return;
    }

    // ── Canvas dimensions (portrait visit card) ────────────────────────────────
    const CW = 600, CH = 800;
    const canvas = document.createElement('canvas');
    canvas.width  = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d');

    const TITLE = "'brandon-grotesque','Helvetica Neue',Arial,sans-serif";
    const BODY  = "'adobe-text-pro',Georgia,serif";
    const PAD   = 44;

    // ── Background ──────────────────────────────────────────────────────────────
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CW, CH);

    // ── Color blobs ─────────────────────────────────────────────────────────────
    const drawBlob = (cx, cy, r, hex) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,   hex + 'B0');
      g.addColorStop(0.55, hex + '44');
      g.addColorStop(1,   hex + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };
    drawBlob(CW * 0.90, CH * 0.08, 220, '#FF6820');
    drawBlob(CW * 0.08, CH * 0.44, 240, '#FF2D78');
    drawBlob(CW * 0.05, CH * 0.82, 210, '#3A9FFF');
    drawBlob(CW * 0.78, CH * 0.90, 195, '#AAFF22');

    // ── Dark veil ───────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, CW, CH);

    // ── Header row ──────────────────────────────────────────────────────────────
    ctx.textBaseline = 'middle';

    ctx.font      = `600 10px ${TITLE}`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    ctx.fillText('WANDERLOST', PAD, 56);

    ctx.font      = `400 10px ${BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.textAlign = 'right';
    ctx.fillText('VISIT CARD', CW - PAD, 56);

    // ── Top separator ───────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD, 72); ctx.lineTo(CW - PAD, 72);
    ctx.stroke();

    // ── Tagline ─────────────────────────────────────────────────────────────────
    ctx.textAlign     = 'left';
    ctx.textBaseline  = 'alphabetic';
    ctx.fillStyle     = 'rgba(255,255,255,0.58)';
    ctx.font          = `300 italic 24px ${BODY}`;
    ctx.fillText('You were never fully lost.', PAD, 178);

    // ── Visitor name (auto-shrink if too wide) ──────────────────────────────────
    let fs = 56;
    ctx.font = `700 ${fs}px ${TITLE}`;
    while (ctx.measureText(name).width > CW - PAD * 2 && fs > 28) {
      fs -= 2;
      ctx.font = `700 ${fs}px ${TITLE}`;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, PAD, 258);

    // ── Mid separator ───────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, 296); ctx.lineTo(CW - PAD, 296);
    ctx.stroke();

    // ── YOUR STATS label ────────────────────────────────────────────────────────
    ctx.font      = `600 9px ${TITLE}`;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOUR STATS', PAD, 322);

    // ── Stats grid (2 columns × 2 rows) ─────────────────────────────────────────
    const colW = (CW - PAD * 2) / 2;
    stats.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x   = PAD + col * colW;
      const y   = 356 + row * 110;

      ctx.font          = `500 36px ${TITLE}`;
      ctx.fillStyle     = '#ffffff';
      ctx.textBaseline  = 'alphabetic';
      ctx.fillText(s.value, x, y + 40);

      ctx.font      = `300 12px ${BODY}`;
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillText(s.label, x, y + 62);
    });

    // ── Bottom separator ────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD, CH - 48); ctx.lineTo(CW - PAD, CH - 48);
    ctx.stroke();

    // ── Footer ──────────────────────────────────────────────────────────────────
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'rgba(255,255,255,0.16)';
    ctx.font         = `300 9px ${BODY}`;
    ctx.fillText('echo-shadow — wanderlost', CW / 2, CH - 28);

    // ── Download ────────────────────────────────────────────────────────────────
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const link     = document.createElement('a');
    link.download  = `wanderlost-${safeName}.jpg`;
    link.href      = canvas.toDataURL('image/jpeg', 0.93);
    link.click();

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  }, [visitorName, sessionData]);

  const handleScroll = useCallback((e) => {
    const page    = Math.round(e.nativeEvent.contentOffset.y / height);
    const clamped = Math.max(0, Math.min(page, TOTAL - 1));
    if (clamped !== slideRef.current) {
      slideRef.current = clamped;
      setSlide(clamped);
    }
  }, []);

  return (
    <View style={ws.root}>

      {/* Pulsing blob background */}
      {BLOBS.map((b, i) => <PulsingBlob key={i} blob={b} index={i} />)}
      <View style={ws.darkVeil} pointerEvents="none" />

      {/* Horizontal paging scroll */}
      <ScrollView
        pagingEnabled
        bounces={false}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ flexGrow: 0 }}
      >

        {/* ─────────────── Slide 1 · YOUR WRAPPED JOURNEY ─────────────── */}
        <View style={[ws.slide, { paddingTop: height * 0.42 }]}>

          <Text style={ws.bigTitle}>
            You were never{'\n'}fully lost.
          </Text>

          <Text style={ws.introBody}>
            A path began to form around what seemed to interest you. Yet every
            choice remained open to surprise.
          </Text>
          <Text style={[ws.introBody, { marginTop: 14 }]}>
            We suggested routes based on your choices, predicting what might
            draw your attention. But you were always free to follow, resist,
            pause, or be surprised.
          </Text>
          <Text style={[ws.introBody, { marginTop: 14 }]}>
            Serendipity emerges when you drift away from what was calculated for you.
          </Text>

          <ScrollArrow style={{ marginTop: 24 }} />

        </View>

        {/* ─────────────── Slide 2 · YOUR JOURNEY ──────────────────────── */}
        <View style={ws.slide}>

          {/* Journey map */}
          <View style={ws.glassCard}>
            <JourneyMapSvg
              mw={MAP_W}
              mh={MAP_H}
              beaconOrder={sessionData?.beaconOrder ?? null}
              listenedArtworks={sessionData?.listenedArtworks ?? null}
            />
          </View>

          {/* Stats */}
          <View style={ws.glassCard}>
            <Text style={ws.cardHeading}>YOUR STATS</Text>
            {buildStats(sessionData).map((s, i) => (
              <View key={i} style={[ws.statRow, i > 0 && ws.statBorder]}>
                <Text style={ws.statLabel}>{s.label}</Text>
                <Text style={ws.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>

        </View>

        {/* ─────────────── Slide 3 · MOMENTS ───────────────────────────── */}
        <View style={ws.slide}>

          {/* Moments map — same size as slide 2, icons fade in when active */}
          <View style={ws.glassCard}>
            <JourneyMapSvg
              mw={MAP_W}
              mh={MAP_H}
              showMoments
              active={slide === 2}
              beaconOrder={sessionData?.beaconOrder ?? null}
              moments={sessionData?.moments ?? null}
              listenedArtworks={sessionData?.listenedArtworks ?? null}
            />
          </View>

          {/* Legend */}
          <View style={[ws.glassCard, { marginBottom: 14, paddingVertical: 14 }]}>
            {[
              { type: 'followed',   label: 'FOLLOWED THE SUGGESTION'     },
              { type: 'against',    label: 'WENT AGAINST THE SUGGESTION' },
            ].map((item, i) => (
              <View key={i} style={[ws.legendRow, i > 0 && { marginTop: 12 }]}>
                <View style={[ws.legendDot, { backgroundColor: MC[item.type] }]} />
                <Text style={ws.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* ── SAVE icon + VISIT THE ARCHIVE ── */}
          <View style={ws.actionRow}>

            {/* VISIT THE ARCHIVE button */}
            <TouchableOpacity
              style={[ghostBtn, ws.archiveBtn]}
              onPress={
                consentState === 'accepted'
                  ? () => onArchive && onArchive()
                  : () => { setConsentState('idle'); showConsent(); }
              }
              activeOpacity={0.85}
            >
              <Text style={ghostBtnTxt}>VISIT THE ARCHIVE</Text>
            </TouchableOpacity>

            {/* Save pill — icon + label */}
            <TouchableOpacity style={[ws.saveBtn, saveFeedback && ws.saveBtnDone]} onPress={handleSave} activeOpacity={0.85}>
              {saveFeedback ? (
                <Text style={ws.saveBtnTxt}>SAVED ✓</Text>
              ) : (
                <>
                  <Svg width={14} height={14} viewBox="0 0 20 20" style={{ marginRight: 6 }}>
                    <Line x1={10} y1={3}  x2={10} y2={13} stroke="rgba(255,255,255,0.80)" strokeWidth={1.8} strokeLinecap="round" />
                    <Polyline points="6,10 10,14 14,10" fill="none" stroke="rgba(255,255,255,0.80)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    <Line x1={4}  y1={17} x2={16} y2={17} stroke="rgba(255,255,255,0.80)" strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                  <Text style={ws.saveBtnTxt}>SAVE</Text>
                </>
              )}
            </TouchableOpacity>

          </View>

        </View>


      </ScrollView>

      <DotIndicator total={TOTAL} current={slide} />

      {/* ── Consent overlay ────────────────────────────────────────────── */}
      {consentVisible && (
        <Animated.View
          style={[
            co.backdrop,
            { opacity: consentOpacity },
            Platform.OS === 'web' ? { backdropFilter: 'blur(22px)' } : {},
          ]}
        >
          <View style={co.card}>
            <Text style={co.title}>Share your data?</Text>
            <Text style={co.body}>
              To visit the archive, your visit data will be shared with the
              platform so your journey can be compared with other visitors.
            </Text>

            <TouchableOpacity style={[ghostBtn, co.primaryBtn]} onPress={handleAccept} activeOpacity={0.85}>
              <Text style={ghostBtnTxt}>ACCEPT & CONTINUE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={co.secondaryBtn} onPress={handleDecline} activeOpacity={0.85}>
              <Text style={co.secondaryText}>DECLINE</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#000' },
  darkVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },

  slide: {
    width,
    height,
    paddingHorizontal: SLIDE_PAD,
    paddingTop:        110,
    paddingBottom:     36,
  },

  // ── Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   20,
  },
  sectionLabel: {
    color:         'rgba(255,255,255,0.40)',
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 1.5,
    lineHeight:    14,
    fontFamily:    FONTS.title,
  },
  counter: {
    color:      'rgba(255,255,255,0.28)',
    fontSize:   12,
    fontWeight: '300',
    fontFamily: FONTS.body,
  },

  // ── Slide 1 text
  bigTitle: {
    fontFamily:   FONTS.title,
    color:        '#fff',
    fontSize:     46,
    fontWeight:   '700',
    lineHeight:   50,
    marginBottom: 18,
  },
  introBody: {
    fontFamily: FONTS.body,
    color:      'rgba(255,255,255,0.80)',
    fontSize:   15,
    lineHeight: 24,
    fontWeight: '300',
  },
  card: {
    backgroundColor: 'rgba(15, 8, 4, 0.65)',
    borderRadius:    18,
    padding:         22,
  },
  leadLine: {
    fontFamily: FONTS.body,
    color:      '#fff',
    fontSize:   16,
    fontWeight: '600',
    lineHeight: 24,
  },
  cardBody: {
    fontFamily: FONTS.body,
    color:      'rgba(255,255,255,0.70)',
    fontSize:   14,
    lineHeight: 23,
    fontWeight: '300',
  },
  boldLine: {
    marginTop:  18,
    fontWeight: '600',
    color:      '#fff',
    lineHeight: 23,
  },

  // ── Shared glass card
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.12)',
    borderRadius:    18,
    overflow:        'hidden',
    marginBottom:    12,
    paddingHorizontal: 0, // SVG cards have no padding; stat/legend cards add their own
  },

  // ── Stats (slide 2)
  cardHeading: {
    fontFamily:    FONTS.title,
    color:         'rgba(255,255,255,0.35)',
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 1.5,
    marginTop:     14,
    marginBottom:  8,
    paddingHorizontal: 18,
  },
  statRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical:   8,
    paddingHorizontal: 18,
  },
  statBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  statLabel: {
    fontFamily: FONTS.body,
    color:      'rgba(255,255,255,0.50)',
    fontSize:   13,
    fontWeight: '300',
  },
  statValue: {
    fontFamily: FONTS.title,
    color:      '#fff',
    fontSize:   13,
    fontWeight: '500',
  },

  // ── Slide 3 subtitle
  subtitle: {
    fontFamily:   FONTS.body,
    color:        'rgba(255,255,255,0.42)',
    fontSize:     13,
    fontWeight:   '300',
    marginBottom: 12,
    marginTop:    -10,
  },

  // ── Legend (slide 3)
  legendRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingHorizontal: 18,
  },
  legendDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  legendLabel: {
    fontFamily:    FONTS.body,
    color:         'rgba(255,255,255,0.60)',
    fontSize:      11,
    fontWeight:    '400',
    letterSpacing: 0.4,
  },

  // ── SAVE icon + VISIT THE ARCHIVE row ────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap:           10,
  },

  // SAVE — labeled pill matching ghostBtn aesthetic
  saveBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 18,
    height:          46,
    borderRadius:    23,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.25)',
    flexShrink:      0,
  },
  saveBtnDone: {
    backgroundColor: 'rgba(170,255,34,0.15)',
    borderColor:     'rgba(170,255,34,0.40)',
  },
  saveBtnTxt: {
    fontFamily:    FONTS.title,
    color:         '#fff',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 1.8,
  },

  // VISIT THE ARCHIVE — ghostBtn from theme + flex to fill available space
  archiveBtn: {
    flex:              1,
    paddingHorizontal: 12,
  },
});

// ─── Consent overlay styles ───────────────────────────────────────────────────
const co = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent:  'center',
    alignItems:      'center',
    paddingHorizontal: 28,
    zIndex:          300,
  },
  card: {
    width:             '100%',
    backgroundColor:   'rgba(255,255,255,0.08)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.18)',
    borderRadius:      28,
    paddingVertical:   40,
    paddingHorizontal: 28,
    alignItems:        'center',
  },
  title: {
    fontFamily:    FONTS.title,
    color:         '#fff',
    fontSize:      24,
    fontWeight:    '700',
    textAlign:     'center',
    letterSpacing: 0.2,
    marginBottom:  14,
  },
  body: {
    fontFamily:   FONTS.body,
    color:        'rgba(255,255,255,0.55)',
    fontSize:     14,
    lineHeight:   22,
    fontWeight:   '300',
    textAlign:    'center',
    marginBottom: 32,
  },
  primaryBtn: {
    width:        '100%',
    marginBottom: 12,
  },
  secondaryBtn: {
    width:           '100%',
    backgroundColor: 'rgba(220,38,38,0.18)',
    borderWidth:     1,
    borderColor:     'rgba(220,38,38,0.55)',
    borderRadius:    50,
    paddingVertical: 15,
    alignItems:      'center',
  },
  secondaryText: {
    fontFamily:    FONTS.title,
    color:         '#FF6B6B',
    fontSize:      13,
    fontWeight:    '600',
    letterSpacing: 2,
  },
});
