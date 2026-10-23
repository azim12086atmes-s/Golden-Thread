# Birthday Castle gameplay inventory

Source reviewed: `azim12086atmes-s/birthday-castle`, branch `game-logic`, pinned commit `3fcc2b4728c51eca871c889fa545c9605d7ad8df`. This is a source inventory, not a runtime test. The compact text reference subset is in [birthday-castle-reference](/workspace/birthday-castle-reference/REFERENCE.md); its configurable access-key values are redacted.

## Active game systems

`js/main.js` constructs the actual game: procedural world, local avatar and controls, peer room, proximity voice, Stardust Hunt and Wish Lanterns, then combat, per-player progress, the Mew, shared quest, cinematic events, and ships. `js/game/quest.js` owns a host-authored shared snapshot (act, shard list, activity, finale and reveal); it saves the same progress locally and broadcasts snapshots/events. The first peer is host; if it leaves peers re-elect. This is peer-to-peer host authority, not a server-authoritative rules engine.

The place data in `data/game-data.json` has 32 named destinations B01–B32, each with a first game and challenge. Their authored pairings include:

- B01 Princess Palace: wardrobe runway / Hush boss.
- B02 Moon Water Palace: lily-pad hop / cooperative moonlight puzzle.
- B05 Misty Keep: hide-and-seek / lantern escort.
- B07 Temple Rotundas: echo memory / configurable heart quiz.
- B08 Colosseum: birthday tournament / Shadow Champion.
- B12 Storybook Village: cake ingredient scramble / build a cake layer.
- B17 Glowwood Ruin: firefly catching / arena defense.
- B19 Lantern Cove: fishing for stars / shadow-ship battle.
- B20 Bridge Pavilions: rippling-step dance / photo hunt.
- B22 Lighthouse: lighthouse-beam tag / guide ships through a storm.
- B31 Butterfly Meadows: pet race / paint the flower field.
- B32 Starfall Fairground: carnival games / fairground finals.

These activity names are not 32 unique implementations. `js/game/activities.js` exports eight reusable template IDs: `harmony_puzzle` (simultaneously light pads), `race` (eight ordered rings and return), `arena_defence` (three waves), `boss_purification` (weak spots, hazards, two phases), `party_game` (bubble pop), `escort` (protect a moving lantern spirit), `gather_build` (pick up and deliver build pieces), and `heart_quiz` (team questions). The data supplies place-specific labels and templates; some activity titles overstate bespoke mechanics. `js/minigames.js` separately provides a 45-shard island-wide hunt (individual score, respawn after 75 seconds) and free-text wish lanterns visible to everyone.

Any player can start a place game near its head with E; first completion advances to that place's challenge, and beating the challenge frees the head and awards its shard once. Host handles the state transition; game actions are relayed events. Party games can be called anywhere from P: there is a 15-second join window when peers are present, then nearby players join via J. A replayed/freed place awards no extra shard. The map/sky ship visits any of the 32 places; before act 4 it carries only the caller, after act 4 it carries the group.

Progress is staged: act 1 is exploration and the first three shards; the honoree profile advances to act 2, a welcome/Mew bond, then the Hush moves the story to act 4. At the birthday time (or after timed play gates on other dates), the Hush breaks the Great Birthday Lantern into 32 shards and greys the world. Act 4 follows a configured 14-place Grand Path; each place requires both activities and sends a shard home. Once path shards are complete, return to B01; scheduled birthday midnight or post-path arrival starts the finale. The finale opens the roof/cake scene and reveals the Mew's human owner. Activities use timers, combat hearts/knockdowns, scores and result screens; local persistent profile/progression includes starlight levels and collectible companion pets with powers (healing, shield, speed, finding/scouting/fetching, and combat assist).

## Birthday and narrative hooks

`js/celebration.js` enables birthday lighting, banner, cake, candles and fireworks based on `CONFIG.celebrationStart`; the welcome camera ride substitutes `CONFIG.honoreeName` into configurable lines. Quest act/finale can also activate celebration behavior. `data/game-data.json` contains five act records and 32 place/head character records; `js/game/cinema.js` plays the arrival, Hush, head-freeing, travel and finale sequences. `js/game/mew.js` implements a hidden flying companion, owner steering/automatic following, gestures and reactions; `quest.js` suppresses the Mew's avatar/profile name until the final reveal.

## Identity, privacy and content surfaces

- `js/config.js` is intended for private personalization: honoree name, welcome/reveal wording, quiz, room ID, and separate honoree/Mew access keys. The checked source contains literal default key values; treat them as exposed credentials and rotate before use. The reference copy redacts them. The quiz schema explicitly invites questions about the honoree and each other, so its author must avoid sensitive personal facts.
- `js/net.js` sends the entire supplied profile to the room host and other peers, with no field allowlist in this transport layer. `main.js` renders profile names, gender/outfit-derived avatars and honoree status; roster, arrival/departure toasts, activity scoreboard and quest result callouts expose names to room participants.
- Wish text is sent as a room event, clipped to 60 characters, and rendered alongside the sender's profile name on a floating lantern. It is visible in the shared scene.
- Narrative copy is explicitly gendered and relational: “ladies arrive,” “men arrive,” “her surprise,” “questions about her,” princess/honoree labels, and a secret owner revealed as the Mew. The configurable reveal default is an intimate first-person line. The Mew premise, hidden owner identity and cutscenes are deliberate roleplay hooks; they are not generic birthday copy.
- Microphone access is opt-in in the UI, but once enabled voice is streamed peer-to-peer and spatially attenuated by distance. PeerJS room IDs and all gameplay/profile events are public to peers in that room; do not treat room IDs as access control.

## Source paths

`js/main.js` is the active browser entry. Gameplay contracts are in `js/game/{quest,activities,progress,places,ship,combat,mew,cinema,clock}.js`; birthday and shared free-play systems are in `js/{celebration,minigames,net,voice,config}.js`; place-level details, act definitions, pets, and quizzes are in `data/game-data.json`. The source snapshot includes those modules but omits the large authored binary asset directories.
