import { app } from '../app';
import { ask, talk } from '../ui/dialogue';
import { dance } from '../dance/openDance';
import { DANCE_STYLES } from '../dance/logic';
import { flag, onUse, setFlag } from './hooks';

/**
 * Tockwood's dance floor in the plaza: the Tockwood Jig any time, plus every dance learned on
 * your travels. Neighbours come to watch, and rescued Hopkins cousins hop along.
 */
export function knownDances(): string[] {
  const d = app.data!;
  return Object.values(DANCE_STYLES)
    .filter((s) => s.era === 'tockwood' || d.flags[`danced:${s.id}`] || (s.id === 'hornpipe' && d.flags['crew:respect']) || (s.id === 'sockhop' && d.flags['rosita:arrived']))
    .map((s) => s.id);
}

onUse('dance-floor', async () => {
  const d = app.data!;
  // (before you've met Pip, the storyteller does the talking)
  const guide = flag('met:pip') ? 'pip' : 'narrator';
  if (!flag('dancefloor:seen')) {
    setFlag('dancefloor:seen');
    if (guide === 'pip') await talk('pip', ['Tockwood’s dance floor! On warm evenings the whole village dances here.', 'Biscuit knows all the steps. Well... he knows the bouncing.']);
    else await talk('narrator', ['Tockwood’s dance floor! On warm evenings the whole village dances here.', 'Biscuit wags his whole back end. He knows all the steps — well, he knows the bouncing.']);
  }
  const styles = knownDances();
  let style = styles[0];
  if (styles.length > 1) {
    const pick = await ask(guide, 'Which dance shall we do?', [...styles.map((id) => DANCE_STYLES[id].name), 'Not now']);
    if (pick < 0 || pick >= styles.length) return;
    style = styles[pick];
  }
  const audience = ['bramble', 'juniper', 'rocco'];
  if (d.flags['marigold:friend']) audience.push('marigold');
  await dance({ style, audience, bunnies: d.bunnies.slice(0, 6), title: `💃 ${DANCE_STYLES[style].name}`, blurb: 'The neighbours have come to watch — and Biscuit is ready to boogie!' });
});
