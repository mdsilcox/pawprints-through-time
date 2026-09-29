import { beat, bassline, comp, loop, mel, type Song } from './music';

/**
 * Original compositions for each place. Melodies are written in the step DSL from music.ts
 * (one token per step; "-" holds, "." rests). All written for this game.
 */

const S: Record<string, () => Song> = {};

// ---------------------------------------------------------------- title: a music-box waltz in F
S.title = () => {
  const chords = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'C7', 'F'];
  return {
    id: 'title',
    bpm: 96,
    spb: 2,
    beatsPerBar: 3,
    bars: 8,
    tracks: [
      {
        inst: 'bell',
        vol: 0.9,
        lead: true,
        notes: mel(`
          A4 - C5 - F5 - | E5 - D5 - C5 - | Bb4 - D5 - G5 - | F5 - - - E5 - |
          A4 - C5 - F5 - | A5 - G5 - F5 - | E5 - G5 - Bb4 - | A4 - - - . . `),
      },
      { inst: 'pluck', vol: 0.45, notes: comp(chords, 6, 'waltz', 4, 0.5) },
      { inst: 'bass', vol: 0.7, notes: bassline(chords, 6, 'waltz', 2) },
      { inst: 'pad', vol: 0.5, notes: comp(chords, 6, 'pad', 3, 0.5) },
    ],
  };
};

// ---------------------------------------------------------------- Tockwood by day: sunny marimba stroll
S['tockwood-day'] = () => {
  const halves = ['C', 'C', 'Am', 'Am', 'F', 'F', 'G', 'G', 'C', 'C', 'Am', 'Am', 'Dm', 'G', 'C', 'C'];
  return {
    id: 'tockwood-day',
    bpm: 100,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'marimba',
        vol: 0.85,
        lead: true,
        notes: mel(`
          E5 . G5 . A5 - G5 . | E5 . C5 . D5 - - . | F5 . A5 . C6 - A5 . | G5 - - . . . . . |
          E5 . G5 . A5 - G5 . | C6 . B5 . A5 - G5 . | F5 . E5 . D5 . G5 . | C5 - - - . . . . `),
      },
      { inst: 'pluck', vol: 0.35, notes: comp(halves, 4, 'offbeat', 4, 0.5) },
      { inst: 'bass', vol: 0.65, notes: bassline(halves, 4, 'rootfifth', 2) },
      { vol: 0.35, drums: [...beat('..x...x.', 'shaker', 0.6, 8), ...beat('x.......', 'kick', 0.5, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- Tockwood at night: soft bells and a warm pad
S['tockwood-night'] = () => {
  const chords = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'];
  return {
    id: 'tockwood-night',
    bpm: 78,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'bell',
        vol: 0.7,
        lead: true,
        notes: mel(`
          . . E5 - D5 - C5 - | A4 - - - . . C5 . | E5 - - - G5 - E5 - | D5 - - - . . . . |
          . . E5 - D5 - C5 - | A4 - - - . . F5 . | E5 - D5 - B4 - G4 - | C5 - - - - - . . `),
      },
      { inst: 'pad', vol: 0.8, notes: comp(chords, 8, 'pad', 3, 0.6) },
      { inst: 'bass', vol: 0.45, notes: bassline(chords, 8, 'root', 2) },
    ],
  };
};

// ---------------------------------------------------------------- cozy interiors (cottage, tailor, museum)
S.interior = () => {
  const chords = ['F', 'F', 'C', 'C', 'F', 'Bb', 'C7', 'F'];
  return {
    id: 'interior',
    bpm: 88,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'piano',
        vol: 0.8,
        lead: true,
        notes: mel(`
          C5 . A4 . F4 . A4 . | C5 - D5 - C5 . . . | Bb4 . G4 . E4 . G4 . | Bb4 - C5 - Bb4 . . . |
          A4 . C5 . F5 . E5 . | D5 . Bb4 . G4 . D5 . | C5 . E5 . G5 . E5 . | F5 - - - . . . . `),
      },
      { inst: 'pad', vol: 0.5, notes: comp(chords, 8, 'pad', 3, 0.5) },
      { inst: 'bass', vol: 0.55, notes: bassline(chords, 8, 'rootfifth', 2) },
    ],
  };
};

// ---------------------------------------------------------------- the clocktower: tick-tock mystery
S.clocktower = () => {
  const chords = ['Dm', 'C', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A'];
  return {
    id: 'clocktower',
    bpm: 76,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'bell',
        vol: 0.75,
        lead: true,
        notes: mel(`
          D5 . F5 . A5 . F5 . | C5 . E5 . G5 . E5 . | Bb4 . D5 . F5 . D5 . | A4 . C#5 . E5 - - . |
          F5 . A5 . D6 . A5 . | E5 . G5 . C6 . G5 . | D5 . F5 . Bb5 . F5 . | E5 - C#5 - A4 - - . `),
      },
      { inst: 'pad', vol: 0.6, notes: comp(chords, 8, 'pad', 3, 0.55) },
      { inst: 'bass', vol: 0.5, notes: bassline(chords, 8, 'root', 2) },
      { vol: 0.5, drums: [...beat('x...x...', 'tick', 0.6, 8), ...beat('..x...x.', 'wood', 0.35, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- The Bubbling Burrow: bouncy kitchen tune
S.burrow = () => {
  const halves = ['G', 'G', 'Em', 'Em', 'Am', 'Am', 'D', 'D', 'G', 'G', 'C', 'C', 'Am', 'D', 'G', 'G'];
  return {
    id: 'burrow',
    bpm: 112,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'marimba',
        vol: 0.8,
        lead: true,
        notes: mel(`
          G5 . B5 . D6 . B5 . | A5 . G5 . E5 . . . | C5 . E5 . A5 . G5 . | F#5 . D5 . . . . . |
          G5 . B5 . D6 . B5 . | C6 . B5 . A5 . G5 . | E5 . G5 . F#5 . A5 . | G5 - - - . . . . `),
      },
      { inst: 'pluck', vol: 0.35, notes: comp(halves, 4, 'offbeat', 4, 0.5) },
      { inst: 'bass', vol: 0.6, notes: bassline(halves, 4, 'octave', 2) },
      { vol: 0.35, drums: [...beat('x...x...', 'kick', 0.45, 8), ...beat('..x...x.', 'shaker', 0.5, 8)] },
    ],
  };
};

void loop;

const cache = new Map<string, Song>();
export function getSong(id: string): Song | null {
  if (cache.has(id)) return cache.get(id)!;
  const make = S[id];
  if (!make) return null;
  const song = make();
  cache.set(id, song);
  return song;
}

export function registerSong(id: string, make: () => Song): void {
  S[id] = make;
  cache.delete(id);
}

export function songIds(): string[] {
  return Object.keys(S);
}
