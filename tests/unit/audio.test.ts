import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getSong, songIds } from '../../src/audio/songs';
import { DANCE_STYLES } from '../../src/dance/logic';

/** Every .ts file under a folder. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('the music', () => {
  const src = sources(join(__dirname, '../../src')).map((p) => readFileSync(p, 'utf8')).join('\n');

  it('every map, room and scene plays a song that exists', () => {
    const asked = new Set<string>();
    for (const m of src.matchAll(/music: '([a-z0-9-]+)'/g)) asked.add(m[1]);
    for (const m of src.matchAll(/audio\.music\('([a-z0-9-]+)'/g)) asked.add(m[1]);
    // Tockwood's map music switches between its day and night songs
    if (asked.delete('tockwood')) ['tockwood-day', 'tockwood-night'].forEach((s) => asked.add(s));
    expect(asked.size).toBeGreaterThan(10);
    const known = new Set(songIds());
    expect([...asked].filter((id) => !known.has(id))).toEqual([]);
  });

  it('every dance has its own playable song', () => {
    for (const style of Object.values(DANCE_STYLES)) {
      const song = getSong(style.song);
      expect(song, style.id).toBeTruthy();
      expect(song!.bpm).toBeGreaterThan(60);
    }
  });
});
