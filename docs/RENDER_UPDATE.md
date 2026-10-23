# Birthday rendering and play update

Garden plants keep their exact placement, colours and close-up geometry. Bounded tiles are tested against the camera, then visible instances are packed into shared near/far draws. Distant canopy and hedge geometry is simpler; fine branches and bed curbs are skipped at distance. Collision, terrain height, gates, terraces, original world layout and textures are unchanged. Optional party crowd limits affect decorative figures only. The original single-player defaults remain intact.

Low party graphics retain a small wind-animated grass and flower window using the original painted atlases; other graphics modes retain the full original rings. Palace haze is gentle (1000–5000 metres), with no full-screen blur pass.

Polaroids fit the entire portrait or landscape drawing buffer into a matching paper frame. The preview and album keep the image’s native proportions. Public/private photo filtering is unchanged.

Guests can start shared games between rounds; server checks prevent interrupting a running round or transfer. All players enter the round together. Host celebration controls remain reserved, and observer links stay view-only. Play cards show an explicit action and explain the two-player requirement for chase games.

Validation includes instance transform/colour preservation and culling, photo aspect ratios, guest start/restart permissions, privacy, all nine game-launch buttons in a phone viewport, and a scored constellation submission using button taps. Rendering counters from a fixed palace overview fell from 2,053,576 to 1,232,378 triangles (about 40%) and 1,456 to 1,294 draw calls; this is not a real-phone FPS measurement.
