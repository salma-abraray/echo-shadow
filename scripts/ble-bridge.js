#!/usr/bin/env node
/**
 * WanderLost BLE Bridge
 * ──────────────────────────────────────────────────────────────
 * Scans for ALL nearby Bluetooth devices using your Mac's
 * Bluetooth chip and streams them to the Expo web app via
 * WebSocket on ws://localhost:8765.
 *
 * Run:  node scripts/ble-bridge.js
 *   or: npm run ble-bridge
 *
 * Requires:
 *   • Mac with Bluetooth on
 *   • Terminal must have Bluetooth permission
 *     (System Settings → Privacy & Security → Bluetooth → add Terminal)
 */

const noble  = require('@abandonware/noble');
const { WebSocketServer } = require('ws');

const PORT    = 8765;
const devices = new Map();   // id → device snapshot
const clients = new Set();

// ── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });

wss.on('listening', () => {
  console.log(`\n✅  WanderLost BLE Bridge`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Waiting for Bluetooth to power on…\n`);
});

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`🔌  Web app connected (${clients.size} client${clients.size !== 1 ? 's' : ''})`);

  // Send all already-known devices to new client
  devices.forEach(d => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(d));
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`🔌  Client disconnected`);
  });
});

// ── Broadcast helper ──────────────────────────────────────────────────────────
function broadcast(device) {
  const msg = JSON.stringify(device);
  clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  });
}

// ── Noble BLE scan ────────────────────────────────────────────────────────────
noble.on('stateChange', (state) => {
  console.log(`🔵  Bluetooth state: ${state}`);
  if (state === 'poweredOn') {
    console.log('🔍  Scanning for ALL nearby BLE devices…\n');
    // allowDuplicates: true → receive RSSI updates as devices re-advertise
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
    if (state === 'unauthorized') {
      console.error('\n⚠️  Bluetooth permission denied!');
      console.error('   Go to: System Settings → Privacy & Security → Bluetooth');
      console.error('   Add "Terminal" (or your terminal app) to the allowed list.\n');
    }
  }
});

noble.on('discover', (peripheral) => {
  const rawName   = peripheral.advertisement?.localName || '';
  const isBeacon  = rawName.startsWith('WL-Beacon');
  const name      = rawName || `BLE ${peripheral.uuid.slice(0, 8)}`;

  const device = {
    id:       peripheral.uuid,
    name,
    rssi:     peripheral.rssi,
    type:     isBeacon ? 'beacon' : 'ble',
    isBeacon,
  };

  const prev = devices.get(device.id);
  devices.set(device.id, device);

  // Log new devices (not RSSI-only updates)
  if (!prev) {
    const tag = isBeacon ? '📍 BEACON' : '📡 BLE   ';
    console.log(`  ${tag}  ${name.padEnd(30)} ${peripheral.rssi} dBm`);
  }

  broadcast(device);
});

noble.on('scanStop', () => console.log('⏹  Scan stopped'));

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n👋  Shutting down BLE bridge…');
  noble.stopScanning();
  wss.close();
  process.exit(0);
});
