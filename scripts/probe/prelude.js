if (!window.__keepSave) localStorage.clear();
dev.start();
dev.step(0.3);
for (let i = 0; i < 6 && game.cutscene; i++) { game.cutscene.finish(true); dev.step(0.2); }
for (let i = 0; i < 4; i++) { const x = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '✕' && b.offsetParent && !b.classList.contains('objective-close')); if (x) { x.click(); dev.step(0.1); } }
for (let i = 0; i < 6 && game.cutscene; i++) { game.cutscene.finish(true); dev.step(0.2); }
const R = game.renderer; R.info.autoReset = false;
const measure = (secs = 0.5) => { R.info.reset(); const t0 = performance.now(); dev.step(1/60); const f = performance.now() - t0; return { calls: R.info.render.calls, tris: R.info.render.triangles, geos: R.info.memory.geometries, tex: R.info.memory.textures, msFrameSW: +f.toFixed(0) }; };
const timeIt = (fn, n = 60) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return +((performance.now() - t0) / n).toFixed(3); };
const RGN = await import('/src/world/regions.ts');
const fastGo = (land, dx, dz, yaw, pitch, dist, hour, frames = 14) => {
  const c = RGN.regionCenter(RGN.REGION_BY_ID[land]);
  game.trav.teleport(c.x + dx, c.z + dz);
  Object.assign(game.trav, { camYaw: yaw, camPitch: pitch, camDist: dist });
  if (hour !== undefined) game.st.minutes = Math.floor(game.st.minutes / 1440) * 1440 + hour * 60;
  dev.step(frames / 60);
};
