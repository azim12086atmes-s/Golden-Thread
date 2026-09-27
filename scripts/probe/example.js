const quiet = (secs) => { const c = game.composer, r = c.render; c.render = () => {}; dev.step(secs); c.render = r; };
const go = async (name, land, dx, dz, yaw, pitch, dist, hour) => {
  const c = RGN.regionCenter(RGN.REGION_BY_ID[land]);
  game.trav.teleport(c.x + dx, c.z + dz);
  Object.assign(game.trav, { camYaw: yaw, camPitch: pitch, camDist: dist });
  game.st.minutes = Math.floor(game.st.minutes / 1440) * 1440 + hour * 60;
  quiet(3);
  dev.step(1 / 60);
  await shot(name);
};
await go('trad-crown', 'meadow', 0, 60, 0.3, 0.05, 3.2, 11);
await go('trad-japan', 'japan', 14, 90, Math.PI + 0.9, 0.1, 12, 11);
await go('trad-islamic', 'islamic', 14, 90, Math.PI + 0.9, 0.1, 12, 11);
await go('trad-haveli', 'indianorth', 14, 90, Math.PI + 0.9, 0.1, 12, 17);
await go('trad-aurora', 'aurora', 14, 90, Math.PI + 0.9, 0.1, 12, 21);
return 'ok';
