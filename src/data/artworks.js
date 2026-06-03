// ─── Artwork metadata — sourced from IXD_Dataset Final.csv ───────────────────
// Keyed by artwork code (SW-01 … SW-12).
// Each entry enriches the base artwork object in SerendipityMapScreen's
// BEACON_CONFIGS with period, mood, themes, tags, value and archetypes.

export const ARTWORK_META = {

  'SW-01': {
    beacon:              'A',
    period:              'Baroque',
    themes:              ['Royalty', 'Portrait', 'Childhood'],
    colors:              ['Black', 'White', 'Silver', 'Ivory'],
    emotionalResonance:  'playful · intimate',
    psychologicalThemes: 'innocence, inherited identity, protection, status',
    wordTags:            ['identity', 'status', 'childhood', 'animals', 'intimacy'],
    value:               '$150M – $200M',
    emotionalIntensity:  3,
    ambiguity:           2,
    movementStyle:       'Baroque court portrait · aristocratic realism',
    tasteArchetypes:     ['The Status Observer', 'The Nostalgic Protector', 'The Portrait Reader'],
    theftLocation:       'Marseille, France',
    theftYear:           1970,
  },

  'SW-02': {
    beacon:              'A',
    period:              'Dutch Golden Age',
    themes:              ['Portrait', 'Couple', 'Wealth', 'Identity'],
    colors:              ['Black', 'White', 'Gold', 'Brown'],
    emotionalResonance:  'elegant · restrained',
    psychologicalThemes: 'partnership, restraint, social identity, wealth',
    wordTags:            ['identity', 'connection', 'status', 'elegance', 'restraint'],
    value:               '$200M+',
    emotionalIntensity:  2,
    ambiguity:           2,
    movementStyle:       'Dutch Golden Age · formal portraiture',
    tasteArchetypes:     ['The Formalist', 'The Social Observer', 'The Classicist'],
    theftLocation:       'Isabella Stewart Gardner Museum, Boston',
    theftYear:           1990,
  },

  'SW-03': {
    beacon:              'D',
    period:              'Dutch Golden Age',
    themes:              ['Biblical', 'Sea', 'Storm', 'Survival'],
    colors:              ['Blue', 'Grey', 'White', 'Brown'],
    emotionalResonance:  'tense · awe',
    psychologicalThemes: 'survival, chaos, faith, vulnerability, collective fear',
    wordTags:            ['spirituality', 'survival', 'nature', 'drama', 'movement'],
    value:               '$300M+',
    emotionalIntensity:  5,
    ambiguity:           3,
    movementStyle:       'Dutch Golden Age · baroque drama · biblical narrative',
    tasteArchetypes:     ['The Drama Seeker', 'The Spiritual Navigator', 'The Crisis Reader'],
    theftLocation:       'Isabella Stewart Gardner Museum, Boston',
    theftYear:           1990,
  },

  'SW-04': {
    beacon:              'D',
    period:              'Cubism',
    themes:              ['Portrait', 'Masculinity', 'Habit', 'Fragmentation'],
    colors:              ['Brown', 'Beige', 'Grey', 'Ochre'],
    emotionalResonance:  'curious · disruptive',
    psychologicalThemes: 'fragmented identity, perception, modern selfhood, habit',
    wordTags:            ['identity', 'fragmentation', 'experimentation', 'masculinity', 'modernism'],
    value:               '$5M – $10M',
    emotionalIntensity:  4,
    ambiguity:           5,
    movementStyle:       'Cubism · analytical modernism · experimental abstraction',
    tasteArchetypes:     ['The Analyst', 'The Experimenter', 'The Modernist'],
    theftLocation:       'Lawrence University, Appleton, Wisconsin',
    theftYear:           1998,
  },

  'SW-05': {
    beacon:              'B',
    period:              'Post-Impressionism',
    themes:              ['Nature', 'Fragility', 'Beauty', 'Solitude'],
    colors:              ['Red', 'Green', 'Yellow', 'Orange'],
    emotionalResonance:  'calm · melancholic',
    psychologicalThemes: 'fragility, solitude, beauty, impermanence, emotional sensitivity',
    wordTags:            ['nature', 'fragility', 'beauty', 'solitude', 'color', 'memory'],
    value:               '$50M – $70M',
    emotionalIntensity:  3,
    ambiguity:           2,
    movementStyle:       'Post-Impressionism · expressive color · intimate nature study',
    tasteArchetypes:     ['The Romantic', 'The Tender Observer', 'The Nature Empath'],
    theftLocation:       'Mohamed Mahmoud Khalil Museum, Cairo',
    theftYear:           2010,
  },

  'SW-06': {
    beacon:              'C',
    period:              'Baroque',
    themes:              ['Childhood', 'Everyday Life', 'Intimacy'],
    colors:              ['Brown', 'Warm Gold', 'Shadow'],
    emotionalResonance:  'warm · intimate',
    psychologicalThemes: 'innocence, intimacy, everyday pleasure, embodiment, warmth',
    wordTags:            ['childhood', 'intimacy', 'everyday life', 'innocence', 'warmth'],
    value:               '$3M – $8M',
    emotionalIntensity:  2,
    ambiguity:           1,
    movementStyle:       'Baroque · genre scene · naturalistic intimacy',
    tasteArchetypes:     ['The Intimate Observer', 'The Humanist', 'The Everyday Poet'],
    theftLocation:       'Christ Church Picture Gallery, Oxford, UK',
    theftYear:           2020,
  },

  'SW-07': {
    beacon:              'A',
    period:              'Post-Impressionism',
    themes:              ['Still Life', 'Food', 'Transience', 'Simplicity'],
    colors:              ['Red', 'Green', 'White', 'Yellow'],
    emotionalResonance:  'quiet · reflective',
    psychologicalThemes: 'transience, domestic calm, material attention, simplicity, patience',
    wordTags:            ['still life', 'transience', 'simplicity', 'domesticity', 'abundance'],
    value:               '$30M – $50M',
    emotionalIntensity:  2,
    ambiguity:           2,
    movementStyle:       'Post-Impressionism · still life · structural observation',
    tasteArchetypes:     ['The Formalist', 'The Quiet Collector', 'The Sensory Minimalist'],
    theftLocation:       'Museo Magnani Rocca, Italy',
    theftYear:           2026,
  },

  'SW-08': {
    beacon:              'B',
    period:              'Fauvism / Modernism',
    themes:              ['Female Figure', 'Rest', 'Exoticism', 'Light'],
    colors:              ['Blue', 'White', 'Orange', 'Yellow'],
    emotionalResonance:  'dreamlike · luxurious',
    psychologicalThemes: 'rest, interiority, sensuality, distance, contemplation',
    wordTags:            ['rest', 'sensuality', 'light', 'interiority', 'pattern', 'modernism'],
    value:               '$20M – $40M',
    emotionalIntensity:  3,
    ambiguity:           3,
    movementStyle:       'Fauvism · decorative figuration · modernist color',
    tasteArchetypes:     ['The Sensualist', 'The Color Seeker', 'The Dreamer'],
    theftLocation:       'Museo Magnani Rocca, Italy',
    theftYear:           2026,
  },

  'SW-09': {
    beacon:              'C',
    period:              'Baroque',
    themes:              ['Biblical', 'Birth', 'Saints', 'Sacred'],
    colors:              ['Brown', 'Gold', 'Deep Shadow', 'Ivory'],
    emotionalResonance:  'reverent · mysterious',
    psychologicalThemes: 'devotion, birth, sacrifice, sacred community, darkness and hope',
    wordTags:            ['spirituality', 'birth', 'devotion', 'darkness', 'community', 'sacrifice'],
    value:               '$20M – $30M',
    emotionalIntensity:  4,
    ambiguity:           3,
    movementStyle:       'Baroque · tenebrism · sacred realism',
    tasteArchetypes:     ['The Symbolist', 'The Spiritual Reader', 'The Reverent Dramatic'],
    theftLocation:       'Oratorio di San Lorenzo, Palermo',
    theftYear:           1969,
  },

  'SW-10': {
    beacon:              'C',
    period:              'Cubism',
    themes:              ['Bird', 'Fragmentation', 'Abstraction', 'Nature'],
    colors:              ['Grey', 'Brown', 'Beige', 'Ochre'],
    emotionalResonance:  'playful · curious',
    psychologicalThemes: 'play, fragmentation, freedom, abstraction, reconstructed nature',
    wordTags:            ['abstraction', 'fragmentation', 'animals', 'nature', 'playfulness', 'cubism'],
    value:               '$28M – $50M',
    emotionalIntensity:  3,
    ambiguity:           5,
    movementStyle:       'Cubism · synthetic abstraction · playful modernism',
    tasteArchetypes:     ['The Puzzle Solver', 'The Playful Modernist', 'The Abstract Thinker'],
    theftLocation:       'Musée d\'Art Moderne, Paris',
    theftYear:           2010,
  },

  'SW-11': {
    beacon:              'D',
    period:              'Post-Impressionism',
    themes:              ['Self-Portrait', 'Journey', 'Labor', 'Landscape'],
    colors:              ['Yellow', 'Blue', 'Green', 'Orange'],
    emotionalResonance:  'hopeful · wandering',
    psychologicalThemes: 'purpose, solitude, labor, journey, artistic identity',
    wordTags:            ['journey', 'labor', 'solitude', 'nature', 'purpose', 'selfhood'],
    value:               'Priceless',
    emotionalIntensity:  3,
    ambiguity:           3,
    movementStyle:       'Post-Impressionism · expressive landscape · artist myth',
    tasteArchetypes:     ['The Wanderer', 'The Purpose Seeker', 'The Creative Pilgrim'],
    theftLocation:       'Kaiser Friedrich Museum, Magdeburg',
    theftYear:           1945,
  },

  'SW-12': {
    beacon:              'B',
    period:              'Renaissance',
    themes:              ['Portrait', 'Youth', 'Nobility', 'Identity'],
    colors:              ['Brown', 'Gold', 'Black', 'Ivory'],
    emotionalResonance:  'ambitious · introspective',
    psychologicalThemes: 'youth, ambition, identity, beauty, status, becoming',
    wordTags:            ['identity', 'youth', 'status', 'beauty', 'ambition', 'renaissance'],
    value:               '$100M – $200M',
    emotionalIntensity:  3,
    ambiguity:           3,
    movementStyle:       'Renaissance · idealized portraiture · humanist classicism',
    tasteArchetypes:     ['The Identity Reader', 'The Classicist', 'The Ambition Seeker'],
    theftLocation:       'Czartoryski Museum, Kraków',
    theftYear:           1945,
  },
};

// Helper — merge CSV metadata into a base artwork object
export function enrichArtwork(base) {
  const meta = ARTWORK_META[base.code];
  if (!meta) return base;
  return { ...base, ...meta };
}

// ─── Recommendation engine ─────────────────────────────────────────────────────
// Scores every candidate artwork against:
//   · what the visitor just looked at (current artwork's tags/themes)
//   · their profile (intentions, word cloud, serendipity slider)
// Returns the best-matching artwork object, or null if nothing left to suggest.
export function recommendArtwork(currentArt, allArtworks, visitedIds, profile = {}) {
  const { intentions = [], words = [], serendipity = 0.5 } = profile;

  // Only consider artworks the visitor hasn't opened yet, in a different slot
  const candidates = allArtworks.filter(
    a => a.id !== currentArt.id && !visitedIds.has(a.id)
  );
  if (!candidates.length) return null;

  const curThemes = new Set((currentArt.themes   || []).map(t => t.toLowerCase()));
  const curTags   = new Set((currentArt.wordTags || []).map(t => t.toLowerCase()));
  const profInts  = intentions.map(i => i.toLowerCase());
  const profWords = words.map(w => w.toLowerCase());

  const scored = candidates.map(art => {
    let score = 0;

    // ── 1. Connection to current artwork ───────────────────────────────────────
    (art.themes   || []).forEach(t => { if (curThemes.has(t.toLowerCase())) score += 2.0; });
    (art.wordTags || []).forEach(t => { if (curTags.has(t.toLowerCase()))   score += 1.5; });

    // ── 2. Match with profile intentions ───────────────────────────────────────
    (art.themes || []).forEach(t => {
      const tl = t.toLowerCase();
      if (profInts.some(i => tl.includes(i) || i.includes(tl))) score += 2.5;
    });

    // ── 3. Match with profile word cloud ───────────────────────────────────────
    (art.wordTags || []).forEach(t => {
      const tl = t.toLowerCase();
      if (profWords.some(w => tl.includes(w) || w.includes(tl))) score += 2.0;
    });

    // ── 4. Serendipity factor ──────────────────────────────────────────────────
    const amb = art.ambiguity        || 1;
    const int = art.emotionalIntensity || 1;

    if (serendipity > 0.6) {
      // High serendipity → prefer unexpected (high ambiguity, different period/artist)
      score += amb * serendipity * 1.8;
      if (art.period !== currentArt.period) score += 2.0;
      if (art.artist !== currentArt.artist) score += 1.0;
    } else if (serendipity < 0.4) {
      // Low serendipity → prefer familiar (low ambiguity, same period)
      score += (6 - amb) * (1 - serendipity) * 1.2;
      if (art.period === currentArt.period)  score += 2.0;
      if (art.artist === currentArt.artist)  score += 1.5;
    } else {
      // Mid → balanced, slight bias toward emotional intensity
      score += int * 0.6;
    }

    return { art, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.art ?? null;
}
