/**
 * useBeaconProximity.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that wraps BeaconManager for use in components.
 *
 * On web:    connects to the BLE bridge at ws://localhost:8765
 *            (run `npm run ble-bridge` in a separate Terminal tab)
 * On native: uses react-native-ble-plx directly
 *
 * Returns:
 *   visibleBeacons  — array of visible beacon objects (sorted by RSSI desc)
 *   nearestBeacon   — first item or null
 *   isScanning      — true while scan is active
 *   bleSupported    — false only when both native BLE AND the bridge are unavailable
 *   error           — null | string
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { BeaconManager } from '../utils/BeaconManager';

export function useBeaconProximity({ onTriggered } = {}) {
  const [visibleBeacons, setVisibleBeacons] = useState([]);
  const [isScanning,     setIsScanning]     = useState(false);
  const [bleSupported,   setBleSupported]   = useState(true);   // optimistic — corrected after init
  const [error,          setError]          = useState(null);

  const onTriggeredRef = useRef(onTriggered);
  useEffect(() => { onTriggeredRef.current = onTriggered; }, [onTriggered]);

  const startBle = useCallback(async () => {
    // 1. Init (handles both web WebSocket and native BLE)
    const initResult = await BeaconManager.init();
    if (!initResult.ok) {
      setBleSupported(false);
      setError(initResult.reason ?? 'BLE / bridge unavailable');
      return;
    }

    // 2. Permissions (Android only — iOS via Info.plist, web skipped)
    const granted = await BeaconManager.requestPermissions();
    if (!granted) {
      setError('Bluetooth / location permission denied');
      return;
    }

    // 3. Start scan
    await BeaconManager.startScan({
      onUpdate:    (list) => setVisibleBeacons([...list]),
      onTriggered: (id, rssi) => onTriggeredRef.current?.(id, rssi),
    });
    setIsScanning(true);
  }, []);

  useEffect(() => {
    startBle();
    return () => {
      BeaconManager.stopScan();
      setIsScanning(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nearestBeacon = visibleBeacons.length > 0 ? visibleBeacons[0] : null;

  return { visibleBeacons, nearestBeacon, isScanning, bleSupported, error };
}
