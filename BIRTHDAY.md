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

## Host the room

GitHub Pages alone cannot enforce private player visibility or run this server. Deploy the branch to a host supporting a persistent Node HTTP service, SSE, and HTTPS. Use **one instance** for the party; the room, scores, and album are held in that process.

For Render, create a Blueprint using this repository and the `birthday/14-player-celebration` branch. The included `render.yaml` selects the Docker service. Set its secret `PARTY_CONFIG_JSON` to the complete contents of your private `party.json`. No npm install or paid game backend is required. A free service may sleep before the party; open an invitation beforehand. A process restart clears round progress and the shared album; download photos you want to retain. No hosting account or paid service is provisioned by committing the branch.

After your host returns its actual HTTPS origin, open the private register and enter that origin in its host field to update every link. Alternatively regenerate using the **same private directory**:

```sh
node scripts/invitations.mjs --out ../starlight-private --base https://YOUR-SERVICE.onrender.com
```

The generator preserves existing tokens. These become the live invitations once that server is deployed; a GitHub branch URL itself is not a playable multiplayer link. For a VPS, `docker build -t starlight .` then run the container with `PARTY_CONFIG_JSON` provided securely by your host and route HTTPS to port 3000. Do not place credentials in a Docker image or commit them.

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

Run the party tests and build checks above. The deployment health endpoint is `/healthz`. Before the party, open separate birthday, observer and guest invitations, test the privacy views and photos, verify microphones on the actual devices/networks, and play one round. API tests exercise 14 participant sessions; they do not establish the frame rate or voice reliability of 14 real devices.
