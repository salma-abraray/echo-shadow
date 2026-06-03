import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ghostBtn, ghostBtnTxt, ghostBtnSm, ghostBtnSmTxt, FONTS } from '../theme';
import Svg, { Line, Polyline, Circle, G, Text as SvgText } from 'react-native-svg';
import { loadVisits } from '../utils/archive';

const { width, height } = Dimensions.get('window');
const FONT    = FONTS.body;
const H_PAD   = 24;

// ─── Map dimensions — full screen ─────────────────────────────────────────────
const MAP_W = width;
const MAP_H = height;

// ─── Beacon layout (same as SerendipityMapScreen & WrappedScreen) ────────────
const BEACON_POS = (mw, mh) => ({
  D: { x: mw * 0.50, y: mh * 0.12 },
  B: { x: mw * 0.87, y: mh * 0.50 },
  C: { x: mw * 0.15, y: mh * 0.50 },
  A: { x: mw * 0.50, y: mh * 0.84 },
});

function buildPath(mw, mh, beaconOrder) {
  const bs      = BEACON_POS(mw, mh);
  const entrance = { x: mw * 0.78, y: mh * 0.96 };
  const exit_pt  = { x: 0,         y: mh * 0.28 };
  if (beaconOrder?.length > 0) {
    return [entrance, ...beaconOrder.map(id => bs[id]).filter(Boolean), exit_pt];
  }
  const { D, B, C, A } = bs;
  return [entrance, D, B, C, A, exit_pt];
}

function ptsStr(pts) {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

// ─── Floor plan ───────────────────────────────────────────────────────────────
function FloorPlan({ mw, mh, alpha = 0.22 }) {
  const f = {
    l: mw * 0.09, r: mw * 0.92,
    t: mh * 0.06, b: mh * 0.90,
    exLeft: 0,    exTop: mh * 0.22, exBot: mh * 0.34,
    enLeft: mw * 0.65, enBot: mh,
  };
  const sc = `rgba(255,255,255,${alpha})`;
  const tc = `rgba(255,255,255,${(alpha * 1.3).toFixed(2)})`;
  const fs = mw > 300 ? 8 : 6;
  return (
    <G>
      <Line x1={f.l}      y1={f.t}     x2={f.r}      y2={f.t}     stroke={sc} strokeWidth={1}/>
      <Line x1={f.r}      y1={f.t}     x2={f.r}      y2={f.enBot} stroke={sc} strokeWidth={1}/>
      <Line x1={f.enLeft} y1={f.enBot} x2={f.r}      y2={f.enBot} stroke={sc} strokeWidth={1}/>
      <Line x1={f.enLeft} y1={f.b}     x2={f.enLeft} y2={f.enBot} stroke={sc} strokeWidth={1}/>
      <Line x1={f.l}      y1={f.b}     x2={f.enLeft} y2={f.b}     stroke={sc} strokeWidth={1}/>
      <Line x1={f.l}      y1={f.exBot} x2={f.l}      y2={f.b}     stroke={sc} strokeWidth={1}/>
      <Line x1={f.exLeft} y1={f.exBot} x2={f.l}      y2={f.exBot} stroke={sc} strokeWidth={1}/>
      <Line x1={f.exLeft} y1={f.exTop} x2={f.exLeft} y2={f.exBot} stroke={sc} strokeWidth={1}/>
      <Line x1={f.l}      y1={f.exTop} x2={f.exLeft} y2={f.exTop} stroke={sc} strokeWidth={1}/>
      <Line x1={f.l}      y1={f.t}     x2={f.l}      y2={f.exTop} stroke={sc} strokeWidth={1}/>
      <SvgText x={f.exLeft + 4} y={f.exTop - 4} fontSize={fs} fill={tc} fontFamily={FONT} letterSpacing={0.5}>EXIT</SvgText>
      <SvgText x={f.enLeft + 4} y={f.b - 4}     fontSize={fs} fill={tc} fontFamily={FONT} letterSpacing={0.5}>ENTRANCE</SvgText>
    </G>
  );
}

// ─── Serendipity label from 0-1 dial value ───────────────────────────────────
function serendipityLabel(val) {
  if (val < 0.20) return 'Structured';
  if (val < 0.40) return 'Guided';
  if (val < 0.60) return 'Balanced';
  if (val < 0.80) return 'Wandering';
  return 'Unexpected';
}

function grayForIndex(i) {
  const g = Math.round(255 - (i / 4) * 165);
  return `rgb(${g},${g},${g})`;
}

function formatDuration(secs) {
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Bouncing scroll hint ─────────────────────────────────────────────────────
function ScrollHint() {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 6,  duration: 650, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(bounce, { toValue: 0,  duration: 650, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.delay(400),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={[sh.wrap, { transform: [{ translateY: bounce }] }]}>
      <Text style={sh.arrow}>↓</Text>
      <Text style={sh.label}>scroll to see visitors</Text>
    </Animated.View>
  );
}
const sh = StyleSheet.create({
  wrap:  { alignItems: 'center', gap: 2 },
  arrow: { color: 'rgba(255,255,255,0.40)', fontSize: 16, lineHeight: 20 },
  label: { fontFamily: FONTS.body, color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: '300', letterSpacing: 0.5 },
});

// ─── Visitor card (mini map + stats) ─────────────────────────────────────────
const CARD_W     = width - H_PAD * 2;
const CARD_MAP_W = CARD_W - 32;          // 16px card padding each side
const CARD_MAP_H = Math.round(CARD_MAP_W * 0.52);

function VisitorCard({ visit, index }) {
  const sLabel = serendipityLabel(visit.serendipity);
  const path   = buildPath(CARD_MAP_W, CARD_MAP_H, visit.beaconOrder);
  const bs     = BEACON_POS(CARD_MAP_W, CARD_MAP_H);
  const dateStr = new Date(visit.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' });
  const hasTension = visit.ignoredSuggestions > 0;
  const tensionCount = visit.ignoredSuggestions;

  return (
    <View style={vc.card}>
      {/* ── Header ── */}
      <View style={vc.header}>
        <Text style={vc.name} numberOfLines={1}>{visit.name}</Text>
        <View style={vc.pill}>
          <Text style={vc.pillTxt}>{sLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* ── Meta line ── */}
      <Text style={vc.meta}>
        {dateStr}{'  ·  '}{formatDuration(visit.durationSeconds)}{'  ·  '}{visit.artworksVisited}/{visit.totalArtworks} artworks
      </Text>

      {/* ── Tension points ── */}
      <View style={vc.tensionRow}>
        {hasTension ? (
          <>
            <View style={vc.tensionDot} />
            <Text style={vc.tensionTxt}>
              {tensionCount} tension point{tensionCount > 1 ? 's' : ''} — deviated from the suggested path
            </Text>
          </>
        ) : (
          <>
            <View style={[vc.tensionDot, { backgroundColor: 'rgba(170,255,34,0.55)' }]} />
            <Text style={[vc.tensionTxt, { color: 'rgba(170,255,34,0.55)' }]}>Followed all suggestions</Text>
          </>
        )}
      </View>

      {/* ── Mini path map ── */}
      <View style={vc.mapWrap}>
        <Svg width={CARD_MAP_W} height={CARD_MAP_H}>
          <FloorPlan mw={CARD_MAP_W} mh={CARD_MAP_H} alpha={0.14} />
          <Polyline
            points={ptsStr(path)}
            fill="none"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth={1.6}
            strokeDasharray="3,6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {Object.values(bs).map((b, i) => (
            <G key={i}>
              <Circle cx={b.x} cy={b.y} r={5} fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1}/>
              <Circle cx={b.x} cy={b.y} r={2} fill="rgba(255,255,255,0.55)" />
            </G>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const vc = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.09)',
    borderRadius:    20,
    padding:         16,
    marginBottom:    12,
  },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  name:    { fontFamily: FONTS.title, color: '#fff', fontSize: 22, fontWeight: '700', flex: 1, marginRight: 10 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius:    20,
    paddingVertical:   4,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  pillTxt: { fontFamily: FONTS.title, color: 'rgba(255,255,255,0.50)', fontSize: 9, fontWeight: '600', letterSpacing: 1.5 },
  meta:    { fontFamily: FONTS.body, color: 'rgba(255,255,255,0.36)', fontSize: 11, fontWeight: '300', marginBottom: 8 },
  tensionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  tensionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,100,100,0.65)', flexShrink: 0 },
  tensionTxt: { fontFamily: FONTS.body, color: 'rgba(255,140,140,0.70)', fontSize: 11, fontWeight: '400', flex: 1 },
  mapWrap: {
    borderRadius:    12,
    overflow:        'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AllPathsScreen({ onBack, onNext }) {
  const insets   = useSafeAreaInsets();
  const [filterIdx, setFilterIdx] = useState(2);
  const [visits,    setVisits]    = useState([]);

  useEffect(() => { setVisits(loadVisits()); }, []);

  const filterPos = filterIdx / 4;

  function pathOpacity(visit) {
    const diff = Math.abs(visit.serendipity - filterPos);
    if (diff <= 0.14) return 1.0;
    if (diff >= 0.42) return 0.06;
    return 1.0 - ((diff - 0.14) / 0.28) * 0.94;
  }

  const BEACONS = Object.values(BEACON_POS(MAP_W, MAP_H));

  const filterLabel = filterPos < 0.22 ? 'Structured' :
                      filterPos > 0.78 ? 'Unexpected' :
                      filterPos < 0.40 ? 'Guided'     :
                      filterPos > 0.60 ? 'Wandering'  : 'Balanced';

  const topPad = Math.max(52, insets.top + 16);

  return (
    <View style={s.root}>

      {/* ── Static blobs ── */}
      {[
        { color: '#3A9FFF', cx: width*0.85, cy: height*0.06,  radius: 180 },
        { color: '#FF6820', cx: width*0.06, cy: height*0.30,  radius: 155 },
        { color: '#FF2D78', cx: width*0.90, cy: height*0.65,  radius: 165 },
        { color: '#AAFF22', cx: width*0.10, cy: height*0.90,  radius: 165 },
      ].map((b, i) => (
        <View key={i} style={[
          s.blob,
          { left: b.cx - b.radius, top: b.cy - b.radius, width: b.radius * 2, height: b.radius * 2, borderRadius: b.radius, backgroundColor: b.color },
          Platform.OS === 'web' ? { filter: 'blur(72px)' } : {},
        ]} />
      ))}
      <View style={s.darkVeil} pointerEvents="none" />

      <ScrollView
        style={StyleSheet.absoluteFill}
        showsVerticalScrollIndicator={false}
        bounces={false}
        snapToOffsets={[MAP_H]}
        decelerationRate="fast"
        snapToAlignment="start"
      >

        {/* ══════════════ HERO — full-screen map ══════════════ */}
        <View style={s.hero}>

          {/* Full-screen SVG map */}
          <Svg width={MAP_W} height={MAP_H} style={StyleSheet.absoluteFill}>
            <FloorPlan mw={MAP_W} mh={MAP_H} alpha={0.20} />

            {/* All real paths — white, serendipity-filtered opacity */}
            {visits.map(v => (
              <Polyline
                key={v.id}
                points={ptsStr(buildPath(MAP_W, MAP_H, v.beaconOrder))}
                fill="none"
                stroke="rgba(255,255,255,0.90)"
                strokeWidth={1.6}
                strokeOpacity={pathOpacity(v)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Beacon markers */}
            {BEACONS.map((b, i) => (
              <G key={i}>
                <Circle cx={b.x} cy={b.y} r={9}   fill="none"                     stroke="rgba(255,255,255,0.28)" strokeWidth={1.2}/>
                <Circle cx={b.x} cy={b.y} r={3.5} fill="rgba(255,255,255,0.55)" />
              </G>
            ))}
          </Svg>

          {/* ── BACK button (overlay, top right) ── */}
          <View style={[s.topBar, { paddingTop: topPad }]} pointerEvents="box-none">
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[ghostBtnSm, s.backBtn]} onPress={onBack} activeOpacity={0.75}>
              <Text style={ghostBtnSmTxt}>← BACK</Text>
            </TouchableOpacity>
          </View>

          {/* ── Bottom: scale + scroll hint (overlay) ── */}
          <View style={[s.scaleArea, Platform.OS === 'web' ? { backdropFilter: 'blur(18px)' } : {}]}>

            {/* Visitor count + filter label */}
            <Text style={s.filterLabel}>
              {visits.length === 0
                ? 'No visits recorded yet'
                : `${visits.length} visitor${visits.length > 1 ? 's' : ''}  ·  ${filterLabel}`}
            </Text>

            {/* Serendipity scale */}
            <View style={s.scaleLineRow}>
              {[0,1,2,3,4].map(i => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <View style={[
                      s.scaleSegment,
                      { backgroundColor: i <= filterIdx ? grayForIndex(i) : 'rgba(255,255,255,0.14)' },
                    ]} />
                  )}
                  <TouchableOpacity
                    onPress={() => setFilterIdx(i)}
                    activeOpacity={0.75}
                    hitSlop={{ top: 16, bottom: 16, left: 10, right: 10 }}
                  >
                    <View style={[
                      s.scaleNode,
                      i <= filterIdx && { backgroundColor: grayForIndex(i), borderColor: grayForIndex(i) },
                      i === filterIdx && s.scaleNodeActive,
                    ]} />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>

            <View style={s.scaleLabels}>
              <Text style={s.scaleEnd}>STRUCTURED</Text>
              <Text style={s.scaleEnd}>UNEXPECTED</Text>
            </View>

            <View style={{ height: 18 }} />
            <ScrollHint />
            <View style={{ height: 12 }} />
          </View>

        </View>
        {/* ══════════════ end HERO ══════════════ */}

        {/* ══════════════ CARDS SECTION ══════════════ */}
        <View style={s.cardsSection}>

          {/* Section title */}
          <Text style={s.archiveTitle}>WRAPPED{'\n'}ARCHIVE</Text>
          <Text style={s.archiveSub}>
            {visits.length === 0
              ? 'Visits are saved automatically when a visitor completes their full profile.'
              : `${visits.length} recorded visit${visits.length > 1 ? 's' : ''}. Tension points mark moments of deviation from the suggested path.`}
          </Text>

          <View style={s.divider} />

          {/* Visitor cards — newest first */}
          {[...visits].reverse().map((v, i) => (
            <VisitorCard key={v.id} visit={v} index={i} />
          ))}

          {visits.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>◦</Text>
              <Text style={s.emptyText}>
                No paths recorded yet.{'\n'}Complete a session with your name to leave a trace.
              </Text>
            </View>
          )}

          {/* End session */}
          <TouchableOpacity style={[ghostBtn, s.nextBtn]} onPress={onNext} activeOpacity={0.85}>
            <Text style={ghostBtnTxt}>END SESSION</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#000' },
  blob:     { position: 'absolute', opacity: 0.18 },
  darkVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },

  // ── Hero (full-screen map page)
  hero:  { width: MAP_W, height: MAP_H },

  topBar: {
    position:        'absolute',
    top:             0, left: 0, right: 0,
    flexDirection:   'row',
    paddingHorizontal: H_PAD,
    zIndex:          10,
  },
  backBtn: { minWidth: 90 },

  scaleArea: {
    position:          'absolute',
    bottom:            0, left: 0, right: 0,
    paddingHorizontal: H_PAD,
    paddingTop:        22,
    paddingBottom:     28,
    backgroundColor:   'rgba(0,0,0,0.42)',
  },
  filterLabel: {
    fontFamily:    FONTS.body,
    color:         'rgba(255,255,255,0.46)',
    fontSize:      11,
    fontWeight:    '300',
    textAlign:     'center',
    letterSpacing: 0.3,
    marginBottom:  14,
  },
  scaleLineRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scaleSegment:   { flex: 1, height: 3, borderRadius: 2 },
  scaleNode: {
    width:           14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth:     1.5,
    borderColor:     'rgba(255,255,255,0.25)',
  },
  scaleNodeActive: { width: 20, height: 20, borderRadius: 10 },
  scaleLabels:    { flexDirection: 'row', justifyContent: 'space-between' },
  scaleEnd: {
    fontFamily:    FONTS.title,
    color:         'rgba(255,255,255,0.28)',
    fontSize:      10,
    fontWeight:    '500',
    letterSpacing: 1.2,
  },

  // ── Cards section
  cardsSection: {
    paddingHorizontal: H_PAD,
    paddingTop:        48,
  },
  archiveTitle: {
    fontFamily:    FONTS.title,
    color:         '#fff',
    fontSize:      44,
    fontWeight:    '900',
    lineHeight:    48,
    letterSpacing: -1.5,
    marginBottom:  8,
  },
  archiveSub: {
    fontFamily: FONTS.body,
    color:      'rgba(255,255,255,0.36)',
    fontSize:   13,
    fontWeight: '300',
    lineHeight: 20,
    marginBottom: 28,
  },
  divider: {
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom:    28,
  },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  emptyIcon:  { color: 'rgba(255,255,255,0.18)', fontSize: 32 },
  emptyText: {
    fontFamily: FONTS.body,
    color:      'rgba(255,255,255,0.28)',
    fontSize:   14,
    fontWeight: '300',
    lineHeight: 22,
    textAlign:  'center',
  },

  nextBtn: { marginTop: 8 },
});
