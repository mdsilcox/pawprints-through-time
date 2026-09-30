import { app } from '../app';
import { audio } from '../audio/audio';
import { hud } from '../ui/hud';
import { toast } from '../ui/ui';
import { checkQuests, currentObjective } from './quests';
import { ui } from '../ui/ui';
import { regionOfMap } from '../world/mapdef';

/** Watches quest progress while playing: celebrates finished steps/quests and updates the HUD. */
export function installQuestRuntime(): void {
  const seen = new Map<string, Set<string>>();
  let primed = false;
  const news: { text: string; icon: string; cls: string; ms: number; sfx: 'success' | 'fanfare' }[] = [];
  let nextNews = 0;
  app.events.on('data-loaded', () => {
    seen.clear();
    primed = false;
    news.length = 0;
  });
  const tick = () => {
    const d = app.data;
    if (!d || !app.playing) return;
    const res = checkQuests(d, seen);
    if (primed) {
      for (const s of res.steps) news.push({ text: s.step.text, icon: '✔', cls: 'step', ms: 2200, sfx: 'success' });
      for (const q of res.quests) news.push({ text: `${q.title} — complete!${q.reward ? ` ${q.reward}` : ''}`, icon: q.icon, cls: 'quest', ms: 3600, sfx: 'fanfare' });
      if (res.steps.length || res.quests.length) app.autosave.request();
    }
    primed = true;
    // (quest news waits until a story scene is over, then comes one at a time)
    if (news.length && !ui.has('cutscene') && !ui.has('dialogue') && performance.now() >= nextNews) {
      const n = news.shift()!;
      toast(n.text, { icon: n.icon, cls: n.cls, ms: n.ms });
      audio.sfx(n.sfx);
      nextNews = performance.now() + 900;
    }
    const obj = currentObjective(d, regionOfMap(d.location.map));
    hud.setObjective(obj ? `${obj.step.text}` : null, obj?.quest.icon);
  };
  setInterval(tick, 400);
  app.events.on('play-start', () => setTimeout(tick, 50));
}
