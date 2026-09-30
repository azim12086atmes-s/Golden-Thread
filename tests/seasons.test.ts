import { describe, expect, it } from 'vitest';
import { weatherFor, WEATHER } from '../src/world/Weather';
import { REGIONS } from '../src/world/regions';
import { SEASON_DAYS, TEMPERATE, leafSeason, seasonOf, weatherEvent } from '../src/world/seasons';

describe('the turning year and the weather of the day', () => {
  it('four seasons of a week each, turning round again', () => {
    expect(seasonOf(0)).toBe('spring');
    expect(seasonOf(SEASON_DAYS)).toBe('summer');
    expect(seasonOf(SEASON_DAYS * 2 + 3)).toBe('autumn');
    expect(seasonOf(SEASON_DAYS * 3)).toBe('winter');
    expect(seasonOf(SEASON_DAYS * 4)).toBe('spring');
  });

  it('only the temperate lands turn gold in autumn; the tropics, deserts and the Sky Isles never do', () => {
    expect(leafSeason('london', 'autumn').amount).toBeGreaterThan(0.4);
    expect(leafSeason('london', 'summer').amount).toBe(0);
    for (const id of ['indonesia', 'desert', 'skyisles', 'aurora', 'indiasouth'] as const) {
      expect(TEMPERATE.has(id)).toBe(false);
      expect(leafSeason(id, 'autumn').amount).toBe(0);
    }
  });

  it('each land has its own weather: showers in London, sandstorms in the desert, never a sandstorm in the snow', () => {
    const seen = (land: (typeof REGIONS)[number]['id']) => {
      const s = new Set<string>();
      for (let d = 0; d < 56; d++) for (let h = 0; h < 24; h += 0.5) s.add(weatherEvent(land, d, h));
      return s;
    };
    expect(seen('london').has('shower')).toBe(true);
    expect(seen('desert').has('sandstorm')).toBe(true);
    expect(seen('aurora').has('sandstorm')).toBe(false);
    expect(seen('norway').has('flurry')).toBe(true); // in winter
    // Everyone sees the same sky: the event is a rule of the day, not chance.
    expect(weatherEvent('london', 5, 12)).toBe(weatherEvent('london', 5, 12));
    // Most of the time it is clear.
    let clear = 0, all = 0;
    for (const r of REGIONS) for (let d = 0; d < 28; d++) for (let h = 0; h < 24; h++) { all++; if (weatherEvent(r.id, d, h) === 'none') clear++; }
    expect(clear / all).toBeGreaterThan(0.75);
  });

  it('an event changes how the land looks, and the same event is the same weather each time', () => {
    expect(weatherFor('london', 'none')).toBe(WEATHER.london);
    expect(weatherFor('london', 'shower').kind).toBe('rain');
    expect(weatherFor('london', 'shower')).toBe(weatherFor('london', 'shower'));
    expect(weatherFor('desert', 'sandstorm').amount).toBeGreaterThan(WEATHER.desert.amount);
    expect(weatherFor('switzerland', 'flurry').kind).toBe('snow');
  });
});
