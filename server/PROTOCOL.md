# Party server protocol

Build the web client into `dist/`, create a private invitation file outside this repository, then start the API and static server with `node server/party.mjs /path/to/private-config.json`. `PORT` defaults to `3000`; `HOST` defaults to `0.0.0.0`. Managed hosts can set `PARTY_CONFIG_JSON` to the JSON config instead of mounting a file. `GET /healthz` returns `{ "ok": true }` without session or party details.

The config has a `slots` array with unique private `token`, `role` (`birthday`, `observer`, `companion`, or legacy `guest`), public-friendly `name`, and `avatar`/outfit id. It accepts 1–64 configured invitation slots, exactly one birthday slot, and at most one observer slot. `maxConnections` is the active-session cap; it defaults to 32 and accepts 14–128. Numbered guests do not require configured slots. Optional `voice.iceServers` is an array of up to eight ICE server entries; each entry has `urls` plus optional `username` and `credential`. `GET /api/voice-config?ticket=...` requires a session ticket and returns only this validated ICE server list. `node server/party.mjs --init /path/outside/repo/party.json [public-base-url]` remains available for a legacy 14-slot setup (1 birthday, 3 companions, 10 guests); it does not create an observer. For new invitations, use `node scripts/invitations.mjs`, which writes the config and private register outside the repository. Optional `celebrationStart` must be an ISO UTC timestamp ending in `Z`; at that time the server starts the 5-second rally countdown.

Invite tokens are used at join. `POST /api/join` with JSON `{ "token": "..." }` returns `{ "ticket", "expiresAt", "self" }`. A dynamic numbered guest can instead join with `{ "guestNumber": "123", "name": "Optional display name" }`; `guestNumber` must be a string of 1–10 decimal digits from `0` through `9999999999`. Leading zeroes are removed before making the stable guest id, so `"0007"` and `"7"` refer to the same guest. Numbered guest links use `/?guest=N`; they carry no private invite token. New sessions count against `maxConnections`, including numbered guests.

The ticket is a random, expiring session credential. Send it as `Authorization: Bearer <ticket>` on write routes. `GET /api/state?ticket=<ticket>` returns recipient-specific state. `GET /api/events?ticket=<ticket>` returns that state as an SSE `state` event and subsequent updates, coalesced to at most 10 updates per second. Rejoining the same private invite or canonical guest number replaces that id's old session and event stream. Sessions expire after 30 minutes of inactivity.

All request bodies are JSON and limited to 32 KiB, except photo uploads which allow up to 1 MiB. Positions must be finite: x from -1800 to 1800, y from -30 to 800, z from -1100 to 1800, yaw in radians. Movement accepts at most 10 updates per second. Bridge Dash and chase games also limit movement to prevent teleporting through checkpoints or the arena.

## State projection and observer access

State frames contain `type`, `self`, `players`, `voicePeers`, `party`, `signals`, and `wishes`. A player has `id`, public `name`, `avatar`, `isBirthday`, and position (`x`, `y`, `z`, `yaw`); `role` is disclosed only in the birthday player's view. `voicePeers` is a separate list containing peer identity fields, without coordinates. Voice signaling is accepted only between visible peers who are allowed on the same voice channel.

Birthday sees the full roster and scores. Companions and guests see themselves, the birthday player, and guests. Observers see themselves, the birthday player, and guests. An observer invitation is view-only: the server moves the observer automatically to follow the birthday player, targeting a 1.95 m gap and enforcing a 1.5 m minimum. Observers cannot move, act, or upload photos; their only write route is voice signaling, and their voice channel connects only to the birthday player. Observers do not see companion identities or receive chase-game state.

Guest score views contain guest scores; a companion sees only their own companion score; birthday sees all scores. Companions receive separate local practice rounds with three wisps during chase games; these practice actions do not affect the public round or other players. Hide-and-seek hides hider positions from the seeker until they are within 18 m and have line of sight. The seeker cannot move during the initial 20-second hiding period. Cover blocks movement and laser sight lines.

`party` includes `phase`, `game`, `endsAt`, `celebrationAt`, `rallyAt`, `round`, recipient-specific `scores` and `selfProgress`, presence, optional chase and journey views, and travel information. Wishes are limited to 140 characters; birthday sees all wishes and each sender sees their own. Wish entries do not include sender names.

## Games and journey

Nine games can be started: Lantern Hunt, Bridge Dash, Starlight Memory, Sky Rings, Cake Courier, Starlight Statues, Tag, Hide and Seek, and Laser Tag. Birthday or a companion can start a game. A shared chase round requires at least two public players (birthday and/or numbered/configured guests); companions play their separate wisp practice round.

Tag lasts 90 seconds; one player starts as “it” and can tag another nearby player with a clear line of sight. Hide and Seek lasts 120 seconds with a 20-second hiding period; the seeker can find visible hiders within range, and hiders win points for remaining hidden. Laser Tag lasts 120 seconds; players have three health, shots travel up to 60 m and stop at cover, and hits apply a short shield or respawn delay. These are playful light effects with no real-world impact.

The optional cooperative birthday story is **The Twenty Lights**. At the palace observatory, the birthday crown has twenty empty constellation points and each of the twenty lands holds one remaining glimmer. Each chapter asks players to collect a keepsake, solve a three-choice clue, and relight that land's beacon. Collection and beacon actions must be within 8 m horizontally and 8 m vertically of the server-defined station. Correct beacon answers advance the route and award two points. Public progress is shared; companions also keep a personal journey view.

The birthday player or a companion can send `{ "type": "start-journey" }` to begin the route. `{ "type": "journey-travel" }` starts a five-second travel countdown, then moves the active party to the current chapter's collector station. Collection and lighting actions are `{ "type": "journey-collect", "chapterId": "..." }` and `{ "type": "journey-light", "chapterId": "...", "answer": 0 }`; the server checks the current chapter, phase, answer, and server-held position. After all twenty lights are complete, `{ "type": "journey-finale" }` starts a five-second rally and brings players to the birthday palace for the celebration finale. Observers remain on their automatic follow path.

The exported `SPAWN`, `LANTERN_PICKUPS`, `BRIDGE_CHECKPOINTS`, `SKY_RINGS`, `INGREDIENTS`, and `CAKE_SPOT` in `party.mjs` are the client world layout source. Bridge Dash starts at `(0, 0, -178)`, then checkpoints at z `-210, -270, -340, -405, -448`. Sky Rings uses 3D proximity. Cake Courier tracks one carried and uniquely delivered ingredient per player. Starlight Statues uses six seconds green and four seconds red; a player scores after moving more than three units in green and no more than 0.6 units in red. Scheduled celebration and rally state contain no configured private token.

## Routes

- `POST /api/join` `{ "token": string }` or `{ "guestNumber": string, "name"?: string }`
- `GET /api/state?ticket=...`
- `GET /api/events?ticket=...` (SSE)
- `POST /api/move` `{ "x": number, "y": number, "z": number, "yaw": number }`
- `POST /api/action` accepts one of:
  - `{ "type": "start-game", "game": "lantern-hunt" | "bridge-dash" | "starlight-memory" | "sky-rings" | "cake-courier" | "starlight-statues" | "tag" | "hide-and-seek" | "laser-tag" }` (birthday or companion)
  - `{ "type": "collect", "itemId": "lantern-N" }`
  - `{ "type": "checkpoint", "index": number }` (Bridge Dash or Sky Rings)
  - `{ "type": "submit-sequence", "sequence": number[] }`
  - `{ "type": "pick-ingredient", "index": number }`, `{ "type": "deliver-ingredient" }`
  - `{ "type": "tag", "targetId": playerId }`, `{ "type": "seek", "targetId": playerId }`, `{ "type": "laser", "direction": { "x": number, "y": number, "z": number } }`
  - `{ "type": "outfit", "avatar": "g-..." | "b-..." }`
  - `{ "type": "start-journey" }`, `{ "type": "journey-travel" }`, `{ "type": "journey-finale" }`
  - `{ "type": "journey-collect", "chapterId": string }`, `{ "type": "journey-light", "chapterId": string, "answer": number }`
  - `{ "type": "celebrate" }`, `{ "type": "rally" }` (birthday or companion)
  - `{ "type": "wish", "text": string }` (up to 140 characters)
- `POST /api/signal` `{ "to": playerId, "kind": "description" | "candidate", "payload": object }` (up to 512 messages per minute per sender)
- `GET /api/voice-config?ticket=...` returns configured ICE servers only.
- `GET /api/photos?ticket=...` returns album metadata only.
- `POST /api/photo` `{ "publicImage": "data:image/jpeg;base64,...", "privateImage"?: "data:image/jpeg;base64,...", "caption"?: string }` stores up to 28 photos in memory. Only a birthday uploader can add a private render. `/api/photo/<id>?ticket=...` serves the private render only to the birthday slot and the public render to every other role.

Static GET/HEAD requests are served only from `dist/`. The server does not expose source files, private config, directory listings, or paths outside the build directory. Album bytes are never included in state or metadata responses. Keep invitation tokens and the private invitation register outside the repository.
