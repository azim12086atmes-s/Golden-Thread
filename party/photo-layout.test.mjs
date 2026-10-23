import test from 'node:test';
import assert from 'node:assert/strict';
import { photoLayout } from './photo-layout.js';

test('portrait and landscape polaroids preserve the complete view aspect ratio', () => {
  for (const [width, height] of [[390,844],[844,390],[1920,1080],[1080,2400],[195,422]]) {
    const frame = photoLayout(width, height);
    assert.ok(Math.abs(frame.imageWidth / frame.imageHeight - width / height) < .002);
    assert.ok(Math.max(frame.imageWidth, frame.imageHeight) <= 1440);
    assert.equal(frame.width, frame.imageWidth + frame.border * 2);
    assert.equal(frame.height, frame.imageHeight + frame.border + frame.caption);
  }
});
