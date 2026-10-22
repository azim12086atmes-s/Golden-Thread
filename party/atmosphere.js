import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Ambience } from '../src/world/Ambience';
import { RegionFX } from '../src/world/RegionFX';
import { SkyFX } from '../src/world/SkyFX';
import { SkyLanterns } from '../src/world/SkyLanterns';

/** The original world's atmosphere and colour pipeline, shared by every party role. */
export class PartyAtmosphere {
  constructor(game) {
    this.game = game;
    this.ambience = new Ambience();
    this.regionFX = new RegionFX();
    this.skyFX = new SkyFX();
    this.lanterns = new SkyLanterns();
    game.scene.add(this.ambience.points, this.regionFX.points, this.skyFX.group, this.lanterns.mesh);
    this.composer = new EffectComposer(game.renderer);
    this.composer.addPass(new RenderPass(game.scene, game.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .32, .45, 1.15);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.regionFX.grade);
    this.composer.addPass(new OutputPass());
    this.quality = 'auto';
    this.low = matchMedia('(pointer: coarse)').matches;
    this.slow = 0;
    this.fast = 0;
    this.setQuality('auto');
  }
  setQuality(quality) {
    this.quality = quality;
    if (quality !== 'auto') this.low = quality === 'low';
    const renderer = this.game.renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio, this.low ? 1 : 1.5));
    renderer.shadowMap.enabled = !this.low;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.bloom.enabled = !this.low;
    this.resize();
  }
  resize() {
    this.composer.setPixelRatio(this.game.renderer.getPixelRatio());
    this.composer.setSize(innerWidth, innerHeight);
    this.bloom.resolution.set(innerWidth / 2, innerHeight / 2);
  }
  update(dt, t, region, party) {
    const g = this.game, celebrating = party?.phase === 'celebration';
    // Everyone shares the same 24-minute clock; the birthday finale holds its starry sky.
    const hour = celebrating ? 21 : (15 + Date.now() / 60000) % 24;
    g.sky.update(hour, g.pos, t, region.id);
    const night = g.sky.night;
    this.ambience.setMode(region.ambient);
    this.ambience.update(dt, g.pos, t, night);
    this.regionFX.setRegion(region.id);
    this.regionFX.update(dt, g.pos, t, night);
    this.lanterns.update(dt, t, g.pos, region.id, night);
    this.skyFX.party = celebrating ? 1 : 0;
    this.skyFX.partyAt.copy(g.scenery.cake.position);
    g.camera.getWorldDirection(this.skyFX.lookDir);
    this.skyFX.update(dt, t, g.pos, region.id, night, g.sky.sunDirection);
    g.sky.moonHidden = this.skyFX.hideMoon;
    // A sustained slow frame rate lowers render cost without dropping world content.
    if (this.quality === 'auto' && t > 15) {
      this.slow = dt > .030 ? this.slow + dt : Math.max(0, this.slow - dt * .5);
      if (!this.low && this.slow > 6) { this.low = true; this.setQuality('auto'); }
    }
    return night;
  }
  render() {
    const view = this.game.life?.view;
    if (view) this.game.renderer.render(view.scene, view.camera);
    else this.composer.render();
  }
  destroy() {
    this.composer.dispose();
    this.bloom.dispose();
    this.regionFX.grade.dispose();
  }
}
