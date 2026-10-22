# Verification record

2026-10-22, live Site: [starlight-birthday-garden-1023.swiftpika36.chatgpt.site](https://starlight-birthday-garden-1023.swiftpika36.chatgpt.site). The separate Sites source commit is `8dd0589b1f63ff66c8eed685d848e1d788e59a71`.

Passed:

- Party rules: 41 tests across the core (19), chase games (10), story (4), audio (3), and Worker service (5).
- Authentication and reconnect, numeric guest admission without role escalation, configurable active connection cap, 14 simultaneous invitation sessions and 14 SSE streams carrying movement.
- Privacy projections exclude hidden companions and the observer from guest frames, counts, scores, signaling and game targets. The observer cannot send movement/actions/photos, follows with the original 1.95m preferred/1.5m minimum separation, and remains visible to the birthday player during all three arena games.
- All nine game routes, range checks, cover, tag grace/cooldown, seeker countdown and hidden locations, laser ray hits/shields/recharge, private wisp practice, all twenty cooperative story chapters, stale-action rejection, private story progress and palace finale.
- Separate birthday/guest photo bytes, private upload denial, static path restrictions, validated ICE configuration, and microphone track routing that mutes during channel changes and removes public tracks when the birthday player switches to private voice.
- `node scripts/build-party.mjs` and `node scripts/check-party-build.mjs`: standalone build with no package installation, 41 emitted files, excluding original application/story entry points and private invitations.
- JavaScript syntax checks on authored and compiled client/server/build modules.
- CPU scene construction with a canvas shim: palace floor at 46.72m, meadow arrival, all race checkpoint floors, all six venue landings, all 40 story stations checked for usable height/building clearance, original golden ribbon construction, arena layers, original character no-face rules, celebration effects and lantern updates. This traversal built about 525,000 triangles across the loaded world and venue meshes; it does not measure a typical rendered frame.
- Invitation-generator creation/migration checks preserve private tokens and convert the requested existing companion into a view-only observer. Existing private register regenerated successfully with four private invitations and fourteen numbered guest examples.
- Live API checks passed for birthday, observer, and fourteen ordinary guest invitations (all HTTP 200). The guest roster reports fifteen public players (fourteen guests and the birthday player) and omits the observer; the birthday view reports sixteen attendees. A shared tag round and the observer’s forbidden action response (403) were checked against the live service.
- Fourteen simultaneous live WebSocket connections passed five movement acknowledgements and five private-visibility state checks each after the palace transfer completed.
- The optional free TURN fallback issues expiring HMAC credentials without exposing its shared secret; its credential rules pass a unit test. Actual relay/media connectivity has not been verified from the players’ networks.
- The deployed Worker uses D1 snapshots with compare-and-swap batched mutation, read-only state polls, WebSockets, and R2 public/private photo storage. Private invitation tokens are not stored in snapshots.

Not verified in this environment:

- GPU rendering and interactive browser play. The execution sandbox rejected localhost server sockets (`EPERM`) and Chromium startup (`setsockopt: Operation not permitted`). CPU scene checks do not establish visual appearance or frame rate.
- Fourteen real graphical clients or microphones on external networks. WebRTC may require a configured TURN service. The 14-stream test exercises the HTTP handler and SSE projection in process, without network sockets.
- Original `npm test`/`npm run typecheck`: original development dependencies are not installed here. The separate party build uses Node’s built-in TypeScript stripping and passed its own syntax/import/rules checks.

The standalone Node fallback keeps its room state and album in one server process; a restart clears them. The hosted Worker stores snapshots in D1 and photos in R2.
