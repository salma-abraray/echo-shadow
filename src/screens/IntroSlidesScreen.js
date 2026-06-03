import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import ScrollArrow from '../components/ScrollArrow';
import { ghostBtn, ghostBtnTxt, ghostBtnSm, ghostBtnSmTxt, FONTS } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BeaconManager }     from '../utils/BeaconManager';

const { width, height } = Dimensions.get('window');

// ─── Slide content ─────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    title: 'Welcome',
    body: 'There\'s no perfect route. Each artwork reveals new directions as you explore.',
  },
  {
    id: 1,
    title: 'The Visit',
    body: 'As you explore the exhibition, nearby artworks will reveal new paths, narrations, and possibilities, turning navigation into a journey of discovery rather than efficiency.',
  },
  {
    id: 2,
    title: 'How it works',
    body: 'There are four areas, each with a selection of artworks. Follow what catches your eye. Every choice opens new paths and stories.',
  },
  {
    id: 3,
    title: 'Gallery Map',
    body: 'Hold to view the Gallery Map. See where you\'ve wandered, what you\'ve explored, and what still awaits. Track your path and discover what\'s left to explore.',
    isGalleryMap: true,
  },
  {
    id: 4,
    title: 'Stay Connected',
    body: 'Keep Bluetooth on to unlock nearby stories, paths, and unexpected moments.',
    isBluetooth: true,
  },
  {
    id: 5,
    title: 'Nearby',
    body: 'Scanning for museum beacons around you.',
    isLast: true,
    isScanner: true,
  },
];


// ─── Blobs ─────────────────────────────────────────────────────────────────────
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

// ─── Horizontal pill dot indicator (same style as ProfileScreen) ───────────────
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
    position:        'absolute',
    right:           14,
    top:             0,
    bottom:          0,
    flexDirection:   'column',
    gap:             6,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          20,
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

// ─── Beacon slots ─────────────────────────────────────────────────────────────
const BEACON_SLOTS = [
  { id: 'A', color: '#AAFF22', room: 'Ingang'      },
  { id: 'B', color: '#3A9FFF', room: 'Oost vleugel' },
  { id: 'C', color: '#FF2D78', room: 'Centrum'      },
  { id: 'D', color: '#FF6820', room: 'Uitgang'      },
];

// ─── Device scanner ───────────────────────────────────────────────────────────
const MOCK_DEVICES = [
  { name: 'WanderLost · Beacon A', type: 'beacon', rssi: -42, delay: 700  },
  { name: 'Museum_WiFi_5G',        type: 'wifi',   rssi: -55, delay: 1300 },
  { name: 'WanderLost · Beacon D', type: 'beacon', rssi: -63, delay: 1900 },
  { name: 'WanderLost · Beacon B', type: 'beacon', rssi: -74, delay: 2600 },
];

function rssiToBars(rssi) {
  if (rssi >= -50) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  return 1;
}

function SignalBars({ bars, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {[1, 2, 3, 4].map(b => (
        <View
          key={b}
          style={{
            width:           4,
            height:          4 + b * 4,
            borderRadius:    1,
            backgroundColor: b <= bars ? color : 'rgba(255,255,255,0.14)',
          }}
        />
      ))}
    </View>
  );
}

function DeviceScanner({ active }) {
  // ── State ──────────────────────────────────────────────────────
  const [bleItems,    setBleItems]    = useState([]);
  const [scanning,    setScanning]    = useState(false);
  const [webBusy,     setWebBusy]     = useState(false);
  const [webStatus,   setWebStatus]   = useState('');  // step-by-step guidance text
  const [searchQuery, setSearchQuery] = useState('');  // filter text
  const [selectedId,  setSelectedId]  = useState(null); // tapped device id
  // beaconId → { name, id } — persisted in localStorage
  const [beaconPairs, setBeaconPairs] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('wl-beacon-pairs') || '{}'); } catch (_) {}
    }
    return {};
  });
  const [webError,   setWebError]   = useState('');   // visible error message

  // Web Bluetooth passive scan object (requestLEScan) — store to stop later
  const webScanRef = useRef(null);

  // Radar rings
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const rings  = [ring0, ring1, ring2];

  // ── Radar + native BLE lifecycle ────────────────────────────────
  useEffect(() => {
    if (!active) {
      rings.forEach(r => r.setValue(0));
      setBleItems([]);
      setScanning(false);
      // Stop web LEScan if running
      if (webScanRef.current) {
        try { webScanRef.current.stop(); } catch (_) {}
        webScanRef.current = null;
      }
      if (Platform.OS !== 'web') BeaconManager.stopScan();
      return;
    }

    // Radar ring animations (same on web + native)
    const anims = rings.map((ring, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 550),
          Animated.timing(ring, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: false }),
        ])
      )
    );
    anims.forEach(a => a.start());

    if (Platform.OS === 'web') {
      // ── Try BLE Bridge first (ws://localhost:8765) ─────────────
      // Works in any browser/iframe. Run: npm run ble-bridge
      let ws = null;
      let bridgeOk = false;
      let wsTimeout = setTimeout(() => {
        if (!bridgeOk) setWebError('bridge-offline');
      }, 2000);

      try {
        ws = new WebSocket('ws://localhost:8765');

        ws.onopen = () => {
          bridgeOk = true;
          clearTimeout(wsTimeout);
          setScanning(true);
          setWebError('');
        };

        ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data);
            setBleItems(prev => {
              const idx  = prev.findIndex(x => x.id === d.id);
              const item = {
                id:    d.id,
                name:  d.name || `BLE ${d.id.slice(0, 8)}`,
                rssi:  d.rssi,
                type:  d.isBeacon ? 'beacon' : 'ble',
                color: d.isBeacon ? '#3A9FFF' : 'rgba(255,255,255,0.65)',
                icon:  d.isBeacon ? '📍' : '📡',
              };
              if (idx >= 0) {
                const next = [...prev]; next[idx] = item;
                return next.sort((a, b) => b.rssi - a.rssi);
              }
              return [...prev, item].sort((a, b) => b.rssi - a.rssi);
            });
          } catch (_) {}
        };

        ws.onerror = () => {
          clearTimeout(wsTimeout);
          if (!bridgeOk) setWebError('bridge-offline');
        };

        ws.onclose = () => {
          if (bridgeOk) { setScanning(false); setWebError('bridge-offline'); }
        };
      } catch (_) {
        setWebError('bridge-offline');
      }

      return () => {
        clearTimeout(wsTimeout);
        anims.forEach(a => a.stop());
        ws?.close();
        setScanning(false);
      };
    }

    // ── Native: real BLE scan ──────────────────────────────────
    let stopped = false;
    (async () => {
      const init = await BeaconManager.init();
      if (stopped) return;
      if (!init.ok) return; // BLE unavailable on simulator — list stays empty
      await BeaconManager.requestPermissions();
      if (stopped) return;
      await BeaconManager.startScan({
        onUpdate: (list) => {
          if (!stopped) setBleItems(list.map(b => ({
            id:    b.id,
            name:  b.displayName,
            rssi:  b.rssi,
            color: b.color,
            icon:  '📍',
            type:  'beacon',
          })));
        },
      });
      if (!stopped) setScanning(true);
    })();

    return () => {
      stopped = true;
      anims.forEach(a => a.stop());
      BeaconManager.stopScan();
      setScanning(false);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add a discovered device to the list ──────────────────────
  const addWebDevice = useCallback((id, rawName, rssi) => {
    const name      = rawName || `BLE ${id.slice(0, 8)}`;
    const isBeacon  = rawName.startsWith('WL-Beacon');
    setBleItems(prev => {
      const idx  = prev.findIndex(d => d.id === id);
      const item = {
        id, name, rssi,
        type:  isBeacon ? 'beacon' : 'ble',
        color: isBeacon ? '#3A9FFF' : 'rgba(255,255,255,0.65)',
        icon:  isBeacon ? '📍' : '📡',
      };
      if (idx >= 0) {
        const next = [...prev]; next[idx] = item;
        return next.sort((a, b) => b.rssi - a.rssi);
      }
      return [...prev, item].sort((a, b) => b.rssi - a.rssi);
    });
  }, []);

  // ── Web Bluetooth scan ────────────────────────────────────────
  const handleWebScan = useCallback(async () => {
    setWebError('');
    setWebStatus('');

    // Guard: running inside an iframe? (e.g. Claude preview pane)
    // Web Bluetooth is blocked in iframes — user must open in a real tab.
    if (typeof window !== 'undefined' && window.top !== window.self) {
      setWebError('⚠️ Bluetooth werkt niet in dit preview venster.\nOpen de app in een echte Chrome tab → zie instructies hieronder.');
      return;
    }

    // Guard: Web Bluetooth available?
    if (typeof navigator === 'undefined' || !navigator.bluetooth) {
      setWebError('Web Bluetooth niet beschikbaar.\nOpen de app in Google Chrome (niet Safari of Firefox).');
      return;
    }

    setWebBusy(true);

    // ── Path 1: Passive scan (requestLEScan) ──────────────────
    // Shows ALL nearby BLE devices automatically with no picker.
    // Requires: Chrome with chrome://flags/#enable-experimental-web-platform-features
    if (typeof navigator.bluetooth.requestLEScan === 'function') {
      try {
        setWebStatus('Starting passive scan…');
        const scan = await navigator.bluetooth.requestLEScan({ acceptAllDevices: true });
        webScanRef.current = scan;
        setScanning(true);
        setWebBusy(false);
        setWebStatus('');
        scan.addEventListener('advertisementreceived', (e) => {
          addWebDevice(e.device.id, e.device.name || '', typeof e.rssi === 'number' ? e.rssi : -80);
        });
        return;
      } catch (err) {
        // Not available or denied — fall through to picker
        setWebStatus('');
      }
    }

    // ── Path 2: requestDevice picker loop ─────────────────────
    // Chrome opens a popup showing all nearby BLE devices.
    // User picks one → it's added → popup opens again.
    // Press Cancel in the popup to stop.
    setWebBusy(false);
    let added = 0;

    while (true) {
      setWebStatus(
        added === 0
          ? '👆 A Chrome dialog just opened — select any device from the list'
          : `${added} device${added !== 1 ? 's' : ''} added · Select another, or Cancel to finish`
      );
      try {
        const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
        addWebDevice(device.id, device.name || '', -60);
        added++;
        // Brief pause so the list updates visibly before next dialog
        await new Promise(r => setTimeout(r, 450));
      } catch (err) {
        // User pressed Cancel (NotFoundError) or closed dialog
        break;
      }
    }

    setWebStatus(added > 0 ? `✓ ${added} device${added !== 1 ? 's' : ''} discovered` : '');
  }, [addWebDevice]);

  // ── Stop passive LEScan ───────────────────────────────────────
  const handleStopScan = useCallback(() => {
    if (webScanRef.current) {
      try { webScanRef.current.stop(); } catch (_) {}
      webScanRef.current = null;
    }
    setScanning(false);
    setWebStatus('');
  }, []);

  // ── Assign a scanned device to a beacon slot ──────────────────
  const assignBeacon = (beaconId, device) => {
    const next = { ...beaconPairs };
    const alreadyOwns = next[beaconId]?.id === device.id;

    if (alreadyOwns) {
      // Toggle off — unpair this beacon
      delete next[beaconId];
    } else {
      // Remove this device from any other slot (1 device = 1 beacon)
      Object.keys(next).forEach(key => {
        if (next[key]?.id === device.id) delete next[key];
      });
      // Assign to the chosen beacon
      next[beaconId] = { name: device.name, id: device.id };
      BeaconManager.pairDevice(beaconId, device.name, device.id);
    }

    setBeaconPairs(next);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('wl-beacon-pairs', JSON.stringify(next)); } catch (_) {}
    }
  };

  // ── Derived display state ──────────────────────────────────────
  const isWeb          = Platform.OS === 'web';
  const webBtSupported = isWeb && typeof navigator !== 'undefined' && !!navigator?.bluetooth;
  // Show scan button when on web and not already in a passive LEScan
  const showScanBtn    = isWeb && !scanning;
  // "Scanning…" row for native while waiting for first result
  const showNativeBusy = !isWeb && scanning && bleItems.length === 0;

  // ── Search filter ──────────────────────────────────────────────
  const q             = searchQuery.trim().toLowerCase();
  const filteredItems = q
    ? bleItems.filter(d => d.name.toLowerCase().includes(q))
    : bleItems;
  const showSearch    = bleItems.length >= 5; // search bar appears once list grows

  const RADAR_R = 30; // smaller radar = more room for device list

  return (
    <View style={sc.wrap}>
      {/* ── Radar (compact) ── */}
      <View style={[sc.radarOuter, { width: RADAR_R * 2, height: RADAR_R * 2, marginBottom: 16 }]}>
        {rings.map((ring, i) => {
          const scale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
          const opacity = ring.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.35, 0] });
          return (
            <Animated.View
              key={i}
              style={[sc.radarRing, { width: RADAR_R * 2, height: RADAR_R * 2, borderRadius: RADAR_R, transform: [{ scale }], opacity }]}
            />
          );
        })}
        <View style={[sc.radarCenter, { width: RADAR_R * 2, height: RADAR_R * 2, borderRadius: RADAR_R }]}>
          <Text style={sc.radarIcon}>📡</Text>
        </View>
      </View>

      {/* ── Scan / Stop buttons (web only) ── */}
      {isWeb && !scanning && (
        <TouchableOpacity
          style={[sc.scanBtn, webBusy && sc.scanBtnBusy]}
          onPress={handleWebScan}
          disabled={webBusy}
          activeOpacity={0.8}
        >
          <Text style={sc.scanBtnText}>{webBusy ? 'Bezig…' : 'Scan Bluetooth'}</Text>
        </TouchableOpacity>
      )}
      {isWeb && scanning && (
        <TouchableOpacity style={sc.stopBtn} onPress={handleStopScan} activeOpacity={0.8}>
          <Text style={sc.stopBtnText}>Stop scannen</Text>
        </TouchableOpacity>
      )}

      {/* ── Web: scan status / bridge instruction ── */}
      {isWeb && (
        <View style={sc.webControls}>
          {scanning && (
            <View style={sc.scanningRow}>
              <View style={sc.scanDot} />
              <Text style={sc.scanningLive}>
                Live · {bleItems.length} apparaat{bleItems.length !== 1 ? 'en' : ''} gevonden
              </Text>
            </View>
          )}
          {webStatus !== '' && (
            <Text style={sc.webHint}>{webStatus}</Text>
          )}
          {webError === 'bridge-offline' && !scanning && (
            <View style={sc.bridgeCard}>
              <Text style={sc.bridgeTitle}>Start de BLE scanner</Text>
              <Text style={sc.bridgeBody}>Open een nieuw Terminal venster en typ:</Text>
              <View style={sc.codeBox}>
                <Text style={sc.codeText}>npm run ble-bridge</Text>
              </View>
              <Text style={sc.bridgeHint}>Alle Bluetooth apparaten verschijnen dan hier automatisch.</Text>
            </View>
          )}
          {webError !== '' && webError !== 'bridge-offline' && (
            <Text style={[sc.webHint, { color: '#FF6B6B' }]}>{webError}</Text>
          )}
        </View>
      )}

      {/* ── Beacon pairing status strip — always visible ── */}
      <View style={sc.pairingStrip}>
        {BEACON_SLOTS.map(slot => {
          const pair = beaconPairs[slot.id];
          return (
            <View
              key={slot.id}
              style={[sc.pairingSlot, pair && { borderColor: slot.color + '88' }]}
            >
              <View style={[sc.pairingDot, { backgroundColor: pair ? slot.color : 'rgba(255,255,255,0.18)' }]} />
              <Text style={[sc.pairingSlotId, pair && { color: slot.color }]}>{slot.id}</Text>
              <Text style={sc.pairingDeviceName} numberOfLines={1}>
                {pair ? (pair.name.length > 9 ? pair.name.slice(0, 9) + '…' : pair.name) : slot.room}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Search bar — appears once list grows ── */}
      {showSearch && (
        <View style={sc.searchWrap}>
          <Text style={sc.searchIcon}>🔍</Text>
          <TextInput
            style={sc.searchInput}
            placeholder="Zoek apparaat…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={sc.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Result count ── */}
      {showSearch && (
        <Text style={sc.resultCount}>
          {filteredItems.length} van {bleItems.length} apparaten
        </Text>
      )}

      {/* ── Device list — scrollable ── */}
      <ScrollView
        style={sc.listScroll}
        contentContainerStyle={sc.list}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredItems.map((item, i) => {
          const bars       = rssiToBars(item.rssi);
          const isBeacon   = item.type === 'beacon';
          const deviceKey  = item.id ?? i;
          const isSelected = selectedId === deviceKey;
          // Which beacon slot (if any) is this device paired to?
          const pairedSlot = BEACON_SLOTS.find(s => beaconPairs[s.id]?.id === deviceKey);

          return (
            <View key={deviceKey}>
              {/* ── Main row ── */}
              <TouchableOpacity
                activeOpacity={0.72}
                onPress={() => setSelectedId(isSelected ? null : deviceKey)}
                style={[
                  sc.deviceRow,
                  isBeacon   && sc.deviceRowBeacon,
                  isSelected && sc.deviceRowSelected,
                ]}
              >
                <Text style={sc.deviceIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[sc.deviceName, isBeacon && sc.deviceNameBeacon]}>{item.name}</Text>
                  <Text style={sc.deviceRssi}>
                    {item.rssi} dBm · {isBeacon ? '✅ WanderLost Beacon' : 'BLE apparaat'}
                  </Text>
                </View>
                {pairedSlot && (
                  <View style={[sc.pairedBadge, { borderColor: pairedSlot.color + '88' }]}>
                    <View style={[sc.pairedDot, { backgroundColor: pairedSlot.color }]} />
                    <Text style={[sc.pairedBadgeText, { color: pairedSlot.color }]}>{pairedSlot.id}</Text>
                  </View>
                )}
                <SignalBars bars={bars} color={item.color} />
              </TouchableOpacity>

              {/* ── Beacon picker (expanded when selected) ── */}
              {isSelected && (
                <View style={sc.beaconPicker}>
                  <Text style={sc.beaconPickerLabel}>Koppel aan beacon:</Text>
                  <View style={sc.beaconPickerRow}>
                    {BEACON_SLOTS.map(slot => {
                      const isThisPaired  = beaconPairs[slot.id]?.id === deviceKey;
                      const isOtherPaired = beaconPairs[slot.id] && !isThisPaired;
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          activeOpacity={0.75}
                          onPress={() => assignBeacon(slot.id, item)}
                          style={[
                            sc.beaconSlotBtn,
                            { borderColor: isThisPaired ? slot.color : slot.color + '55' },
                            isThisPaired && { backgroundColor: slot.color + '22' },
                          ]}
                        >
                          <View style={[sc.beaconSlotDot, { backgroundColor: slot.color, opacity: isOtherPaired ? 0.4 : 1 }]} />
                          <Text style={[sc.beaconSlotId, { color: isThisPaired ? slot.color : 'rgba(255,255,255,0.75)' }]}>
                            {slot.id}
                          </Text>
                          {isOtherPaired && <Text style={sc.beaconOccupied}>●</Text>}
                          {isThisPaired  && <Text style={[sc.beaconOccupied, { color: slot.color }]}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
        {filteredItems.length === 0 && searchQuery.length > 0 && (
          <Text style={sc.scanning}>Geen apparaten gevonden voor "{searchQuery}"</Text>
        )}
        {showNativeBusy && <Text style={sc.scanning}>Beacons zoeken…</Text>}
        {!isWeb && !scanning && bleItems.length === 0 && (
          <Text style={sc.scanning}>Geen beacons gevonden in de buurt</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Bluetooth toggle ──────────────────────────────────────────────────────────
function BluetoothToggle({ active }) {
  const [isOn, setIsOn] = useState(false);
  const anim      = useRef(new Animated.Value(0)).current;

  // ── Popup entrance animation ───────────────────────────────────────────────
  const popOpacity   = useRef(new Animated.Value(0)).current;
  const popTranslateY = useRef(new Animated.Value(24)).current;
  const popScale     = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (active) {
      // Appear 1.6 s after "Don't forget!" slide becomes visible
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(popOpacity,    { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: false }),
          Animated.timing(popTranslateY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
          Animated.spring(popScale,      { toValue: 1, tension: 90,   friction: 11, useNativeDriver: false }),
        ]).start();
      }, 1600);
      return () => clearTimeout(t);
    } else {
      // Instantly hide when leaving the slide
      popOpacity.setValue(0);
      popTranslateY.setValue(24);
      popScale.setValue(0.92);
    }
  }, [active]);

  const handleToggle = () => {
    const next = !isOn;
    setIsOn(next);
    Animated.spring(anim, {
      toValue:    next ? 1 : 0,
      useNativeDriver: false,
      bounciness: 5,
      speed:      18,
    }).start();
    if (next && Platform.OS !== 'web') Linking.openSettings();
  };

  const trackColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(255,255,255,0.18)', '#4CD964'],
  });
  const thumbX = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [3, 23],
  });

  return (
    <Animated.View style={[
      tog.popup,
      {
        opacity:   popOpacity,
        transform: [{ translateY: popTranslateY }, { scale: popScale }],
      },
    ]}>
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.85} style={tog.row}>
        <View style={tog.labelCol}>
          <Text style={tog.label}>Bluetooth</Text>
          <Text style={[tog.status, isOn && tog.statusOn]}>
            {isOn ? 'Enabled' : 'Tap to enable'}
          </Text>
        </View>

        {/* Pill track */}
        <Animated.View style={[tog.track, { backgroundColor: trackColor }]}>
          <View style={[tog.trackBorder, isOn && { borderColor: 'transparent' }]} />
          <Animated.View style={[tog.thumb, { transform: [{ translateX: thumbX }] }]} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Gallery Map preview (slide 3 only) ───────────────────────────────────────
// Non-interactive copy of the map button from SerendipityMapScreen, with a
// soft breathing glow to show users where the button lives during the tour.
// Fades in with a delay when active (same pattern as LET'S START on the last slide).
function GalleryMapPreview({ active }) {
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity      = useRef(new Animated.Value(0.2)).current;
  let glowAnim = useRef(null).current;

  // Entrance: delayed fade-in when the slide becomes active
  useEffect(() => {
    if (active) {
      containerOpacity.setValue(0);
      const t = setTimeout(() => {
        Animated.timing(containerOpacity, {
          toValue:         1,
          duration:        700,
          easing:          Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      }, 1200);
      return () => clearTimeout(t);
    } else {
      containerOpacity.setValue(0);
    }
  }, [active]);

  // Continuous glow pulse (runs independently of entrance)
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.95, duration: 900,  easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 0.20, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const haloShadow = Platform.OS === 'web'
    ? { boxShadow: '0 0 28px 12px rgba(255,255,255,0.55)' }
    : { shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 18, elevation: 12 };

  return (
    <Animated.View style={[gm.container, { opacity: containerOpacity }]} pointerEvents="none">
      {/* Wrapper holds the pulsing halo + the glass button */}
      <View style={gm.wrapper}>
        <Animated.View
          style={[gm.halo, haloShadow, { opacity: glowOpacity }]}
          pointerEvents="none"
        />
        <View style={gm.glassBtn}>
          <View style={gm.glowCircle} />
        </View>
      </View>
      <Text style={gm.hint}>HOLD TO REVEAL</Text>
    </Animated.View>
  );
}

const gm = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom:   48,
    right:    32,
    alignItems: 'center',
    gap:        8,
  },
  wrapper: {
    width:          70,
    height:         70,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Pulsing halo — same shape as the button, sits behind it
  halo: {
    position:        'absolute',
    width:           46,
    height:          46,
    borderRadius:    14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // Exact copy of glassBtn from SerendipityMapScreen
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
  // Exact copy of glowCircle from SerendipityMapScreen
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
  hint: {
    fontFamily:    FONTS.title,
    color:         'rgba(255,255,255,0.30)',
    fontSize:      9,
    fontWeight:    '400',
    letterSpacing: 2.5,
  },
});

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function IntroSlidesScreen({ onFinish, onBack }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent]                 = useState(0);
  const [startBtnVisible, setStartBtnVisible] = useState(false);

  const startBtnOpacity = useRef(new Animated.Value(0)).current;
  const timerRef        = useRef(null);
  const currentRef      = useRef(0);

  // ── LET'S START fades in 1 s after landing on last slide ──────────────────
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startBtnOpacity.setValue(0);
    setStartBtnVisible(false);

    if (current === SLIDES.length - 1) {
      timerRef.current = setTimeout(() => {
        setStartBtnVisible(true);
        Animated.timing(startBtnOpacity, {
          toValue:         1,
          duration:        700,
          easing:          Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      }, 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current]);

  // ── Track active slide from scroll position (paged) ──────────────────────
  const handleScroll = useCallback((e) => {
    const newPage = Math.round(e.nativeEvent.contentOffset.y / height);
    const clamped = Math.max(0, Math.min(newPage, SLIDES.length - 1));
    if (clamped !== currentRef.current) {
      currentRef.current = clamped;
      setCurrent(clamped);
    }
  }, []);

  // ── Bluetooth / finish ────────────────────────────────────────────────────
  const handleStart = () => {
    if (Platform.OS === 'web') {
      onFinish();
    } else {
      Alert.alert(
        'Allow Bluetooth',
        'WanderLost needs Bluetooth to detect nearby artworks.',
        [{ text: 'Allow', onPress: onFinish }],
        { cancelable: false }
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Layer 1: pulsing blobs, fixed in background ── */}
      {BLOBS.map((blob, i) => (
        <PulsingBlob key={i} blob={blob} index={i} />
      ))}
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' }} pointerEvents="none" />

      {/* ── Layer 2: paged vertical scroll — one slide per screen ── */}
      <ScrollView
        style={StyleSheet.absoluteFill}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        {SLIDES.map((slide, idx) => (
          <View
            key={slide.id}
            style={styles.slideBlock}
          >
            {!slide.isScanner && <Text style={styles.title}>{slide.title}</Text>}

            <Text style={styles.body}>{slide.body}</Text>

            {/* ── Gallery Map preview (slide 3 only) ── */}
            {slide.isGalleryMap && <GalleryMapPreview active={current === idx} />}

            {/* ── Bluetooth popup (slide 4 only) ── */}
            {slide.isBluetooth && (
              <BluetoothToggle active={current === idx} />
            )}

            {/* ── Device scanner (slide 5 only) ── */}
            {slide.isScanner && (
              <DeviceScanner active={current === idx} />
            )}

            {/* ── LET'S START (last slide only) ── */}
            {slide.isLast && (
              <Animated.View
                style={{ opacity: startBtnOpacity, marginTop: 18 }}
                pointerEvents={startBtnVisible ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  style={[ghostBtn, styles.startBtn]}
                  onPress={handleStart}
                  activeOpacity={0.8}
                >
                  <Text style={ghostBtnTxt}>LET'S START</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── Swipe-down arrow (all slides except last) ── */}
            {!slide.isLast && (
              <ScrollArrow
                style={styles.slideArrow}
                onPress={() => {
                  /* programmatic scroll handled by the paging ScrollView */
                }}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* ── Layer 3: fixed chrome — always on top ── */}
      <View style={[styles.topBar, { top: Math.max(44, insets.top + 8) }]} pointerEvents="box-none">
        {/* Logo injected globally from App.js — spacer keeps "Go back" to the right */}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={onBack ?? onFinish}
          activeOpacity={0.6}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.backLink}>GO BACK</Text>
        </TouchableOpacity>
      </View>

      <DotIndicator total={SLIDES.length} current={current} />

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#000',
  },

  // Each slide — full screen page
  slideBlock: {
    width,
    height,
    paddingTop:        height * 0.32,
    paddingHorizontal: 28,
    paddingRight:      48, // room for right-side dot indicator
    paddingBottom:     36,
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
  skipText: {
    color:      'rgba(255,255,255,0.75)',
    fontSize:   15,
    fontWeight: '400',
  },

  // ── Slide content ──
  title: {
    color:        '#fff',
    fontSize:     46,
    fontWeight:   '700',
    marginBottom: 18,
    lineHeight:   50,
    fontFamily:   FONTS.title,
  },
  body: {
    color:      'rgba(255,255,255,0.80)',
    fontSize:   15,
    lineHeight: 24,
    fontWeight: '300',
    marginTop:  8,
    fontFamily: FONTS.body,
  },

  // ── LET'S START button — ghostBtn from theme + local overrides ──
  startBtn: {
    alignSelf:         'flex-start',
    paddingHorizontal: 28,
  },

  // ── GO BACK — underlined text link, same style as INTRO/ABOUT on splash ──
  backLink: {
    fontFamily:         FONTS.title,
    color:              'rgba(255,255,255,0.65)',
    fontSize:           12,
    fontWeight:         '500',
    letterSpacing:      2,
    textDecorationLine: 'underline',
  },

  // ── Scroll arrow inside slides ──
  slideArrow: {
    marginTop: 24,
  },
});

// ─── Bluetooth toggle styles ───────────────────────────────────────────────────
const tog = StyleSheet.create({
  // Popup wrapper — sits inline below the body text
  popup: {
    marginTop:    28,
    borderRadius: 20,
    overflow:     'hidden',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
  },
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  'rgba(20, 12, 6, 0.72)',
    borderRadius:     20,
    paddingVertical:  18,
    paddingHorizontal: 20,
    borderWidth:      1,
    borderColor:      'rgba(255,255,255,0.14)',
    gap:              14,
  },
  labelCol: { flex: 1 },
  label:    { color: '#fff',                    fontSize: 14, fontWeight: '500' },
  status:   { color: 'rgba(255,255,255,0.40)',  fontSize: 12, fontWeight: '300', marginTop: 2 },
  statusOn: { color: '#4CD964' },

  // Toggle pill
  track: {
    width:        52,
    height:       30,
    borderRadius: 15,
    justifyContent: 'center',
    position:     'relative',
  },
  trackBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    borderWidth:  1,
    borderColor:  'rgba(255,255,255,0.22)',
  },
  thumb: {
    position:      'absolute',
    width:         24,
    height:        24,
    borderRadius:  12,
    backgroundColor: '#fff',
    top:           3,
    // shadowColor + elevation for the raised look
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.30,
    shadowRadius:  3,
    elevation:     3,
  },
});

// ─── Device scanner styles ────────────────────────────────────────────────────
const sc = StyleSheet.create({
  wrap: { marginTop: 18 },

  // Radar
  radarOuter: {
    alignSelf:      'center',
    alignItems:     'center',
    justifyContent: 'center',
  },
  radarRing: {
    position:    'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(58,159,255,0.70)',
  },
  radarCenter: {
    backgroundColor: 'rgba(58,159,255,0.10)',
    borderWidth:     1.5,
    borderColor:     'rgba(58,159,255,0.40)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  radarIcon: { fontSize: 20 },

  // Device list — scrollable container
  listScroll: {
    maxHeight:    210,
    marginBottom: 10,
  },
  list: { gap: 7 },
  deviceRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(15,8,4,0.55)',
    borderRadius:      12,
    paddingVertical:   9,
    paddingHorizontal: 12,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.10)',
    gap:               10,
  },
  deviceRowBeacon: {
    borderColor:     'rgba(58,159,255,0.35)',
    backgroundColor: 'rgba(58,159,255,0.08)',
  },
  deviceRowSelected: {
    borderColor:     'rgba(255,255,255,0.50)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  deviceIcon: { fontSize: 15 },
  deviceName: { color: '#fff', fontSize: 12, fontWeight: '500' },
  deviceNameBeacon: { color: '#3A9FFF' },
  deviceRssi: { color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: '300', marginTop: 1 },
  deviceId:   { color: 'rgba(255,255,255,0.22)', fontSize: 9,  fontWeight: '300', marginTop: 2,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  scanning:   { color: 'rgba(255,255,255,0.30)', fontSize: 11, fontWeight: '300', textAlign: 'center', marginTop: 6, letterSpacing: 0.5 },

  // ── Beacon pairing status strip ──
  pairingStrip: {
    flexDirection:  'row',
    gap:            6,
    marginBottom:   10,
  },
  pairingSlot: {
    flex:              1,
    flexDirection:     'column',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.04)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.10)',
    borderRadius:      10,
    paddingVertical:   7,
    paddingHorizontal: 4,
    gap:               3,
  },
  pairingDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  pairingSlotId: {
    color:         'rgba(255,255,255,0.55)',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 0.5,
  },
  pairingDeviceName: {
    color:         'rgba(255,255,255,0.28)',
    fontSize:      8,
    fontWeight:    '300',
    textAlign:     'center',
  },

  // ── Paired badge (on device row) ──
  pairedBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            3,
    borderWidth:    1,
    borderRadius:   6,
    paddingHorizontal: 5,
    paddingVertical:   2,
    marginRight:    4,
  },
  pairedDot: {
    width: 5, height: 5, borderRadius: 3,
  },
  pairedBadgeText: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.3,
  },

  // ── Beacon picker (expanded below selected row) ──
  beaconPicker: {
    backgroundColor:   'rgba(255,255,255,0.04)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.10)',
    borderTopWidth:    0,
    borderBottomLeftRadius:  10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 10,
    paddingVertical:   10,
    gap:               8,
  },
  beaconPickerLabel: {
    color:         'rgba(255,255,255,0.38)',
    fontSize:      10,
    fontWeight:    '300',
    letterSpacing: 0.3,
  },
  beaconPickerRow: {
    flexDirection: 'row',
    gap:           7,
  },
  beaconSlotBtn: {
    flex:              1,
    flexDirection:     'column',
    alignItems:        'center',
    borderWidth:       1.5,
    borderRadius:      10,
    paddingVertical:   8,
    gap:               4,
  },
  beaconSlotDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  beaconSlotId: {
    fontSize:      13,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  beaconOccupied: {
    fontSize:  7,
    color:     'rgba(255,255,255,0.25)',
    marginTop: -2,
  },

  // ── Search bar ──
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.07)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.12)',
    borderRadius:      10,
    paddingHorizontal: 10,
    paddingVertical:   7,
    marginBottom:      6,
    gap:               6,
  },
  searchIcon: { fontSize: 12, opacity: 0.5 },
  searchInput: {
    flex:       1,
    color:      '#fff',
    fontSize:   12,
    fontWeight: '300',
    padding:    0,
    ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
  },
  searchClear: {
    color:    'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  resultCount: {
    color:         'rgba(255,255,255,0.28)',
    fontSize:      10,
    fontWeight:    '300',
    letterSpacing: 0.3,
    marginBottom:  6,
    paddingHorizontal: 2,
  },

  // "How to connect" card
  connectCard: {
    backgroundColor: 'rgba(15,8,4,0.65)',
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.10)',
    padding:         14,
    gap:             8,
  },
  connectTitle: {
    color: '#fff', fontSize: 13, fontWeight: '600',
  },
  connectBody: {
    color: 'rgba(255,255,255,0.50)', fontSize: 11, lineHeight: 16,
  },
  beaconRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2,
  },
  beaconDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  beaconName: {
    color: '#fff', fontSize: 11, fontWeight: '600', width: 90,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  beaconRoom: {
    color: 'rgba(255,255,255,0.38)', fontSize: 10, flex: 1,
  },

  // ── Scan / Stop buttons ──
  scanBtn: {
    backgroundColor: '#3A9FFF',
    borderRadius:    50,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignSelf:       'center',
    marginBottom:    14,
    minWidth:        180,
    alignItems:      'center',
  },
  scanBtnBusy: { opacity: 0.5 },
  scanBtnText: {
    color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.5,
  },
  stopBtn: {
    borderWidth:     1.5,
    borderColor:     'rgba(255,255,255,0.30)',
    borderRadius:    50,
    paddingVertical: 11,
    paddingHorizontal: 24,
    alignSelf:       'center',
    marginBottom:    14,
    minWidth:        180,
    alignItems:      'center',
  },
  stopBtnText: {
    color: 'rgba(255,255,255,0.70)', fontSize: 13, fontWeight: '500',
  },

  // ── Web controls wrapper ──
  webControls: { marginBottom: 10, gap: 8 },

  // ── Live scan row ──
  scanningRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    marginBottom:   10,
    paddingHorizontal: 4,
  },
  scanDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#3A9FFF',
  },
  scanningLive: {
    color: 'rgba(58,159,255,0.90)', fontSize: 12, fontWeight: '500', flex: 1,
  },

  // ── Bridge offline card ──
  bridgeCard: {
    backgroundColor: 'rgba(15,8,4,0.72)',
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.12)',
    padding:         16,
    gap:             8,
  },
  bridgeTitle: {
    color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2,
  },
  bridgeBody: {
    color: 'rgba(255,255,255,0.60)', fontSize: 12, lineHeight: 17,
  },
  codeBox: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius:    8,
    paddingVertical:   8,
    paddingHorizontal: 12,
    borderWidth:     1,
    borderColor:     'rgba(170,255,34,0.35)',
  },
  codeText: {
    color: '#AAFF22', fontSize: 13, fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.3,
  },
  bridgeHint: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 16,
  },
  webHint: {
    color: 'rgba(255,255,255,0.28)', fontSize: 11, textAlign: 'center', lineHeight: 16,
  },
});
