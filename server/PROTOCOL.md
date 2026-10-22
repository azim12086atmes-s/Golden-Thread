# Party server protocol

Build the web client into `dist/`, create a private invitation file outside this repository, then start the API and static server with `node server/party.mjs /path/to/private-config.json`. `PORT` defaults to `3000`; `HOST` defaults to `0.0.0.0`. Managed hosts can set `PARTY_CONFIG_JSON` to the JSON config instead of mounting a file. `GET /healthz` returns `{ "ok": true }` without session or party details.

The config has a `slots` array with unique `token`, `role` (`birthday`, `companion`, or `guest`), public-friendly `name`, and `avatar`/outfit id. At most 14 slots are accepted, with exactly one birthday slot. Optional `voice.iceServers` is an array of up to eight ICE server entries; each entry has `urls` plus optional `username` and `credential`. `GET /api/voice-config?ticket=...` requires a session ticket and returns only this validated ICE server list. `node server/party.mjs --init /path/outside/repo/party.json [public-base-url]` creates the default 1 birthday, 3 companion, and 10 guest invitations. It writes the file with mode 0600 and prints invitation tokens to the local administrator console once. Optional `celebrationStart` must be an ISO UTC timestamp ending in `Z`; at that time the server starts the 5-second rally countdown.

Invite tokens are only used at join. `POST /api/join` with JSON `{ "token": "..." }` returns `{ "ticket", "expiresAt", "self" }`. The ticket is a random, expiring session credential. Send it as `Authorization: Bearer <ticket>` on all write routes. `GET /api/state?ticket=<ticket>` returns the current recipient-specific state. `GET /api/events?ticket=<ticket>` returns that state as an SSE `state` event and subsequent updates, coalesced to at most 10 updates per second. Rejoining an invitation replaces its old session and event stream. Sessions expire after 30 minutes of inactivity.

All request bodies are JSON and limited to 32 KiB, except photo uploads which allow up to 1 MiB. Positions must be finite: x from -1800 to 1800, y from -30 to 800, z from -1100 to 1800, yaw in radians. Movement accepts at most 10 updates per second. Bridge Dash also caps horizontal movement to prevent teleporting through checkpoints.

## State projection

State frames contain `type`, `self`, `players`, `party`, `signals`, and `wishes`. A player has `id`, public `name`, `avatar`, `isBirthday`, position (`x`, `y`, `z`, `yaw`), and `role` only in the birthday player's view. Birthday sees all players and scores. Companions see themselves, birthday, and guests; guests see themselves, birthday, and guests. Guest score views contain only guest scores; a companion sees only their own companion score. Signals are separately queued, uniquely identified, rate limited, and accepted only when both peers can see each other; guest/companion signaling is rejected. No invite or session config is in state.

`party` has `phase`, `game`, `endsAt`, `celebrationAt`, `rallyAt`, `round`, recipient-specific `scores`, and recipient-specific `selfProgress`. Exported `SPAWN`, `LANTERN_PICKUPS`, `BRIDGE_CHECKPOINTS`, `SKY_RINGS`, `INGREDIENTS`, and `CAKE_SPOT` in `party.mjs` are the client world layout source. Bridge Dash starts at `(0, 0, -178)`, then checkpoints at z `-210, -270, -340, -405, -448`. Sky rings use 3D proximity. Cake Courier tracks one carried and uniquely delivered ingredient per player. Starlight Statues uses six seconds green and four seconds red; a player scores after moving more than three units in green and no more than 0.6 units in red. Celebration state is generic and carries no host name. Wishes have a 140-character limit; birthday sees all wishes and each sender sees their own. Wish entries contain no sender name.

## Routes

- `POST /api/join` `{ "token": string }`
- `GET /api/state?ticket=...`
- `GET /api/events?ticket=...` (SSE)
- `POST /api/move` `{ "x": number, "y": number, "z": number, "yaw": number }`
- `POST /api/action` one of:
  - `{ "type": "start-game", "game": "lantern-hunt" | "bridge-dash" | "starlight-memory" | "sky-rings" | "cake-courier" | "starlight-statues" }` (birthday or companion)
  - `{ "type": "collect", "itemId": "lantern-N" }`
  - `{ "type": "checkpoint", "index": number }` (Bridge Dash or Sky Rings)
  - `{ "type": "submit-sequence", "sequence": number[] }`
  - `{ "type": "pick-ingredient", "index": number }`, `{ "type": "deliver-ingredient" }`
  - `{ "type": "outfit", "avatar": "g-..." | "b-..." }`
  - `{ "type": "celebrate" }`, `{ "type": "rally" }` (birthday or companion)
  - `{ "type": "wish", "text": string }` (up to 140 characters)
- `POST /api/signal` `{ "to": playerId, "kind": "description" | "candidate", "payload": object }` (up to 512 messages per minute per sender)
- `GET /api/voice-config?ticket=...` returns configured ICE servers only.
- `GET /api/photos?ticket=...` returns album metadata only.
- `POST /api/photo` `{ "publicImage": "data:image/jpeg;base64,...", "privateImage"?: "data:image/jpeg;base64,...", "caption"?: string }` stores up to 28 photos in memory. Only a birthday uploader can add a private render. `/api/photo/<id>?ticket=...` serves the private render only to the birthday slot and the public render to every other role.

Static GET/HEAD requests are served only from `dist/`. The server does not expose source files, private config, directory listings, or paths outside the build directory. Album bytes are never included in state or metadata responses.
