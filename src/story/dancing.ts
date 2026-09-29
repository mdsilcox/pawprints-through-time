import { app } from '../app';
import { ask, talk } from '../ui/dialogue';
import { dance } from '../dance/openDance';
import { DANCE_STYLES } from '../dance/logic';
import { flag, onUse, setFlag } from './hooks';
import { finaleDance } from './finale';

/**
 * Tockwood's dance floor in the plaza: the Tockwood Jig any time, plus every dance learned on
 * your travels. Neighbours come to watch, and rescued Hopkins cousins hop along.
 */
export function knownDances(): string[] {
  const d = app.data!;
  const learned = Object.values(DANCE_STYLES)
    .filter((s) => d.flags[`danced:${s.id}`] || (s.id === 'hornpipe' && d.flags['crew:respect']) || (s.id === 'sockhop' && d.flags['rosita:arrived']))
    .map((s) => s.id);
  // the Tockwood Jig first; the Bunny Hop joins the list once the whole town has danced it at the party
  return ['jig', ...learned.filter((id) => id !== 'jig')];
}

onUse('dance-floor', async ({ world }) => {
  const d = app.data!;
  if (flag('finale:party') && !flag('finale:done')) {
    await finaleDance(world);
    return;
  }
  // (before you've met Pip, the storyteller does the talking)
  const guide = flag('met:pip') ? 'pip' : 'narrator';
  if (!flag('dancefloor:seen')) {
    setFlag('dancefloor:seen');
    if (guide === 'pip') await talk('pip', ['Tockwood’s dance floor! On warm evenings the whole village dances here.', 'Biscuit knows all the steps. Well... he knows the bouncing.']);
    else await talk('narrator', ['Tockwood’s dance floor! On warm evenings the whole village dances here.', 'A golden star in the middle of the floor seems to say: step right up and give it a whirl!']);
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
