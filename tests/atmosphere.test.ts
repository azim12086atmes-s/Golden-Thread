import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { REGIONS } from '../src/world/regions';
import { LOCALES } from '../src/world/locale';
import { WEATHER } from '../src/world/Weather';

const HEX = /^#[0-9a-f]{6}$/i;

describe("every land's air", () => {
  it('each land has a day haze, a night haze, a sun colour, a fog depth and a night hue', () => {
    for (const r of REGIONS) {
      const a = LOCALES[r.id].atmos;
      expect(a, r.id).toBeDefined();
      for (const c of [a.haze, a.hazeNight, a.sun, a.night]) expect(c, r.id).toMatch(HEX);
      expect(a.near, r.id).toBeGreaterThan(0);
      expect(a.far, r.id).toBeGreaterThan(a.near * 4);
      expect(a.light, r.id).toBeGreaterThan(0.8);
      expect(a.light, r.id).toBeLessThan(1.3);
    }
  });

  it('the nights keep their hues: ice-blue Aurora, sandy desert, lavender Sky Isles', () => {
    const c = (id: keyof typeof LOCALES) => new THREE.Color(LOCALES[id].atmos.night);
    const aurora = c('aurora'), desert = c('desert'), isles = c('skyisles');
    expect(aurora.b).toBeGreaterThan(aurora.r);
    expect(desert.r).toBeGreaterThan(desert.b);
    expect(isles.b).toBeGreaterThan(isles.g);
    expect(isles.r).toBeGreaterThan(isles.g);
  });

  it('the desert is sunnier than London', () => {
    expect(LOCALES.desert.atmos.light).toBeGreaterThan(LOCALES.london.atmos.light);
  });
});

describe('weather you can see the wind in', () => {
  it('every land has weather with a colour, an amount and a night share', () => {
    for (const r of REGIONS) {
      const w = WEATHER[r.id];
      expect(w, r.id).toBeDefined();
      expect(w.color, r.id).toMatch(HEX);
      expect(w.amount, r.id).toBeGreaterThan(0);
      expect(w.amount, r.id).toBeLessThanOrEqual(1);
      expect(w.night, r.id).toBeGreaterThanOrEqual(0);
      expect(w.night, r.id).toBeLessThanOrEqual(1);
    }
  });

  it('dusty wind in the desert, snowy wind over the ice, mist in the Sky Isles', () => {
    expect(WEATHER.desert.kind).toBe('dust');
    expect(WEATHER.aurora.kind).toBe('snow');
    expect(WEATHER.skyisles.kind).toBe('mist');
  });
});
