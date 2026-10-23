import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { tileGardenInstances } from './render-detail.js';

test('garden tiles preserve every plant transform, colour and full detail close up', () => {
  const root = new THREE.Group(), geometry = new THREE.SphereGeometry(1, 9, 6);
  const source = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 4);
  source.name = 'garden-canopy-masses';
  const matrices = [], colours = [], matrix = new THREE.Matrix4(), colour = new THREE.Color();
  for (let i = 0; i < 4; i++) {
    matrix.makeScale(3, 4, 5).setPosition(i * 200, 900, i * 30);
    source.setMatrixAt(i, matrix); matrices.push([...matrix.elements]);
    source.setColorAt(i, colour.setHSL(i / 4, .5, .5));
    source.getColorAt(i, colour); colours.push([...colour]);
  }
  root.add(source);
  const detail = tileGardenInstances(root);
  assert.equal(detail.tiles.reduce((n, t) => n + t.count, 0), 4);
  const actual = [];
  for (const { full: mesh } of detail.batches) for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix); mesh.getColorAt(i, colour);
    actual.push({ matrix: [...matrix.elements], colour: [...colour] });
    assert.ok(detail.tiles.some(t => t.sphere.containsPoint(new THREE.Vector3().setFromMatrixPosition(matrix))));
  }
  assert.deepEqual(actual.map(a => a.matrix), matrices);
  assert.deepEqual(actual.map(a => a.colour), colours);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 900, 0);
  camera.lookAt(600, 900, 90);
  detail.update(camera, true);
  assert.equal(detail.batches[0].full.geometry, geometry);
  assert.ok(detail.batches[0].far.geometry.index.count < geometry.index.count);
  assert.ok(detail.batches[0].far.count > 0);
  camera.position.set(600, 900, 90); camera.lookAt(0, 900, 0); detail.update(camera, true);
  assert.equal(detail.tiles.at(-1).detailed, true);
});

test('only small distant garden detail is hidden; animated plants and architecture stay intact', () => {
  const root = new THREE.Group(), geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  for (const name of ['garden-tree-branches', 'palace-garden-grass', 'gate']) {
    const mesh = new THREE.InstancedMesh(geometry, material, 1); mesh.name = name;
    mesh.setMatrixAt(0, new THREE.Matrix4()); root.add(mesh);
  }
  const grass = root.getObjectByName('palace-garden-grass'), gate = root.getObjectByName('gate');
  const detail = tileGardenInstances(root), camera = new THREE.PerspectiveCamera();
  camera.position.set(1000, 0, 0); detail.update(camera, true);
  assert.equal(detail.tiles[0].visible, false);
  camera.position.set(0, 0, 0); detail.update(camera, true);
  assert.equal(detail.tiles[0].visible, true);
  assert.equal(root.getObjectByName('palace-garden-grass'), grass);
  assert.equal(root.getObjectByName('gate'), gate);
});
