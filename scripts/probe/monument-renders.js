// Capture the 19 historical landmark builders from commit 889faf2.
const quiet = (seconds) => {
  const composer = game.composer, render = composer.render;
  composer.render = () => {};
  dev.step(seconds);
  composer.render = render;
};
const lands = [
  'japan', 'korea', 'china', 'norway', 'switzerland', 'london',
  'newyork', 'renaissance', 'vintage', 'islamic', 'middleeast',
  'desert', 'egypt', 'indianorth', 'indiasouth', 'mughal',
  'indonesia', 'aurora', 'skyisles',
];
const results = [];
for (const land of lands) {
  const centre = RGN.regionCenter(RGN.REGION_BY_ID[land]);
  const tall = land === 'newyork' || land === 'skyisles';
  game.trav.teleport(centre.x, centre.z + (tall ? 145 : 90));
  Object.assign(game.trav, {
    camYaw: Math.PI,
    camPitch: tall ? 0.42 : 0.24,
    camDist: tall ? 70 : 32,
  });
  game.st.minutes = Math.floor(game.st.minutes / 1440) * 1440 + 11 * 60;
  quiet(2);
  dev.step(1 / 60);
  await shot(land);
  results.push(land);
}
return results;
