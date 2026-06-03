/**
 * BeaconManager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Real BLE scanning + proximity detection for WanderLost museum beacons.
 *
 * On native (iOS / Android): uses react-native-ble-plx
 * On web: connects to the BLE bridge WebSocket at ws://localhost:8765
 *         Run: npm run ble-bridge  (in a separate Terminal tab)
 */

import { Platform, PermissionsAndroid } from 'react-native';

// ─── Museum beacon configuration ─────────────────────────────────────────────
export const MUSEUM_BEACONS = [
  { id: 'A', name: 'WL-BeaconA', displayName: 'Beacon A', room: 'Room 1 — Entry',      rssiNear: -70, color: '#AAFF22' },
  { id: 'B', name: 'WL-BeaconB', displayName: 'Beacon B', room: 'Room 2 — East Wing',  rssiNear: -70, color: '#3A9FFF' },
  { id: 'C', name: 'WL-BeaconC', displayName: 'Beacon C', room: 'Room 3 — Centre',     rssiNear: -70, color: '#FF2D78' },
  { id: 'D', name: 'WL-BeaconD', displayName: 'Beacon D', room: 'Room 4 — Exit',       rssiNear: -70, color: '#FF6820' },
];

// ─── Timing constants ─────────────────────────────────────────────────────────
const DWELL_MS    = 5000;
const COOLDOWN_MS = 60000;
const RSSI_WINDOW = 5;

// ─── BLE Bridge WebSocket address ────────────────────────────────────────────
const BRIDGE_URL     = 'ws://localhost:8765';
const BRIDGE_TIMEOUT = 3000; // ms to wait for connection before declaring offline

// ─── BeaconManager singleton ──────────────────────────────────────────────────
class BeaconManagerClass {
  constructor() {
    this._ble          = null;
    this._ws           = null;   // WebSocket (web only)
    this._scanning     = false;
    this._initialized  = false;

    this._rssiBuffer  = {};
    this._dwellStart  = {};
    this._lastTrigger = {};
    this._visible     = {};
    this._otherDevices= {};

    this._onUpdate    = null;
    this._onTriggered = null;

    // Restore any saved beacon↔device pairings from a previous session
    this._restorePairs();
  }

  // ── Beacon pairing: assign a real BLE device to a logical beacon slot ────────
  // Called from the intro scanner when the user taps a device and picks a slot.
  pairDevice(beaconId, deviceName, deviceId) {
    const beacon = MUSEUM_BEACONS.find(b => b.id === beaconId);
    if (!beacon) return;
    beacon.name          = deviceName;
    beacon.pairedDeviceId = deviceId;
    if (typeof localStorage !== 'undefined') {
      try {
        const pairs = JSON.parse(localStorage.getItem('wl-beacon-pairs') || '{}');
        pairs[beaconId] = { name: deviceName, id: deviceId };
        localStorage.setItem('wl-beacon-pairs', JSON.stringify(pairs));
      } catch (_) {}
    }
  }

  _restorePairs() {
    if (typeof localStorage !== 'undefined') {
      try {
        const pairs = JSON.parse(localStorage.getItem('wl-beacon-pairs') || '{}');
        Object.entries(pairs).forEach(([beaconId, { name, id }]) => {
          const beacon = MUSEUM_BEACONS.find(b => b.id === beaconId);
          if (beacon) { beacon.name = name; beacon.pairedDeviceId = id; }
        });
      } catch (_) {}
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  async init() {
    if (this._initialized) return { ok: true };

    if (Platform.OS === 'web') {
      return this._initWeb();
    }

    try {
      const { BleManager } = require('react-native-ble-plx');
      this._ble = new BleManager();
      this._initialized = true;
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  // ── Web: connect to BLE bridge WebSocket ─────────────────────────────────
  _initWeb() {
    return new Promise((resolve) => {
      if (typeof WebSocket === 'undefined') {
        resolve({ ok: false, reason: 'no-websocket' });
        return;
      }

      // Close any stale socket first
      if (this._ws) {
        try { this._ws.close(); } catch (_) {}
        this._ws = null;
      }

      let settled = false;
      const settle = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      const timer = setTimeout(() => {
        settle({ ok: false, reason: 'bridge-offline' });
      }, BRIDGE_TIMEOUT);

      try {
        const ws = new WebSocket(BRIDGE_URL);

        ws.onopen = () => {
          this._ws           = ws;
          this._initialized  = true;
          settle({ ok: true });
        };

        ws.onerror = () => settle({ ok: false, reason: 'bridge-offline' });

        ws.onclose = () => {
          // If the socket closes while scanning, mark as stopped
          if (this._scanning) {
            this._scanning = false;
            this._onUpdate?.([]);
          }
        };
      } catch (e) {
        settle({ ok: false, reason: e.message });
      }
    });
  }

  // ── Request Android runtime permissions ───────────────────────────────────
  async requestPermissions() {
    if (Platform.OS !== 'android') return true;

    const api = Platform.Version;
    if (api >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(result).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title:   'Location permission needed',
          message: 'WanderLost needs location access to scan for museum beacons.',
          buttonPositive: 'Allow',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  // ── Start scanning ────────────────────────────────────────────────────────
  async startScan({ onUpdate, onTriggered } = {}) {
    if (!this._initialized || this._scanning) return;

    this._onUpdate    = onUpdate;
    this._onTriggered = onTriggered;
    this._scanning    = true;

    if (Platform.OS === 'web') {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        // Try to reconnect
        const result = await this._initWeb();
        if (!result.ok) { this._scanning = false; return; }
      }

      this._ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.isBeacon) {
            const beacon = MUSEUM_BEACONS.find(b => b.name === d.name);
            if (beacon) this._handleBeaconAdvertisement(beacon, d.rssi);
          } else if (d.name) {
            this._otherDevices[d.id] = { id: d.id, name: d.name, rssi: d.rssi };
          }
          this._onUpdate?.(this._buildVisibleList());
        } catch (_) {}
      };

      this._ws.onclose = () => {
        this._scanning = false;
        this._onUpdate?.([]);
      };
      return;
    }

    // ── Native ──────────────────────────────────────────────────────────────
    this._ble.startDeviceScan(
      null,
      { allowDuplicates: true },
      (error, device) => {
        if (error) { console.warn('[BeaconManager] scan error:', error.message); return; }
        if (!device || device.rssi == null) return;

        const devName = device.localName || device.name || '';
        const beacon  = MUSEUM_BEACONS.find(b => b.name === devName);

        if (beacon) {
          this._handleBeaconAdvertisement(beacon, device.rssi);
        } else if (devName) {
          this._otherDevices[device.id] = { id: device.id, name: devName, rssi: device.rssi };
        }

        this._onUpdate?.(this._buildVisibleList());
      }
    );
  }

  // ── Handle one advertisement from a known museum beacon ───────────────────
  _handleBeaconAdvertisement(beacon, rssi) {
    const id  = beacon.id;
    const now = Date.now();

    if (!this._rssiBuffer[id]) this._rssiBuffer[id] = [];
    this._rssiBuffer[id].push(rssi);
    if (this._rssiBuffer[id].length > RSSI_WINDOW) this._rssiBuffer[id].shift();

    const avgRssi = Math.round(
      this._rssiBuffer[id].reduce((a, b) => a + b, 0) / this._rssiBuffer[id].length
    );

    this._visible[id] = { rssi: avgRssi, name: beacon.name };

    const isNear = avgRssi >= beacon.rssiNear;

    if (isNear) {
      if (this._dwellStart[id] == null) this._dwellStart[id] = now;

      const dwellMs     = now - this._dwellStart[id];
      const lastTrigger = this._lastTrigger[id] ?? 0;
      const cooledDown  = now - lastTrigger >= COOLDOWN_MS;

      if (dwellMs >= DWELL_MS && cooledDown) {
        this._lastTrigger[id] = now;
        this._dwellStart[id]  = now;
        this._onTriggered?.(id, avgRssi);
      }
    } else {
      this._dwellStart[id] = null;
    }
  }

  // ── Stop scanning ─────────────────────────────────────────────────────────
  stopScan() {
    if (!this._scanning) return;
    if (Platform.OS === 'web') {
      if (this._ws) this._ws.onmessage = null; // detach handler, keep socket alive for reuse
    } else {
      this._ble?.stopDeviceScan();
    }
    this._scanning = false;
  }

  getVisible()           { return this._buildVisibleList(); }
  isScanning()           { return this._scanning; }

  getDwellProgress(id) {
    if (this._dwellStart[id] == null) return 0;
    return Math.min(1, (Date.now() - this._dwellStart[id]) / DWELL_MS);
  }

  _buildVisibleList() {
    return MUSEUM_BEACONS
      .filter(b => this._visible[b.id])
      .map(b => {
        const rssi   = this._visible[b.id].rssi;
        const isNear = rssi >= b.rssiNear;
        return { ...b, rssi, isNear, dwellProgress: this.getDwellProgress(b.id), type: 'beacon' };
      })
      .sort((a, b) => b.rssi - a.rssi);
  }

  destroy() {
    this.stopScan();
    if (Platform.OS === 'web') {
      try { this._ws?.close(); } catch (_) {}
      this._ws = null;
    } else {
      this._ble?.destroy();
      this._ble = null;
    }
    this._initialized = false;
  }
}

export const BeaconManager = new BeaconManagerClass();
