import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Animated, Easing, Platform, ScrollView,
} from 'react-native';
import { ghostBtn, ghostBtnTxt, FONTS } from '../theme';

const { width, height } = Dimensions.get('window');

// ─── Blob background ──────────────────────────────────────────────────────────
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
    <Animated.View style={[{
      position: 'absolute',
      left: blob.cx - blob.radius, top: blob.cy - blob.radius,
      width: blob.radius * 2, height: blob.radius * 2,
      borderRadius: blob.radius, backgroundColor: blob.color,
      transform: [{ scale }],
    }, blurStyle]} />
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// Visit intentions — 4 paths (paths will be linked later)
const VISIT_INTENTIONS = [
  'Contemplate', 'Discover', 'Investigate', 'Be moved',
];

// Word cloud — all unique wordTags from artworks.js (used by recommendation engine)
// Selecting a word nudges the system toward artworks that share the same tag.
const WORD_CLOUD = [
  // High-frequency tags (appear in 2+ artworks)
  'Identity',     // SW-01 02 04 12
  'Nature',       // SW-03 05 10 11
  'Status',       // SW-01 02 12
  'Spirituality', // SW-03 09
  'Childhood',    // SW-01 06
  'Animals',      // SW-01 10
  'Beauty',       // SW-05 12
  'Solitude',     // SW-05 11
  'Intimacy',     // SW-01 06
  'Fragmentation',// SW-04 10
  'Modernism',    // SW-04 08
  // Unique but thematically rich
  'Memory',       // SW-05
  'Warmth',       // SW-06
  'Still life',   // SW-07
  'Sensuality',   // SW-08
  'Darkness',     // SW-09
  'Devotion',     // SW-09
  'Abstraction',  // SW-10
  'Journey',      // SW-11
  'Youth',        // SW-12
  'Drama',        // SW-03
];

// Serendipity dial states: 0 = structured ↔ 1 = unexpected
const DIAL_STATES = [
  { title: 'Structured', sub: 'Follow the path',         color: '#3A9FFF' },
  { title: 'Guided',    sub: 'Mostly structured',        color: '#88CAFF' },
  { title: 'Balanced',  sub: 'Open to both',             color: '#fff'    },
  { title: 'Wandering', sub: 'Let the art find you',     color: '#FFAA55' },
  { title: 'Unexpected',sub: 'Pure serendipity',         color: '#FF6820' },
];


// Page meta
const PAGES = [
  { key: 'personal',   label: 'About you' },
  { key: 'intentions', label: 'Intentions' },
  { key: 'wordcloud',  label: 'Words' },
  { key: 'serendipity',label: 'Journey' },
];

// ─── Pill toggle button ────────────────────────────────────────────────────────
function Pill({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[pill.base, selected && pill.on]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[pill.txt, selected && pill.txtOn]}>{label}</Text>
    </TouchableOpacity>
  );
}
const pill = StyleSheet.create({
  base: {
    paddingHorizontal: 20,
    paddingVertical:   12,
    borderRadius:      50,
    backgroundColor:   'rgba(255,255,255,0.07)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.14)',
    margin:            4,
  },
  on: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderColor:     'rgba(255,255,255,0.50)',
  },
  txt:   { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  txtOn: { color: '#fff', fontWeight: '600' },
});

// ─── Bouncing swipe-down chevrons ──────────────────────────────────────────────
function SwipeHint({ onPress }) {
  const bounce = useRef(new Animated.Value(0)).current;
  const fade   = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 7,  duration: 600, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(bounce, { toValue: 0,  duration: 600, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.delay(300),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={sw.wrap}>
      <Animated.View style={[sw.inner, { transform: [{ translateY: bounce }] }]}>
        <Text style={sw.ch}>↓</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
const sw = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingBottom: 6 },
  inner: { alignItems: 'center' },
  ch:    { color: 'rgba(255,255,255,0.45)', fontSize: 20, lineHeight: 22 },
});

// ─── Grayscale: index 0 = white (Structured) → 4 = dark (Unexpected) ──────────
function grayForIndex(i) {
  const g = Math.round(255 - (i / 4) * 165); // 255 → 90
  return `rgb(${g},${g},${g})`;
}

// ─── Serendipity line (tap to choose) ─────────────────────────────────────────
function SerendipityLine({ value, onChange }) {
  const idx   = Math.min(4, Math.floor(value * 5));
  const state = DIAL_STATES[idx];

  return (
    <View style={sl.outer}>
      {/* ── Active state name — color follows the grayscale position ── */}
      <Text style={[sl.stateTitle, { color: grayForIndex(idx) }]}>{state.title}</Text>
      <Text style={sl.stateSub}>{state.sub}</Text>

      {/* ── Interactive line with 5 nodes ── */}
      <View style={sl.lineRow}>
        {DIAL_STATES.map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={[
                sl.segment,
                { backgroundColor: i <= idx ? grayForIndex(i) : 'rgba(255,255,255,0.14)' },
              ]} />
            )}
            <TouchableOpacity
              onPress={() => onChange(i / 4)}
              activeOpacity={0.75}
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
            >
              <View style={[
                sl.node,
                i <= idx && { backgroundColor: grayForIndex(i), borderColor: grayForIndex(i) },
                i === idx && sl.nodeActive,
              ]} />
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* ── Axis labels ── */}
      <View style={sl.axisRow}>
        <Text style={sl.axisLabel}>Structured</Text>
        <Text style={sl.axisLabel}>Unexpected</Text>
      </View>
    </View>
  );
}

const sl = StyleSheet.create({
  outer:      { alignItems: 'stretch', gap: 6 },
  stateTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  stateSub: {
    color: 'rgba(255,255,255,0.40)', fontSize: 12, fontWeight: '300',
    letterSpacing: 0.2, textAlign: 'center', marginBottom: 20,
  },
  lineRow:  { flexDirection: 'row', alignItems: 'center' },
  segment:  { flex: 1, height: 3, borderRadius: 2 },
  node: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  nodeActive:  { width: 20, height: 20, borderRadius: 10 },
  axisRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  axisLabel:   { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
});

// ─── Page dot indicator ────────────────────────────────────────────────────────
function PageDots({ current, total }) {
  return (
    <View style={dot.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[dot.base, i === current && dot.active]} />
      ))}
    </View>
  );
}
const dot = StyleSheet.create({
  row:    { flexDirection: 'column', gap: 6, alignItems: 'center' },
  base:   { width: 6, height: 6,  borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  active: { width: 6, height: 20, borderRadius: 3, backgroundColor: '#fff' },
});

// ─── Main ProfileScreen ────────────────────────────────────────────────────────
export default function ProfileScreen({ onBegin }) {
  const [name,               setName]               = useState('');
  const [age,                setAge]                = useState('');
  const [gender,             setGender]             = useState('');
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [intentions,         setIntentions]         = useState([]);
  const [words,              setWords]              = useState([]);
  const [serendipity,        setSerendipity]        = useState(0.5);
  const [page,               setPage]               = useState(0);

  const TOTAL_PAGES = 4;
  const scrollRef   = useRef(null);
  const pageRef     = useRef(0);   // shadow ref so handleScroll has no stale closure

  // ── Navigate to a page ────────────────────────────────────────────────────
  const goToPage = (next) => {
    if (next < 0 || next >= TOTAL_PAGES) return;
    scrollRef.current?.scrollTo({ y: next * height, animated: true });
    pageRef.current = next;
    setPage(next);
  };

  // ── Track current page from scroll position (works on web too) ────────────
  const handleScroll = (e) => {
    const newPage = Math.round(e.nativeEvent.contentOffset.y / height);
    const clamped = Math.max(0, Math.min(newPage, TOTAL_PAGES - 1));
    if (clamped !== pageRef.current) {
      pageRef.current = clamped;
      setPage(clamped);
    }
  };

  // ── Toggle helper ─────────────────────────────────────────────────────────
  const toggle = (list, set, item) =>
    set(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

  // ── Gender sheet animation ─────────────────────────────────────────────────
  const sheetY    = useRef(new Animated.Value(600)).current;
  const backdropO = useRef(new Animated.Value(0)).current;

  const openGenderModal = () => {
    sheetY.setValue(600); backdropO.setValue(0);
    setGenderModalVisible(true);
    Animated.parallel([
      Animated.timing(sheetY,    { toValue: 0,   duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(backdropO, { toValue: 1,   duration: 300, easing: Easing.out(Easing.quad),  useNativeDriver: false }),
    ]).start();
  };
  const closeGenderModal = () => {
    Animated.parallel([
      Animated.timing(sheetY,    { toValue: 600, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      Animated.timing(backdropO, { toValue: 0,   duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]).start(() => setGenderModalVisible(false));
  };

  return (
    <View style={s.root}>

      {/* ── Blobs ── */}
      {BLOBS.map((blob, i) => <PulsingBlob key={i} blob={blob} index={i} />)}
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' }} pointerEvents="none" />

      {/* ── Page dots (top-right) ── */}
      <View style={s.dotsWrap} pointerEvents="none">
        <PageDots current={page} total={TOTAL_PAGES} />
      </View>

      {/* ── Gender bottom sheet ── */}
      {genderModalVisible && (
        <View style={s.genderOverlay} pointerEvents="box-none">
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.40)', opacity: backdropO }]}
            pointerEvents="auto"
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeGenderModal} />
          </Animated.View>
          <Animated.View style={[s.genderSheet, { transform: [{ translateY: sheetY }] }]}>
            <View style={s.genderHandle} />
            <Text style={s.genderLabel}>GENDER</Text>
            <View style={s.genderOptions}>
              {['Female', 'Male', 'Non-binary', 'Prefer not to say'].map(opt => {
                const active = gender === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.genderOption, active && s.genderOptionOn]}
                    onPress={() => { setGender(opt); closeGenderModal(); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.genderOptionTxt, active && s.genderOptionTxtOn]}>{opt}</Text>
                    {active && <View style={s.genderDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      )}

      {/* ── Vertical pager ── */}
      <ScrollView
        ref={scrollRef}
        style={s.pager}
        pagingEnabled
        bounces={false}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >

        {/* ════ PAGE 1 — Personal info ════ */}
        <View style={s.page}>
          <View style={s.pageInner}>
            <View style={s.titleBlock}>
              <Text style={s.pageLabel}>{PAGES[0].label}</Text>
              <Text style={s.heading}>Tell us about{'\n'}yourself</Text>
            </View>

            <View style={s.inputGroup}>
              <View style={s.inputBox}>
                <TextInput
                  style={s.inputTxt}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nickname"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCorrect={false}
                />
              </View>
              <View style={s.inputRow}>
                <View style={[s.inputBox, { flex: 1 }]}>
                  <TextInput
                    style={s.inputTxt}
                    value={age}
                    onChangeText={setAge}
                    placeholder="Age"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
                <TouchableOpacity
                  style={[s.inputBox, { flex: 1 }]}
                  onPress={openGenderModal}
                  activeOpacity={0.8}
                >
                  <Text style={gender ? s.inputTxt : s.inputPlaceholder}>
                    {gender || 'Gender'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={s.inputNote}>
                *Your personal information is used only for the duration of the experience and will not be permanently stored.
              </Text>
            </View>
          </View>
          <SwipeHint onPress={() => goToPage(1)} />
        </View>

        {/* ════ PAGE 2 — Visit Intention ════ */}
        <View style={s.page}>
          <View style={s.pageInner}>
            <View style={s.titleBlock}>
              <Text style={s.pageLabel}>{PAGES[1].label}</Text>
              <Text style={s.heading}>Set your intention</Text>
              <Text style={s.sub}>
                Your selections help shape the journey ahead and how you experience the exhibition.
              </Text>
            </View>
            <View style={s.intentionGrid}>
              {VISIT_INTENTIONS.map(item => {
                const active = intentions.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[s.intentionCell, active && s.intentionCellOn]}
                    onPress={() => setIntentions(prev =>
                      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                    )}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.intentionTxt, active && s.intentionTxtOn]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <SwipeHint onPress={() => goToPage(2)} />
        </View>

        {/* ════ PAGE 3 — Word Cloud ════ */}
        <View style={s.page}>
          <View style={s.pageInner}>
            <View style={s.titleBlock}>
              <Text style={s.pageLabel}>{PAGES[2].label}</Text>
              <Text style={s.heading}>Find Your Direction</Text>
              <Text style={s.sub}>
                Choose the words that resonate most with you. These associations help the system
                connect artworks and generate suggested paths.
              </Text>
            </View>
            <View style={s.wordGrid}>
              {WORD_CLOUD.map(item => {
                const active = words.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[s.wordCell, active && s.wordCellOn]}
                    onPress={() => setWords(prev =>
                      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                    )}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.wordTxt, active && s.wordTxtOn]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <SwipeHint onPress={() => goToPage(3)} />
        </View>

        {/* ════ PAGE 4 — Serendipity ════ */}
        <View style={s.page}>
          <View style={s.pageInner}>
            <View style={s.titleBlock}>
              <Text style={s.pageLabel}>{PAGES[3].label}</Text>
              <Text style={s.heading}>Serendipity Scale</Text>
              <Text style={s.sub}>
                How much do you want to be surprised? Tap the scale to shape your journey between
                structured and unexpected.
              </Text>
            </View>

            <SerendipityLine value={serendipity} onChange={setSerendipity} />
          </View>

          <TouchableOpacity
            style={[ghostBtn, s.startBtn]}
            onPress={() => onBegin({ name, age, gender, intentions, words, serendipity })}
            activeOpacity={0.85}
          >
            <Text style={ghostBtnTxt}>LET'S START</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  logo: { position: 'absolute', top: 52, left: 24, zIndex: 20 },
  logoTxt: {
    color: '#fff', fontSize: 13, fontWeight: '900',
    letterSpacing: 0.5, lineHeight: 15,
  },

  dotsWrap: {
    position: 'absolute', right: 14, top: 0, bottom: 0, zIndex: 20,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Pager ──
  pager: { ...StyleSheet.absoluteFillObject },

  page: {
    width,
    height,
    paddingTop:        100,
    paddingHorizontal: 26,
    paddingBottom:     36,
    justifyContent:    'space-between',
  },
  pageInner: { flex: 1, gap: 32, justifyContent: 'center' },

  // ── Text ──
  titleBlock: { gap: 10 },
  pageLabel:  {
    fontFamily: FONTS.title,
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600',
    letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase',
  },
  heading: {
    fontFamily: FONTS.title,
    color: '#fff', fontSize: 32, fontWeight: '600',
    textAlign: 'center', letterSpacing: 0.2,
  },
  sub: {
    fontFamily: FONTS.body,
    color: 'rgba(255,255,255,0.45)', fontSize: 13.5,
    lineHeight: 20, textAlign: 'center',
  },

  // ── Inputs ──
  inputGroup: { gap: 10 },
  inputRow:   { flexDirection: 'row', gap: 8 },
  inputBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius:    14,
    paddingHorizontal: 18,
    paddingVertical:   15,
  },
  inputTxt:         { fontFamily: FONTS.body, color: '#fff', fontSize: 16, fontWeight: '300' },
  inputPlaceholder: { fontFamily: FONTS.body, color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '300' },
  inputNote: {
    fontFamily: FONTS.body,
    color: 'rgba(255,255,255,0.22)', fontSize: 11,
    lineHeight: 16, textAlign: 'center', paddingHorizontal: 4,
  },

  // ── Pill grid (word cloud) ──
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginHorizontal: -4 },

  // ── Intention 2×2 grid ──
  intentionGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },
  intentionCell: {
    width:           (width - 52 - 10) / 2,   // 2 columns, gap 10, padding 26*2
    paddingVertical: 28,
    borderRadius:    18,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.14)',
  },
  intentionCellOn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor:     'rgba(255,255,255,0.55)',
  },
  intentionTxt: {
    fontFamily: FONTS.body,
    color:    'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontWeight: '500',
  },
  intentionTxtOn: {
    color:      '#fff',
    fontWeight: '700',
  },

  // ── Word cloud 3-column grid ──
  wordGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    paddingRight:  22,   // extra ruimte voor de dot indicator rechts
  },
  wordCell: {
    width:           (width - 52 - 22 - 12) / 3,   // 3 cols, 2 gaps of 6, +22 right padding
    paddingVertical:   10,
    paddingHorizontal: 6,
    borderRadius:    12,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.14)',
    minHeight:       40,
  },
  wordCellOn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor:     'rgba(255,255,255,0.55)',
  },
  wordTxt: {
    fontFamily: FONTS.body,
    color:      'rgba(255,255,255,0.55)',
    fontSize:   13,
    fontWeight: '500',
    textAlign:  'center',
  },
  wordTxtOn: {
    color:      '#fff',
    fontWeight: '700',
  },

  // ── CTA ──
  startBtn: {
    // ghostBtn from theme applied via style array; only layout overrides here
    width: '100%',
  },

  // ── Gender sheet ──
  genderOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, justifyContent: 'flex-end' },
  genderSheet: {
    paddingHorizontal: 24, paddingBottom: 52, paddingTop: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(30px)' } : {}),
  },
  genderHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 22,
  },
  genderLabel: {
    fontFamily: FONTS.title,
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600',
    letterSpacing: 2, textAlign: 'center', marginBottom: 18,
  },
  genderOptions: { gap: 10 },
  genderOption: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 18, paddingHorizontal: 22,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  genderOptionOn:    { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.35)' },
  genderOptionTxt:   { fontFamily: FONTS.body, color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '400' },
  genderOptionTxtOn: { color: '#fff', fontWeight: '600' },
  genderDot:         { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
});
