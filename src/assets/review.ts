import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CharacterModel, HERO_SCALE } from '../characters/CharacterModel';
import { OUTFITS } from '../characters/outfits';

/** Original procedural character review; never touches saved game state. */
export function reviewCharacters(host: HTMLElement): void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ddd6c5');
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 100);
  camera.position.set(0, 1.65, 5.7);
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(renderer.domElement);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,1.0,0);
  controls.minDistance = 0.6;
  controls.maxDistance = 9;
  controls.update();
  scene.add(new THREE.HemisphereLight('#fff6df','#69647c',2.5));
  const sun = new THREE.DirectionalLight('#fff6e8',3); sun.position.set(-3,5,4); scene.add(sun);
  const girl = new CharacterModel(OUTFITS['g-meadow'],'#e3b58f',HERO_SCALE.girl,1,'girl');
  const boy = new CharacterModel(OUTFITS['b-meadow'],'#c99a74',HERO_SCALE.boy,-1,'boy');
  girl.root.position.x = -0.62; boy.root.position.x = 0.62;
  scene.add(girl.root,boy.root);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(3,64),new THREE.MeshStandardMaterial({color:'#c2b99f',roughness:1}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.01; scene.add(ground);
  const panel = document.createElement('aside');
  panel.className = 'asset-review';
  const heading = document.createElement('h1'); heading.textContent = 'The travellers · character review';
  const note = document.createElement('p'); note.textContent = 'Original procedural models. Glasses, pointed beard and curled side quiff. Drag to orbit; scroll to inspect. Hats cover the hair. Blender asset replacement is still pending.';
  panel.append(heading,note);
  for (const [who, model] of [['girl',girl],['boy',boy]] as const) {
    const label = document.createElement('label'); label.textContent = who === 'girl' ? 'Syeda Fathima outfit ' : 'Mohammed Abdul Azim outfit ';
    const select = document.createElement('select'); select.setAttribute('aria-label', who + ' outfit');
    for (const o of Object.values(OUTFITS).filter(o=>o.who===who)) {
      const option = document.createElement('option'); option.value=o.id; option.textContent=o.name; select.append(option);
    }
    select.value=who==='girl'?'g-meadow':'b-meadow'; select.onchange=()=>model.setOutfit(OUTFITS[select.value]);
    label.append(select); panel.append(label);
  }
  const link = document.createElement('a'); link.href='/'; link.textContent='Return to the game'; panel.append(link);
  document.body.append(panel);
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    for (const c of [girl,boy]) c.update(dt,{speed:0,airborne:false,riding:false,t:now/1000});
    controls.update(); renderer.render(scene,camera);
  });
  const resize = () => {
    const top = panel.getBoundingClientRect().bottom + 12;
    const height = Math.max(120, innerHeight - top);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.insetBlockStart = top + 'px';
    camera.aspect = innerWidth / height; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, height);
  };
  new ResizeObserver(resize).observe(panel);
  addEventListener('resize', resize);
  resize();
}
