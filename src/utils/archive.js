import { Platform } from 'react-native';

const STORAGE_KEY = 'wanderlost_archive';

// ─── Save a completed visit (only if profile has a name) ─────────────────────
export function saveVisit(profile, sessionData) {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  if (!profile?.name?.trim()) return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    stored.push({
      id:                  Date.now().toString(),
      name:                profile.name.trim(),
      date:                new Date().toISOString(),
      serendipity:         profile.serendipity ?? 0.5,
      beaconOrder:         sessionData?.beaconOrder         ?? [],
      durationSeconds:     sessionData?.durationSeconds     ?? 0,
      artworksVisited:     sessionData?.artworksVisited     ?? 0,
      totalArtworks:       sessionData?.totalArtworks       ?? 12,
      followedSuggestions: sessionData?.followedSuggestions ?? 0,
      ignoredSuggestions:  sessionData?.ignoredSuggestions  ?? 0,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (_) {}
}

// ─── Load all stored visits ───────────────────────────────────────────────────
export function loadVisits() {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) { return []; }
}
