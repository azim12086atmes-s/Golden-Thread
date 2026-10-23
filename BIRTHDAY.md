# The complete Golden Thread birthday world

The birthday branch is `birthday/complete-golden-world`. It uses the current Golden Thread `Game`, all twenty original lands, its complete wardrobe and progression, and the large Birthday Castle palace at its original scale. The palace sits north of the existing world and connects through the SkyBridge. Nine multiplayer minigames, the cooperative Twenty Lights story and the shared birthday finale are available from Play.

## Run the party

Use Node 24 or newer. The party build and server require no package installation.

```sh
node scripts/fetch-palace-assets.mjs
node scripts/build-party.mjs
node scripts/check-party-build.mjs
node scripts/invitations.mjs --out ../starlight-private --birthday "Birthday guest" --observer "AbdulAzim" --guests 14 --base http://localhost:3000
node server/party.mjs ../starlight-private/party.json
```

The invitation generator preserves tokens when the output directory already exists. Add private siblings with repeated `--companion "Name"` arguments. Keep the resulting configuration and invitation register outside the repository and public files. For an existing hosted room, retain its configuration and invitation tokens.

The organiser's register has separate birthday, observer, private companion and numbered guest links. The bare URL displays **Not invited**. Public links use `/?guest=1`, `/?guest=2` and any other distinct number of up to ten digits. Reusing a number replaces that guest's session. The default connection limit is 32, including private attendees; configuration supports 14–128 connections.

Only the birthday view shows AbdulAzim, her golden thread and private siblings. AbdulAzim follows her automatically, cannot play and can speak only to her. The birthday album retains her private polaroid; other guests receive its separately rendered public variant. Guests never receive private companions in the room projection.

## Host the party

The Dockerfile and Render blueprint build this branch and verify the four pinned palace terrain files. Supply the private configuration through `PARTY_CONFIG_JSON` in the host's secret settings. The Node service needs one persistent HTTPS instance with server-sent events support. Its room and album are held in memory and clear on restart; the existing free Sites host has a separate durable room implementation.

This branch is not automatically the live site. Keep existing invitations until the validated build is published to their host. The browser review workflow captures the actual game and checks eighteen simultaneous sessions with fourteen visible public players; this does not measure fourteen real devices or cross-network voice quality.

See [integration details](docs/BIRTHDAY-INTEGRATION.md) for source provenance and preservation checks.
