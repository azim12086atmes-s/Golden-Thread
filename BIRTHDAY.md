# A Night of Starlight

The birthday party is a separate application on `birthday/14-player-celebration`, based on Golden Thread’s existing world. It reuses Birthday Castle’s palace, grand approach, glass gate and mountain backdrop. Original single-player entry points and story scenes are excluded from the party build.

## Run locally (Node 24+, no package installation)

```sh
node scripts/build-party.mjs
node scripts/check-party-build.mjs
node server/party.test.mjs
node scripts/invitations.mjs --out ../starlight-private --birthday "Birthday guest" --base http://localhost:3000
node server/party.mjs ../starlight-private/party.json
```

Open `../starlight-private/invitations.html` for the organiser’s register. Send each participant only their own invitation. There are 14 slots by default: one birthday guest, three private companions, and ten other guests. Set `--companions`, repeat `--companion "Name"`, or set `--guests` when first generating invitations. Edit names and outfits in the private `party.json` before starting the server. Keep that file outside the repository and web root. An invitation is a bearer credential; anyone you give it to can occupy that slot. Rejoining a slot replaces its previous connection.

`--date` accepts an ISO timestamp with timezone, for example `2026-10-23T00:00:00+05:30`. Set the intended birthday timezone explicitly; the server uses one shared instant. The birthday guest or private companions can also call everyone to the cake from Play.

## Host the room

GitHub Pages alone cannot enforce private player visibility or run this server. Deploy the branch to a host supporting a persistent Node HTTP service, SSE, and HTTPS. Use **one instance** for the party; the room, scores, and album are held in that process.

For Render, create a Blueprint using this repository and the `birthday/14-player-celebration` branch. The included `render.yaml` selects the Docker service. Set its secret `PARTY_CONFIG_JSON` to the complete contents of your private `party.json`. No npm install or paid game backend is required. A free service may sleep before the party; open an invitation beforehand. A process restart clears round progress and the shared album; download photos you want to retain. No hosting account or paid service is provisioned by committing the branch.

After your host returns its actual HTTPS origin, regenerate the register using the **same private directory**:

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

The host can start individual games or the full playlist, then gather everyone at the palace for cake, fireworks and wish lanterns. Explore includes the original twenty lands and the party’s scenic venues. Outfits reuse the original modest clothing system; characters retain floating heads without eyes. Desktop and touch controls, low/high graphics, local music/effects, optional push-to-talk, and polaroids are included.

## Private views and photos

The server decides visibility from the invitation’s role. It sends guests only the birthday guest and other guests. Private companions appear to the birthday guest and themselves; other companions also do not receive their presence. Guests’ counts, scores, wishes and voice signaling exclude hidden companions. There are no shared story scenes or dialogue referring to the original protagonists’ relationship.

Birthday voice has explicit **Party guests** and **Private companions only** channels. A companion’s voice can reach only the birthday guest. Microphones are off until permission is granted; speaking uses push-to-talk. Use headphones. WebRTC uses STUN by default: for reliable voice across restrictive mobile/corporate networks, configure a TURN relay in the server’s voice configuration. Permission, device and network conditions affect voice availability; music/effects do not need a voice connection.

Polaroids are rendered from the player’s admitted scene. The birthday guest’s shared photos have two versions: a private image containing companions and a guest image rendered without them. The server chooses the version and does not expose the private photo URL to guests. Guests cannot select a private variant. Companions can save personal photos locally; they cannot upload their own screenshots to the shared album. The organiser should share only guest-view exports outside the game. The game cannot edit a screenshot that someone independently shares through another app.

## Verification

Run the server tests and build checks above. The deployment health endpoint is `/healthz`. Before the party, open separate birthday, companion and guest invitations, test the privacy views and photos, verify microphones on the actual devices/networks, and play one round. API tests exercise 14 participant sessions; they do not establish the frame rate or voice reliability of 14 real devices.
