import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../theme';

const { width, height } = Dimensions.get('window');

const LOGO_IMG = require('../../assets/images/logo_splash.png');
const LOGO_DISPLAY_W = Math.round(width * 0.78);
const LOGO_DISPLAY_H = Math.round(LOGO_DISPLAY_W * (228 / 468));

// ─── Blob config ──────────────────────────────────────────────────────────────
const BLOB_RADIUS = 160;
const STAGGER_MS  = 700;

const BLOBS = [
  { color: '#3A9FFF', cx: width * 0.68, cy: height * 0.22 },
  { color: '#FF6820', cx: width * 0.72, cy: height * 0.55 },
  { color: '#FF2D78', cx: width * 0.18, cy: height * 0.44 },
  { color: '#AAFF22', cx: width * 0.30, cy: height * 0.72 },
];

// ─── Single animated blob ──────────────────────────────────────────────────────
function AnimatedBlob({ blob, enterDelay }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulse  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1, duration: 900, delay: enterDelay, useNativeDriver: false,
    }).start();

    let pulseAnim;
    const timer = setTimeout(() => {
      pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.07, duration: 1300, useNativeDriver: false }),
          Animated.timing(pulse, { toValue: 0.95, duration: 1100, useNativeDriver: false }),
          Animated.timing(pulse, { toValue: 1.00, duration: 1200, useNativeDriver: false }),
          Animated.delay(500),
        ])
      );
      pulseAnim.start();
    }, enterDelay + 900);

    return () => { clearTimeout(timer); if (pulseAnim) pulseAnim.stop(); };
  }, []);

  const blurStyle = Platform.OS === 'web' ? { filter: 'blur(72px)' } : {};

  return (
    <Animated.View
      style={[{
        position:        'absolute',
        left:            blob.cx - BLOB_RADIUS,
        top:             blob.cy - BLOB_RADIUS,
        width:           BLOB_RADIUS * 2,
        height:          BLOB_RADIUS * 2,
        borderRadius:    BLOB_RADIUS,
        backgroundColor: blob.color,
        opacity:         fadeIn,
        transform:       [{ scale: pulse }],
      }, blurStyle]}
    />
  );
}

// ─── Blob-button CSS (web only) — blurred shape + colour cycle ───────────────
const BLOB_BTN_COLOR = 'rgba(255, 104, 32, 0.88)';

function injectBlobBtnCSS() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('wl-start-blob-style')) return;
  const el = document.createElement('style');
  el.id = 'wl-start-blob-style';
  // Targets only the background layer (#wl-blob-bg), not the text sibling
  el.textContent = `
    #wl-blob-bg {
      animation: wlStartBlob 10s ease-in-out infinite !important;
      filter: blur(18px) !important;
    }
    @keyframes wlStartBlob {
      0%   { border-radius: 58% 42% 34% 66% / 52% 36% 64% 48%;
             background-color: rgba(255,104,32,0.92); }
      25%  { border-radius: 38% 62% 68% 32% / 62% 44% 56% 38%;
             background-color: rgba(255,45,120,0.92); }
      50%  { border-radius: 66% 34% 42% 58% / 40% 60% 40% 60%;
             background-color: rgba(58,159,255,0.92); }
      75%  { border-radius: 44% 56% 56% 44% / 58% 38% 62% 42%;
             background-color: rgba(170,255,34,0.92); }
      100% { border-radius: 58% 42% 34% 66% / 52% 36% 64% 48%;
             background-color: rgba(255,104,32,0.92); }
    }
  `;
  document.head.appendChild(el);
}

// ─── Splash screen ────────────────────────────────────────────────────────────
export default function SplashScreen({ onFinish, onIntro, onAbout }) {
  const insets = useSafeAreaInsets();

  const blobGroupOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity      = useRef(new Animated.Value(0)).current;
  const btnsOpacity      = useRef(new Animated.Value(0)).current;

  useEffect(() => { injectBlobBtnCSS(); }, []);

  useEffect(() => {
    // All 4 blobs fully visible after ≈ 4 s
    const allBlobsIn = (BLOBS.length - 1) * STAGGER_MS + 900 + 150;

    Animated.sequence([
      // ── Wait for blobs ──
      Animated.delay(allBlobsIn),

      // ── Logo fades in gently + blobs dim simultaneously ──
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 1400, useNativeDriver: false,
        }),
        Animated.timing(blobGroupOpacity, {
          toValue: 0.18, duration: 2400, useNativeDriver: false,
        }),
      ]),

      // ── Hold before start button appears ──
      Animated.delay(800),

      // ── Start button fades in ──
      Animated.timing(btnsOpacity, { toValue: 1, duration: 700, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={s.container}>

      {/* ── Blobs — wrapped so we can dim the whole group ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: blobGroupOpacity }]} pointerEvents="none">
        {BLOBS.map((blob, i) => (
          <AnimatedBlob key={i} blob={blob} enterDelay={i * STAGGER_MS} />
        ))}
      </Animated.View>

      {/* Dark overlay */}
      <View style={s.veil} pointerEvents="none" />

      {/* ── WANDERLOST logo — fades in gently ── */}
      <Animated.View
        style={[s.logoWrap, { opacity: logoOpacity }]}
        pointerEvents="none"
      >
        <Image
          source={LOGO_IMG}
          style={{ width: LOGO_DISPLAY_W, height: LOGO_DISPLAY_H }}
          resizeMode="contain"
          fadeDuration={0}
        />
        <Text style={s.tagline}>MAPPING UNEXPECTED MOMENTS</Text>
      </Animated.View>

      {/* ── START button (appears after logo) ── */}
      <Animated.View style={[s.mainWrap, { opacity: btnsOpacity }]}>
        <TouchableOpacity onPress={onFinish} activeOpacity={0.85} style={{ alignSelf: 'center' }}>
          {/* Outer wrapper — no overflow:hidden so the blur can bleed outside */}
          <View style={{ width: 170, height: 170, alignItems: 'center', justifyContent: 'center' }}>
            {/* Blurred morphing blob background — targeted by #wl-blob-bg in CSS */}
            <View
              nativeID="wl-blob-bg"
              style={{
                position:        'absolute',
                width:           170,
                height:          170,
                backgroundColor: BLOB_BTN_COLOR,
                borderRadius:    85,
              }}
            />
            {/* Text sits above the blur layer and stays sharp */}
            <Text style={s.blobBtnText}>START</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Bottom row — INTRO (left) + ABOUT (right) ── */}
      <Animated.View
        style={[s.bottomRow, { opacity: btnsOpacity, bottom: Math.max(40, insets.bottom + 24) }]}
      >
        <TouchableOpacity onPress={onIntro} activeOpacity={0.6} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={s.linkBtn}>INTRO</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onAbout} activeOpacity={0.6} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={s.linkBtn}>ABOUT</Text>
        </TouchableOpacity>
      </Animated.View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#000',
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // ── WANDERLOST logo — upper area ──
  logoWrap: {
    position:       'absolute',
    top:            height * 0.18,
    left:           0,
    right:          0,
    alignItems:     'center',
  },
  tagline: {
    fontFamily:    FONTS.title,
    marginTop:     14,
    fontSize:      11,
    fontWeight:    '400',
    color:         'rgba(255,255,255,0.50)',
    letterSpacing: 2.5,
    textAlign:     'center',
  },

  // ── Blob START button wrapper ──
  mainWrap: {
    position:       'absolute',
    left:           0,
    right:          0,
    top:            '52%',
    alignItems:     'center',
  },
  blobBtnText: {
    fontFamily:    FONTS.title,
    color:         '#fff',
    fontSize:      17,
    letterSpacing: 3,
    fontWeight:    '800',
  },

  // ── Bottom row ──
  bottomRow: {
    position:       'absolute',
    left:           28,
    right:          28,
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  linkBtn: {
    fontFamily:         FONTS.title,
    color:              'rgba(255,255,255,0.65)',
    fontSize:           12,
    fontWeight:         '500',
    letterSpacing:      2,
    textDecorationLine: 'underline',
  },
});
