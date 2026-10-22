# Verification record

2026-10-22, branch `birthday/14-player-celebration`.

Passed:

- Party rules: 34 tests across `server/party.test.mjs` (17), `server/chase-games.test.mjs` (10), `shared/story.test.mjs` (4), and `party/audio.test.mjs` (3).
- Authentication and reconnect, numeric guest admission without role escalation, configurable active connection cap, 14 simultaneous invitation sessions and 14 SSE streams carrying movement.
- Privacy projections exclude hidden companions and the observer from guest frames, counts, scores, signaling and game targets. The observer cannot send movement/actions/photos, follows with the original 1.95m preferred/1.5m minimum separation, and remains visible to the birthday player during all three arena games.
- All nine game routes, range checks, cover, tag grace/cooldown, seeker countdown and hidden locations, laser ray hits/shields/recharge, private wisp practice, all twenty cooperative story chapters, stale-action rejection, private story progress and palace finale.
- Separate birthday/guest photo bytes, private upload denial, static path restrictions, validated ICE configuration, and microphone track routing that mutes during channel changes and removes public tracks when the birthday player switches to private voice.
- `node scripts/build-party.mjs` and `node scripts/check-party-build.mjs`: standalone build with no package installation, 41 emitted files, excluding original application/story entry points and private invitations.
- JavaScript syntax checks on authored and compiled client/server/build modules.
- CPU scene construction with a canvas shim: palace floor at 46.72m, meadow arrival, all race checkpoint floors, all six venue landings, all 40 story stations checked for usable height/building clearance, original golden ribbon construction, arena layers, original character no-face rules, celebration effects and lantern updates. This traversal built about 525,000 triangles across the loaded world and venue meshes; it does not measure a typical rendered frame.
- Invitation-generator creation/migration checks preserve private tokens and convert the requested existing companion into a view-only observer. Existing private register regenerated successfully with four private invitations and fourteen numbered guest examples.

Not verified in this environment:

- GPU rendering and interactive browser play. The execution sandbox rejected localhost server sockets (`EPERM`) and Chromium startup (`setsockopt: Operation not permitted`). CPU scene checks do not establish visual appearance or frame rate.
- Fourteen real graphical clients or microphones on external networks. WebRTC may require a configured TURN service. The 14-stream test exercises the HTTP handler and SSE projection in process, without network sockets.
- A public multiplayer deployment. No compatible Node hosting account is connected. `render.yaml`, `Dockerfile`, and the private invitation generator are prepared; live invitations require the actual server origin after deployment.
- Original `npm test`/`npm run typecheck`: original development dependencies are not installed here. The separate party build uses Node’s built-in TypeScript stripping and passed its own syntax/import/rules checks.

The shared room and photo album are held in one server process. A restart clears them. Download keepsakes before shutting the party down.
