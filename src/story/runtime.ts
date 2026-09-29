import { app } from '../app';
import { audio } from '../audio/audio';
import { hud } from '../ui/hud';
import { toast } from '../ui/ui';
import { checkQuests, currentObjective } from './quests';

/** Watches quest progress while playing: celebrates finished steps/quests and updates the HUD. */
export function installQuestRuntime(): void {
  const seen = new Map<string, number>();
  let primed = false;
  app.events.on('data-loaded', () => {
    seen.clear();
    primed = false;
  });
  const tick = () => {
    const d = app.data;
    if (!d || !app.playing) return;
    const res = checkQuests(d, seen);
    if (primed) {
      for (const s of res.steps) {
        toast(s.step.text, { icon: '✔', cls: 'step' });
        audio.sfx('success');
      }
      for (const q of res.quests) {
        toast(`${q.title} — complete!`, { icon: q.icon, cls: 'quest', ms: 3200 });
        audio.sfx('fanfare');
      }
      if (res.steps.length || res.quests.length) app.autosave.request();
    }
    primed = true;
    const obj = currentObjective(d);
    hud.setObjective(obj ? `${obj.step.text}` : null, obj?.quest.icon);
  };
  setInterval(tick, 400);
  app.events.on('play-start', () => setTimeout(tick, 50));
}
