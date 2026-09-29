import { flagDone, registerQuest } from './quests';
import { TW } from '../world/maps/tockwood';

/** Island exploring side quest — teaches walking, reading signs and the pause menu. */
registerQuest({
  id: 'explore-island',
  title: 'Explore Tockwood Isle',
  icon: '🧭',
  chapter: 'side',
  available: () => true,
  steps: [
    { id: 'plaza', text: 'Walk up to the town plaza', done: flagDone('visited:plaza'), where: () => ({ map: 'tockwood', ...TW.plaza }) },
    { id: 'sign', text: 'Read the plaza signpost', done: flagDone('read:plaza-sign'), where: () => ({ map: 'tockwood', x: 28.6, y: 26.4 }) },
    { id: 'beach', text: 'Dip your toes on the south beach', done: flagDone('visited:beach'), where: () => ({ map: 'tockwood', ...TW.beach }) },
    { id: 'meadow', text: 'Find the bunny meadow in the west', done: flagDone('visited:meadow'), where: () => ({ map: 'tockwood', ...TW.meadow }) },
  ],
  reward: '+10 Tockens',
  onComplete: (d) => {
    d.tockens += 10;
  },
});
