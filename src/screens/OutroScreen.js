import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import ScrollArrow from '../components/ScrollArrow';
import { ghostBtn, ghostBtnTxt, FONTS } from '../theme';

const { width, height } = Dimensions.get('window');

// ─── Slide content ──────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    title: 'Your visit left\nsome traces',
    leadLine: 'The most efficient path is rarely the most meaningful one.',
    paragraphs: [
      'Feel free to ignore the guide, change direction, and embrace uncertainty. True serendipity happens only when you drift away from the algorithm.',
    ],
  },
  {
    id: 1,
    title: 'The given path',
    leadLine: 'The system predicted your preferences before you arrived.',
    paragraphs: [
      'You were free to follow, resist, hesitate, or be surprised.',
    ],
    boldLine: 'Serendipity emerges when you drift away from what was calculated for you.',
    isLast: true,
  },
];

// Vertical offset for each slide's content block
const SLIDE_TOPS = [
  height * 0.24,  // Your visit left some traces
  height * 0.24,  // The given path
];

// ─── Blobs — same palette/positions as IntroSlidesScreen ────────────────────────
const BLOBS = [
  { color: '#FF6820', cx: width * 0.80, cy: height * 0.18, radius: 175 },
  { color: '#FF2D78', cx: width * 0.12, cy: height * 0.46, radius: 200 },
  { color: '#3A9FFF', cx: width * 0.05, cy: height * 0.76, radius: 215 },
  { color: '#AAFF22', cx: width * 0.68, cy: height * 0.82, radius: 175 },
];

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
      style={[
        {
          position:        'absolute',
          left:            blob.cx - blob.radius,
          top:             blob.cy - blob.radius,
          width:           blob.radius * 2,
          height:          blob.radius * 2,
          borderRadius:    blob.radius,
          backgroundColor: blob.color,
          transform:       [{ scale }],
        },
        blurStyle,
      ]}
    />
  );
}

// ─── Vertical pill dot indicator — same style as IntroSlidesScreen ───────────────
function DotIndicator({ total, current }) {
  return (
    <View style={dots.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[dots.dot, i === current && dots.dotActive]} />
      ))}
    </View>
  );
}

const dots = StyleSheet.create({
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

// ─── Screen ──────────────────────────────────────────────────────────────────────
export default function OutroScreen({ onFinish }) {
  const [current, setCurrent]               = useState(0);
  const [doneBtnVisible, setDoneBtnVisible] = useState(false);

  const doneBtnOpacity = useRef(new Animated.Value(0)).current;
  const timerRef       = useRef(null);
  const currentRef     = useRef(0);

  // "DONE" fades in 1 s after arriving on the last slide
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    doneBtnOpacity.setValue(0);
    setDoneBtnVisible(false);

    if (current === SLIDES.length - 1) {
      timerRef.current = setTimeout(() => {
        setDoneBtnVisible(true);
        Animated.timing(doneBtnOpacity, {
          toValue:         1,
          duration:        700,
          easing:          Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      }, 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current]);

  const handleScroll = useCallback((e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const page    = Math.round(offsetY / height);
    const clamped = Math.max(0, Math.min(page, SLIDES.length - 1));
    if (clamped !== currentRef.current) {
      currentRef.current = clamped;
      setCurrent(clamped);
    }
  }, []);

  return (
    <View style={styles.container}>

      {/* ── Layer 1: pulsing blobs ── */}
      {BLOBS.map((blob, i) => (
        <PulsingBlob key={i} blob={blob} index={i} />
      ))}

      {/* ── Dark veil over blobs ── */}
      <View style={styles.darkVeil} pointerEvents="none" />

      {/* ── Layer 2: vertical paging scroll ── */}
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ flexGrow: 0 }}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        {SLIDES.map((slide, idx) => (
          <View
            key={slide.id}
            style={[styles.slidePage, { paddingTop: SLIDE_TOPS[idx] }]}
          >
            <Text style={styles.title}>{slide.title}</Text>

            <View style={styles.card}>
              {/* Prominent lead line */}
              {slide.leadLine && (
                <Text style={styles.leadLine}>{slide.leadLine}</Text>
              )}

              {slide.paragraphs.map((p, pi) => (
                <Text
                  key={pi}
                  style={[styles.body, { marginTop: slide.leadLine || pi > 0 ? 14 : 0 }]}
                >
                  {p}
                </Text>
              ))}

              {/* Bold closing line on last slide */}
              {slide.boldLine && (
                <Text style={[styles.body, styles.boldLine]}>
                  {slide.boldLine}
                </Text>
              )}
            </View>

            {/* DONE button — last slide only, fades in after 1 s */}
            {slide.isLast && (
              <Animated.View
                style={{ opacity: doneBtnOpacity, marginTop: 22 }}
                pointerEvents={doneBtnVisible ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  style={[ghostBtn, styles.doneBtn]}
                  onPress={onFinish}
                  activeOpacity={0.8}
                >
                  <Text style={ghostBtnTxt}>DONE</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Swipe-down arrow — all slides except the last */}
            {!slide.isLast && (
              <ScrollArrow style={{ marginTop: 24 }} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Layer 3: fixed chrome — logo now injected globally from App.js ── */}

      <DotIndicator total={SLIDES.length} current={current} />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#000',
  },

  slidePage: {
    width,
    height,
    paddingHorizontal: 28,
    paddingRight:      60, // room for dot indicator
  },

  // ── Top bar ──
  topBar: {
    position:       'absolute',
    top:            52,
    left:           24,
    right:          24,
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    zIndex:         20,
  },
  logoText: {
    color:         '#fff',
    fontSize:      13,
    fontWeight:    '900',
    letterSpacing: 0.5,
    lineHeight:    15,
  },

  // ── Slide content ──
  title: {
    fontFamily:   FONTS.title,
    color:        '#fff',
    fontSize:     34,
    fontWeight:   '700',
    marginBottom: 20,
    lineHeight:   40,
  },
  card: {
    backgroundColor: 'rgba(15, 8, 4, 0.65)',
    borderRadius:    18,
    padding:         22,
  },
  // Dark veil over blobs (all outro pages)
  darkVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },

  leadLine: {
    fontFamily: FONTS.body,
    color:      '#fff',
    fontSize:   16,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
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

  // ── DONE button — ghostBtn from theme + full width override ──
  doneBtn: {
    width: '100%',
  },
});
