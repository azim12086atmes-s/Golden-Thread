# Verification record

2026-10-22, branch `birthday/14-player-celebration`.

Passed:

- `node server/party.test.mjs`: ten tests, including 14 concurrent invitation sessions and 14 SSE streams carrying movement; guest frames contain no private companion identifiers.
- Server checks cover authentication/reconnect, all six game routes, score/proximity checks, private signaling denial, ICE configuration, separate birthday/guest photo bytes, and static path restrictions.
- `node scripts/build-party.mjs` and `node scripts/check-party-build.mjs`: the standalone party builds without installing packages. The output excludes original application/story entry points and invitation credentials.
- JavaScript syntax checks on authored client/server/build files and compiled modules.
- CPU scene construction with a canvas shim: palace floor at 46.72 m, arrival at meadow elevation, all race checkpoint floors and six destination landing heights, scene/world construction, original avatar no-face rules, celebration effects and lantern updates. The built scene contained approximately 355,000 triangles before adding player avatars.

Not verified in this environment:

- GPU rendering and interactive browser play. The execution sandbox rejected both localhost server sockets (`EPERM`) and Chromium startup (`setsockopt: Operation not permitted`). CPU scene checks do not establish visual appearance or frame rate.
- Fourteen real graphical clients or microphones on external networks. WebRTC may require a configured TURN service. The 14-stream test exercises the HTTP handler and SSE projection in process, without network sockets.
- A public deployment. No deployment account is connected. `render.yaml`, `Dockerfile`, and the private invitation generator are prepared; invitations need the actual server origin after deployment.

The shared room and photo album are in memory in one server process. A restart clears them. Download keepsakes before shutting the party down.
