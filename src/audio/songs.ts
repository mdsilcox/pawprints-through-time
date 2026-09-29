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

// ---------------------------------------------------------------- Sandy Cove: a jolly sea jig in D (6/8)
S.pirate = () => {
  const bars = ['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D'];
  return {
    id: 'pirate',
    bpm: 116,
    spb: 3,
    beatsPerBar: 2,
    bars: 8,
    tracks: [
      {
        inst: 'fiddle',
        vol: 0.8,
        lead: true,
        notes: mel(`
          D5 - F#5 A5 - F#5 | G5 - B5 D6 - B5 | A5 - F#5 D5 - F#5 | E5 - - A4 - . |
          D5 - F#5 A5 - D6 | B5 - G5 E5 - G5 | A5 - G5 F#5 - E5 | D5 - - - . . `),
      },
      { inst: 'accordion', vol: 0.4, notes: comp(bars, 6, 'offbeat', 4, 0.5) },
      { inst: 'bass', vol: 0.65, notes: bassline(bars, 6, 'rootfifth', 2) },
      { vol: 0.4, drums: [...beat('x..x..', 'kick', 0.5, 8), ...beat('..x..x', 'shaker', 0.55, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- the hornpipe dance-off: a bouncy 4/4 sailor's dance in D
S.hornpipe = () => {
  const bars = ['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D'];
  return {
    id: 'hornpipe',
    bpm: 112,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'fiddle',
        vol: 0.85,
        lead: true,
        notes: mel(`
          D5 - F#5 A5 D6 - A5 F#5 | G5 - B5 D6 E6 - D6 B5 | A5 - F#5 D5 E5 F#5 G5 E5 | F#5 - D5 - A4 - . . |
          D5 - F#5 A5 B5 - A5 F#5 | G5 A5 B5 G5 E5 - C#5 E5 | D5 F#5 E5 C#5 A4 - B4 C#5 | D5! - A4! - D5! - . . `),
      },
      { inst: 'accordion', vol: 0.42, notes: comp(bars, 8, 'offbeat', 4, 0.5) },
      { inst: 'bass', vol: 0.7, notes: bassline(bars, 8, 'rootfifth', 2) },
      { vol: 0.45, drums: [...beat('x...x...', 'kick', 0.55, 8), ...beat('..x...x.', 'stomp', 0.5, 8), ...beat('xxxxxxxx', 'shaker', 0.3, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- the dance floor at home: Tockwood's own little jig (plaza dancing)
S['plaza-dance'] = () => {
  const bars = ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'];
  return {
    id: 'plaza-dance',
    bpm: 108,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'marimba',
        vol: 0.85,
        lead: true,
        notes: mel(`
          C5 - E5 G5 C6 - G5 E5 | F5 - A5 C6 A5 - F5 A5 | G5 - B4 D5 G5 - F5 D5 | E5 - C5 - G4 - . . |
          A4 - C5 E5 A5 - E5 C5 | F5 - A5 G5 F5 - E5 D5 | B4 D5 G5 F5 D5 - B4 D5 | C5! - G4! - C5! - . . `),
      },
      { inst: 'pluck', vol: 0.4, notes: comp(bars, 8, 'offbeat', 4, 0.5) },
      { inst: 'bass', vol: 0.65, notes: bassline(bars, 8, 'rootfifth', 2) },
      { vol: 0.42, drums: [...beat('x...x...', 'kick', 0.5, 8), ...beat('..x...x.', 'clap', 0.45, 8), ...beat('.x.x.x.x', 'shaker', 0.3, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- Maple Street, 1957: a swinging doo-wop stroll in C
S.fifties = () => {
  const bars = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'];
  return {
    id: 'fifties',
    bpm: 96,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    swing: 0.28,
    tracks: [
      {
        inst: 'piano',
        vol: 0.8,
        lead: true,
        notes: mel(`
          E5 - G5 - C6 - B5 A5 | A5 - - - E5 - G5 - | F5 - A5 - C6 - A5 F5 | G5 - - - D5 - . . |
          E5 - G5 - C6 - D6 E6 | C6 - A5 - E5 - A5 - | F5 G5 A5 C6 B5 - A5 G5 | G5 - - - . . . . `),
      },
      { inst: 'organ', vol: 0.32, notes: comp(bars, 8, 'pad', 4, 0.45) },
      { inst: 'bass', vol: 0.7, notes: bassline(bars, 8, 'walk', 2) },
      { vol: 0.4, drums: [...beat('.x.x.x.x', 'hat', 0.4, 8), ...beat('..x...x.', 'snare', 0.35, 8), ...beat('x...x...', 'kick', 0.5, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- the Starlight Lanes: boogie-woogie piano in G
S.bowling = () => {
  const bars = ['G', 'G', 'C', 'G', 'D', 'C', 'G', 'D'];
  return {
    id: 'bowling',
    bpm: 126,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    swing: 0.25,
    tracks: [
      {
        inst: 'piano',
        vol: 0.75,
        lead: true,
        notes: mel(`
          G4 B4 D5 E5 F5 E5 D5 B4 | G4 B4 D5 E5 F5 E5 D5 B4 | C5 E5 G5 A5 Bb5 A5 G5 E5 | G4 B4 D5 E5 F5 E5 D5 B4 |
          D5 F#5 A5 B5 C6 B5 A5 F#5 | C5 E5 G5 A5 Bb5 A5 G5 E5 | G4 - B4 - D5 - G5 - | D5 - F#5 - A5 - . . `),
      },
      { inst: 'piano', vol: 0.35, notes: comp(bars, 8, 'boogie', 3, 0.5) },
      { inst: 'bass', vol: 0.7, notes: bassline(bars, 8, 'walk', 2) },
      { vol: 0.42, drums: [...beat('x.x.x.x.', 'hat', 0.35, 8), ...beat('..x...x.', 'snare', 0.4, 8), ...beat('x...x...', 'kick', 0.5, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- the sock hop: twelve-bar rock and roll in A (sax lead)
S.sockhop = () => {
  const bars = ['A', 'A', 'A', 'A', 'D', 'D', 'A', 'A', 'E', 'D', 'A', 'E'];
  return {
    id: 'sockhop',
    bpm: 140,
    spb: 2,
    beatsPerBar: 4,
    bars: 12,
    tracks: [
      {
        inst: 'sax',
        vol: 0.8,
        lead: true,
        notes: mel(`
          A4 - C#5 E5 A5 - E5 C#5 | A4 - C#5 E5 F#5 - E5 C#5 | A4 - C#5 E5 A5 - B5 A5 | G5 - E5 - C#5 - . . |
          D5 - F#5 A5 D6 - A5 F#5 | D5 - F#5 A5 B5 - A5 F#5 | A4 - C#5 E5 A5 - E5 C#5 | A5 - - - . . . . |
          E5 - G#5 B5 E6 - B5 G#5 | D5 - F#5 A5 D6 - A5 F#5 | A4 - C#5 E5 A5 - E5 C#5 | E5 - B4 - E5! - . . `),
      },
      { inst: 'piano', vol: 0.36, notes: comp(bars, 8, 'boogie', 3, 0.5) },
      { inst: 'bass', vol: 0.72, notes: bassline(bars, 8, 'walk', 2) },
      { vol: 0.45, drums: [...beat('x...x...', 'kick', 0.55, 12), ...beat('..x...x.', 'snare', 0.45, 12), ...beat('xxxxxxxx', 'hat', 0.28, 12), ...beat('..x...x.', 'clap', 0.3, 12)] },
    ],
  };
};

// ---------------------------------------------------------------- Giza: a ney melody over oud and hand drums, in the Hijaz mode on D
S.egypt = () => {
  const bars = ['D', 'D', 'Gm', 'D', 'Cm', 'D', 'Eb', 'D'];
  return {
    id: 'egypt',
    bpm: 92,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'ney',
        vol: 0.8,
        lead: true,
        notes: mel(`
          D5 - Eb5 F#5 G5 - F#5 Eb5 | D5 - - - . . A4 - | Bb4 - A4 G4 F#4 - G4 A4 | D5 - - - . . . . |
          A5 - G5 F#5 G5 - F#5 Eb5 | F#5 - Eb5 D5 Eb5 - . . | C5 - Bb4 A4 Bb4 C5 Eb5 - | D5 - - - - - . . `),
      },
      { inst: 'oud', vol: 0.42, notes: comp(bars, 8, 'arp', 3, 0.5) },
      { inst: 'bass', vol: 0.6, notes: bassline(bars, 8, 'root', 2) },
      { vol: 0.42, drums: [...beat('x...x...', 'doum', 0.6, 8), ...beat('.x.x..x.', 'tek', 0.42, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- the builders' festival: a quick, joyful dance tune (Hijaz on D)
S.festival = () => {
  const bars = ['D', 'Eb', 'Gm', 'D', 'Gm', 'Cm', 'Eb', 'D'];
  return {
    id: 'festival',
    bpm: 118,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'ney',
        vol: 0.82,
        lead: true,
        notes: mel(`
          D5 F#5 G5 A5 G5 F#5 Eb5 D5 | Eb5 F#5 G5 F#5 Eb5 - D5 - | A5 - Bb5 A5 G5 A5 F#5 G5 | A5 - - - . . . . |
          D6 - A5 - Bb5 A5 G5 F#5 | G5 F#5 Eb5 D5 C5 - D5 - | G5 A5 G5 F#5 Eb5 F#5 Eb5 D5 | D5 - D5! - D5 - . . `),
      },
      { inst: 'oud', vol: 0.4, notes: comp(bars, 8, 'offbeat', 4, 0.5) },
      { inst: 'bass', vol: 0.66, notes: bassline(bars, 8, 'rootfifth', 2) },
      { vol: 0.5, drums: [...beat('X..xx.x.', 'doum', 0.62, 8), ...beat('.x.x.xx.', 'tek', 0.45, 8), ...beat('xxxxxxxx', 'tamb', 0.25, 8), ...beat('....x...', 'clap', 0.35, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- Florence: a gentle lute pavane with a recorder tune, in D minor
S.florence = () => {
  const bars = ['Dm', 'C', 'Bb', 'A', 'Dm', 'F', 'C', 'Dm'];
  return {
    id: 'florence',
    bpm: 96,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'recorder',
        vol: 0.78,
        lead: true,
        notes: mel(`
          D5 - F5 - A5 - G5 F5 | E5 - - - C5 - D5 E5 | F5 - D5 - Bb4 - C5 D5 | C#5 - - - A4 - - - |
          D5 - F5 - A5 - D6 C6 | Bb5 - A5 G5 A5 - F5 - | G5 - E5 C5 E5 - D5 C#5 | D5 - - - - - . . `),
      },
      { inst: 'lute', vol: 0.45, notes: comp(bars, 8, 'arp', 3, 0.5) },
      { inst: 'bass', vol: 0.55, notes: bassline(bars, 8, 'root', 2) },
      { vol: 0.3, drums: [...beat('x.......', 'tamb', 0.35, 8), ...beat('....x...', 'wood', 0.3, 8)] },
    ],
  };
};

// ---------------------------------------------------------------- the Duchess's court dance: a stately-then-merry tune on lute and recorder
S.court = () => {
  const bars = ['F', 'C', 'Dm', 'C', 'F', 'Bb', 'C', 'F'];
  return {
    id: 'court',
    bpm: 108,
    spb: 2,
    beatsPerBar: 4,
    bars: 8,
    tracks: [
      {
        inst: 'recorder',
        vol: 0.8,
        lead: true,
        notes: mel(`
          F5 - A5 - C6 - A5 - | G5 - E5 - C5 - - - | D5 - F5 - A5 - G5 F5 | E5 - G5 - C5 - . . |
          F5 G5 A5 Bb5 C6 - A5 - | Bb5 - G5 - D5 - F5 - | E5 F5 G5 A5 G5 - E5 - | F5 - C5! - F5! - . . `),
      },
      { inst: 'lute', vol: 0.42, notes: comp(bars, 8, 'strum', 3, 0.5) },
      { inst: 'bass', vol: 0.62, notes: bassline(bars, 8, 'rootfifth', 2) },
      { vol: 0.42, drums: [...beat('x...x...', 'kick', 0.4, 8), ...beat('..x...x.', 'tamb', 0.36, 8), ...beat('x.x.x.x.', 'wood', 0.22, 8)] },
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
