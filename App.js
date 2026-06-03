import React, { useState, useRef, useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Animated, Easing, View, Text, TouchableOpacity, Platform } from 'react-native';

import LogoHeader           from './src/components/LogoHeader';
import { saveVisit }        from './src/utils/archive';
import SplashScreen         from './src/screens/SplashScreen';
import IntroSlidesScreen    from './src/screens/IntroSlidesScreen';
import ProfileScreen        from './src/screens/ProfileScreen';
import SerendipityMapScreen from './src/screens/SerendipityMapScreen';
import WrappedScreen        from './src/screens/WrappedScreen';
import AllPathsScreen       from './src/screens/AllPathsScreen';

// ─── Typekit font loader (web-only) ───────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://use.typekit.net/eko8rvx.css';
  document.head.appendChild(link);
}

// ─── Phone chrome overlay (web-only) ──────────────────────────────────────────
// Injects CSS on the host page to give the app a phone-frame look,
// and overlays a Dynamic Island notch + home-bar indicator.
function PhoneChrome() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const style = document.createElement('style');
    style.id = 'phone-chrome-style';
    style.textContent = `
      html { background: #0b0b18 !important; }
      body { background: #0b0b18 !important; margin: 0; padding: 0; }
      #root {
        border-radius: 50px !important;
        overflow: hidden !important;
        box-shadow:
          0 0 0 1.5px rgba(255,255,255,0.18),
          0 0 0 5px rgba(255,255,255,0.04),
          0 40px 120px rgba(0,0,0,0.85) !important;
      }
    `;
    document.head.appendChild(style);
    return () => { const s = document.getElementById('phone-chrome-style'); s && s.remove(); };
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={chrome.wrap} pointerEvents="none">
      {/* ── Dynamic Island ── */}
      <View style={chrome.islandArea}>
        <View style={chrome.island} />
      </View>
      {/* ── Home indicator ── */}
      <View style={chrome.homeArea}>
        <View style={chrome.homeBar} />
      </View>
    </View>
  );
}

const chrome = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  islandArea: {
    position:       'absolute',
    top:            0, left: 0, right: 0,
    height:         52,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     12,
  },
  island: {
    width:           120,
    height:          34,
    borderRadius:    18,
    backgroundColor: '#000',
  },
  homeArea: {
    position:       'absolute',
    bottom:         0, left: 0, right: 0,
    height:         34,
    alignItems:     'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(16px)', backgroundColor: 'rgba(0,0,0,0.25)' }
      : { backgroundColor: 'rgba(0,0,0,0.3)' }),
  },
  homeBar: {
    width:           130,
    height:          5,
    borderRadius:    3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});

// ─── DEV: screen order for the preview nav bar ────────────────────────────────
// DELETE this array (and the <DevNav> block below) before shipping.
const SCREEN_ORDER  = ['splash', 'intro', 'profile', 'map', 'wrapped', 'archive'];
const SCREEN_LABELS = {
  splash: 'Splash', intro: 'Intro', profile: 'Profile',
  map: 'Map', wrapped: 'Wrapped', archive: 'All Paths',
};

function DevNav({ screen, navigate }) {
  const idx  = SCREEN_ORDER.indexOf(screen);
  const prev = SCREEN_ORDER[idx - 1];
  const next = SCREEN_ORDER[idx + 1];
  return (
    <View style={dev.bar} pointerEvents="box-none">
      <TouchableOpacity
        style={[dev.btn, !prev && dev.btnDisabled]}
        onPress={() => prev && navigate(prev)}
        activeOpacity={0.75} disabled={!prev}
      >
        <Text style={dev.arrow}>←</Text>
      </TouchableOpacity>

      <View style={dev.label}>
        <Text style={dev.dot}>●</Text>
        <Text style={dev.name}>{SCREEN_LABELS[screen]}</Text>
        <Text style={dev.index}>{idx + 1}/{SCREEN_ORDER.length}</Text>
      </View>

      <TouchableOpacity
        style={[dev.btn, !next && dev.btnDisabled]}
        onPress={() => next && navigate(next)}
        activeOpacity={0.75} disabled={!next}
      >
        <Text style={dev.arrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}
// ─── END DEV ──────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,      setScreen]      = useState('splash');
  const [profile,     setProfile]     = useState({ intentions: [], words: [], serendipity: 0.35 });
  const [sessionData, setSessionData] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const navigate = (to) => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 380,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start(() => {
      setScreen(to);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 520,
        easing: Easing.in(Easing.quad), useNativeDriver: true,
      }).start();
    });
  };

  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
        {screen === 'splash'   && <SplashScreen onFinish={() => navigate('profile')} onIntro={() => navigate('intro')} onAbout={() => {/* about page — to design later */}} />}
        {screen === 'intro'    && <IntroSlidesScreen onFinish={() => navigate('profile')} onBack={() => navigate('splash')} />}
        {screen === 'profile'  && <ProfileScreen onBegin={(data) => { setProfile(data); navigate('map'); }} />}
        {screen === 'map'      && (
          <SerendipityMapScreen
            profile={profile}
            onEnd={(data) => {
              saveVisit(profile, data);
              setSessionData(data);
              navigate('wrapped');
            }}
          />
        )}
        {screen === 'wrapped' && (
          <WrappedScreen
            sessionData={sessionData}
            visitorName={profile?.name ?? ''}
            onFinish={() => { setProfile({ intentions: [], words: [], serendipity: 0.35 }); setSessionData(null); navigate('splash'); }}
            onArchive={() => navigate('archive')}
          />
        )}
        {screen === 'archive' && (
          <AllPathsScreen
            onBack={() => navigate('wrapped')}
            onNext={() => {
              setProfile({ intentions: [], words: [], serendipity: 0.35 });
              setSessionData(null);
              navigate('splash');
            }}
          />
        )}
      </Animated.View>

      {/* ── Phone chrome (web only) ── */}
      <PhoneChrome />

      {/* ── Persistent logo — top-left on every screen except splash ── */}
      {screen !== 'splash' && <LogoHeader />}

      {/* ── DEV: floating nav bar — DELETE before shipping ── */}
      <DevNav screen={screen} navigate={navigate} />

    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

// ─── DEV nav styles ───────────────────────────────────────────────────────────
const dev = StyleSheet.create({
  bar: {
    position: 'absolute', top: Platform.OS === 'android' ? 36 : 52,
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 50,
    paddingVertical: 4, paddingHorizontal: 4, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 10000,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
  },
  btn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.22 },
  arrow: { color: '#fff', fontSize: 13, lineHeight: 16 },
  label: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingHorizontal: 6,
  },
  dot:   { color: '#AAFF22', fontSize: 6 },
  name:  { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  index: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
});
// ─── END DEV styles ───────────────────────────────────────────────────────────

registerRootComponent(App);
