import type { Game } from './Game';
import { REGIONS, regionCenter, type RegionId } from './world/regions';

/**
 * Dev-only playtest harness (loaded only under `vite dev`). Steps the game deterministically at
 * 60 fps so scenarios can be driven from the console even when the tab is hidden:
 *
 *   dev.start(); dev.go('japan', 0, 70, Math.PI, 0.2, 18, 16.5); dev.hold(['w'], 2); dev.info()
 */
export function installDev(game: Game): void {
  const g = game as unknown as { frame(): void; clock: { getDelta(): number } };
  const key = (type: 'keydown' | 'keyup', k: string) => dispatchEvent(new KeyboardEvent(type, { key: k }));
  const dev = {
    game,
    /** Fixed-step the loop for `secs` seconds. */
    step(secs: number) {
      const real = g.clock.getDelta.bind(g.clock);
      g.clock.getDelta = () => 1 / 60;
      for (let i = 0; i < secs * 60; i++) g.frame();
      g.clock.getDelta = real;
    },
    hold(keys: string[], secs: number) {
      keys.forEach((k) => key('keydown', k));
      dev.step(secs);
      keys.forEach((k) => key('keyup', k));
      dev.step(1 / 60);
    },
    press(k: string) {
      dev.hold([k], 1 / 30);
    },
    start() {
      (document.querySelector('.title button') as HTMLButtonElement | null)?.click();
    },
    /** Jump to a land, frame the camera, optionally set the hour. */
    go(id: RegionId, dx = 0, dz = 70, yaw = Math.PI, pitch = 0.22, dist = 16, hour?: number) {
      const r = REGIONS.find((x) => x.id === id)!;
      const c = regionCenter(r);
      game.trav.teleport(c.x + dx, c.z + dz);
      Object.assign(game.trav, { camYaw: yaw, camPitch: pitch, camDist: dist });
      if (hour !== undefined) game.st.minutes = Math.floor(game.st.minutes / 1440) * 1440 + hour * 60;
      dev.step(1.2);
      return dev.info();
    },
    info() {
      const t = game.trav;
      return {
        pos: t.gPos.toArray().map((v) => +v.toFixed(1)),
        gap: +t.gPos.distanceTo(t.bPos).toFixed(2),
        mode: t.mode,
        energy: +t.energy.toFixed(2),
        target: game.target?.label ?? null,
        region: game.region.id,
      };
    },
  };
  (window as unknown as { dev: typeof dev }).dev = dev;
}
