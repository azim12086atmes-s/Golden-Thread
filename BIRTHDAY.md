# A Night of Starlight

The birthday party is a separate application on `birthday/14-player-celebration`, based on Golden Thread’s existing world. It reuses Birthday Castle’s palace, grand approach, glass gate and mountain backdrop. Original single-player entry points and story scenes are excluded from the party build.

## Run locally (Node 24+, no package installation)

```sh
node scripts/build-party.mjs
node scripts/check-party-build.mjs
npm run party:test
node scripts/invitations.mjs --out ../starlight-private --birthday "Birthday guest" --observer "Observer" --guests 14 --base http://localhost:3000
node server/party.mjs ../starlight-private/party.json
```

Open `../starlight-private/invitations.html` for the organiser’s register. It contains a secret birthday invitation, a secret observer invitation, and 14 example numbered guest links. Send each participant only their own link. Add siblings with repeated `--companion "Name"` arguments. Keep `party.json` and the full register outside the repository and web root. Regenerating in the same directory preserves private tokens. An explicit `--observer` also migrates a matching old companion without changing their token.

The empty page says **Not invited**. A URL such as `https://YOUR-HOST/?guest=27` admits a public guest and optionally asks their name. Any unique number from 0 to 9999999999 works; changing the number changes the guest identity, without editing server config. `--guests` controls how many example links the register lists. Numbered links are deliberately open guest admission, so keep the private links separate. Reopening the same invitation or guest number replaces its previous session.

The default active connection limit is 32, including private attendees, and `maxConnections` supports 14–128. This removes the old fixed 14-slot limit; it is not a performance guarantee for 128 devices. The server accepts up to 64 configured private/legacy invitation slots.

`--date` accepts an ISO timestamp with timezone, for example `2026-10-23T00:00:00+05:30`. Set the intended birthday timezone explicitly; the server uses one shared instant. The birthday guest or private companions can also call everyone to the cake from Play.

## Play online

The live party is available at [starlight-birthday-garden-1023.swiftpika36.chatgpt.site](https://starlight-birthday-garden-1023.swiftpika36.chatgpt.site). It uses the Golden Thread game engine with a Cloudflare Worker room service, D1-backed snapshots and compare-and-swap batched updates, WebSockets, and R2 photo storage. State polls are read-only. The party does not require a hosting signup or make AI calls during play.

The organiser’s private invitation register was regenerated for the live HTTPS origin. Keep `party.json` and the full invitation register outside the repository and web root; never publish private links or tokens in source. Snapshots contain runtime party state only, not invitation tokens or helper credentials. The Sites source lives separately at `/workspace/sites/starlight-birthday`; the deployed source commit is `8dd0589b1f63ff66c8eed685d848e1d788e59a71`.

The standalone Node server remains available for local play or another compatible host. It requires one persistent instance with HTTPS and SSE support; its in-memory room and album clear on restart. For Render, use the included `render.yaml` and Docker service, providing `PARTY_CONFIG_JSON` through the host’s secret settings. For a VPS, build the included Dockerfile and provide that setting securely at runtime. After deployment, set the invitation register’s host field to the actual HTTPS origin. Free services can sleep or restart, so test the chosen host before the event and download photos you want to retain.

## The evening

- **The lost lanterns:** collect twelve lanterns around the meadow, with a shared public hunt and private companion progress.
- **The grand bridge dash:** run through five checkpoints on the approach to the palace.
- **Constellation echoes:** remember and repeat five glowing symbols.
- **A ribbon through the sky:** fly through five rings in order.
- **The cake needs you:** collect and deliver three ingredients, one parcel at a time.
- **Starlight statues:** move on green, freeze on red, and earn stars for clean rounds.
- **Catch a little starlight:** a 90-second game of tag, with proximity, cover and transfer grace checked by the server.
- **Hide-and-seek:** hiders get 20 seconds of hiding time; the seeker cannot move or receive their locations until searching starts, and cover blocks discovery.
- **The light-wand arena:** friendly laser tag with server-checked aiming, cover, three shields, recharge and protection after recharging.

The host can start individual games or the nine-game playlist, then gather everyone at the palace for cake, fireworks and wish lanterns. Tag, hide-and-seek and laser tag require two public players. Hidden companions have private wisp practice rounds; their actions never affect the public arena.

**The Twenty Lights** is a cooperative story across all twenty existing Golden Thread lands. Each chapter has its own narrative, keepsake and three-choice beacon puzzle. One person can recover the keepsake and another can solve its clue; the party shares progress. Story offers individual skyboats and a host gathering button for the current destination. Twenty lights complete the palace birthday crown, followed by a group finale. Minigames remain available between chapters. Private companions have a separate trail so they cannot mysteriously advance public objectives.

Explore includes the original lands and the party’s scenic venues. Outfits reuse the original modest clothing system; characters retain floating heads without eyes. Desktop and touch controls, low/high graphics, local music/effects, optional push-to-talk, and polaroids are included.

## Private views and photos

The server decides visibility from the invitation’s role. It sends guests only the birthday guest and other guests. Private companions and the observer appear to the birthday guest and themselves; other private participants do not receive their presence. Guests’ counts, scores, wishes and voice signaling exclude hidden attendees. There are no shared story scenes or dialogue referring to the original protagonists’ relationship.

The **observer** is a view-only character who follows the birthday guest automatically using Golden Thread’s original following rules (1.95m preferred distance, 1.5m minimum). Only those two clients render their original golden ribbon. The observer cannot move independently, fly, start rounds, play minigames, collect objectives, send wishes or upload photos. Their private microphone reaches only the birthday guest. Their camera can orbit and zoom; local polaroids are available. They follow across flights, skyboat trips and group transfers.

Birthday voice has explicit **Party guests** and **Private voice** channels. A companion’s or observer’s voice can reach only the birthday guest. Microphones are off until permission is granted; speaking uses push-to-talk. Use headphones. WebRTC uses STUN by default: for reliable voice across restrictive mobile/corporate networks, configure a TURN relay in the server’s voice configuration. Permission, device and network conditions affect voice availability; music/effects do not need a voice connection.

Polaroids are rendered from the player’s admitted scene. The birthday guest’s shared photos have two versions: a private image containing hidden attendees and the golden thread, and a guest image rendered without them or private wisp effects. The server chooses the version and does not expose the private photo URL to guests. Guests cannot select a private variant. Companions and the observer can save personal photos locally; they cannot upload their own screenshots to the shared album. Share guest-view exports outside the game.

## Verification

Run the party tests and build checks above. The deployed health endpoint is `/healthz`. Before the party, open separate birthday, observer and guest invitations, test the privacy views and photos, verify microphones on the actual devices/networks, and play one round. API tests exercise 14 participant sessions; they do not establish the frame rate or voice reliability of 14 real devices.
