# Hosted birthday room

Live service: https://starlight-birthday-garden-1023.swiftpika36.chatgpt.site

The live deployment uses the same game rules in `server/party.mjs`. The reviewed Worker adapter is `worker.mjs`; its release build prepends that engine and the standalone public asset map. The complete self-contained build is retained in the associated Sites source repository, with release commit `8dd0589b1f63ff66c8eed685d848e1d788e59a71`.

D1 stores recipient-independent room snapshots and album metadata. Compare-and-swap applies batched mutations across isolates; state polls read without writing. Each in-flight request drives its pending work, so later requests do not depend on timers left by completed fetches. WebSocket clients poll for recipient-filtered frames and use RPC for actions/movement/signaling. Acknowledged signaling entries are removed to keep snapshots bounded. R2 keeps the separate public and birthday-only photo bytes.

Runtime values `PARTY_CONFIG_JSON` and `TURN_SHARED_SECRET` are stored as hosted secrets. They are absent from the source and public asset map. The voice endpoint authenticates the session, then issues expiring relay credentials. Its optional free relay uses the Open Relay Project’s documented static-auth service: https://www.metered.ca/tools/openrelay/ . Actual voice availability still depends on devices/networks and relay availability; no paid relay subscription is configured.

The live release passed 41 local rule/storage/audio tests and 14 simultaneous live WebSocket movement/private-visibility checks. It has not been benchmarked on fourteen graphical devices or verified using fourteen microphones. The separate Node server remains usable with its original SSE transport.

No AI requests run during gameplay. Individual invitation links are managed outside the repository; the blank entry deliberately displays Not invited.
