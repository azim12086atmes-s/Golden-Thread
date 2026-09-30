import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ownsHome } from '../src/charity/charity';
import { newGame } from '../src/core/state';
import { DESIGN_LANDS, MAX_HOUSE_R, MAX_LEVEL, buildCost, buildDesign, designById, designsOf, houseOn, levelOf, upgradeHouse } from '../src/housing/designs';
import { buildDecor } from '../src/housing/HousingView';
import { PLOTS } from '../src/world/plots';

describe('build any house in the world on your land', () => {
  it('the catalogue holds every land\'s houses, each one different and each fitting a plot', () => {
    let all = 0;
    for (const land of DESIGN_LANDS) {
      const list = designsOf(land);
      expect(list.length, land).toBeGreaterThanOrEqual(1);
      expect(new Set(list.map((d) => d.id)).size).toBe(list.length);
      for (const d of list) {
        expect(d.r, d.id).toBeLessThanOrEqual(MAX_HOUSE_R);
        expect(designById(d.id)).toBe(d);
      }
      all += list.length;
    }
    expect(all).toBeGreaterThanOrEqual(50);
    // The traditional lands offer several of their kinds.
    for (const land of ['japan', 'korea', 'china', 'aurora', 'desert'] as const) expect(designsOf(land).length, land).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it('any design goes up on land you own as its shell, and is improved a level at a time', () => {
    const st = newGame(), plot = PLOTS.find((p) => p.region === 'meadow')!;
    st.coins = 5000;
    st.inventory.wood = 40;
    const igloo = designsOf('aurora').find((d) => d.kind === 'igloo') ?? designsOf('aurora')[0];
    expect(buildDesign(st, plot.id, igloo.id)).toMatch(/land/i); // not owned yet
    st.plots[plot.id] = { decor: [{ id: 'bench-1', kind: 'bench', x: 0, z: -4, rot: 0 }] };
    const coins = st.coins;
    expect(buildDesign(st, plot.id, igloo.id)).toBeNull();
    expect(st.coins).toBe(coins - buildCost(igloo).coins);
    const h = houseOn(st, plot.id)!;
    expect(h.design).toBe(igloo.id);
    expect(levelOf(h)).toBe(1);
    expect(ownsHome(st, plot.id)).toBe(true);
    // The bench that stood where the house went was cleared away.
    expect(st.plots[plot.id].decor.some((d) => d.kind === 'bench')).toBe(false);
    for (let l = 2; l <= MAX_LEVEL; l++) { expect(upgradeHouse(st, plot.id)).toBeNull(); expect(levelOf(houseOn(st, plot.id)!)).toBe(l); }
    expect(upgradeHouse(st, plot.id)).toMatch(/fine/);
    // Building another design replaces it: one house on the plot, starting again as its shell.
    const hanok = designsOf('korea')[0];
    expect(buildDesign(st, plot.id, hanok.id)).toBeNull();
    expect(st.plots[plot.id].decor.filter((d) => d.kind.startsWith('house-')).length).toBe(1);
    expect(houseOn(st, plot.id)!.design).toBe(hanok.id);
    expect(levelOf(houseOn(st, plot.id)!)).toBe(1);
  });

  it('it costs coins and timber, and old homes count as finished', () => {
    const st = newGame(), plot = PLOTS[0];
    st.plots[plot.id] = { decor: [] };
    st.coins = 10;
    expect(buildDesign(st, plot.id, designsOf('meadow')[0].id)).toMatch(/coins/);
    st.coins = 5000;
    st.inventory.wood = 0;
    expect(buildDesign(st, plot.id, designsOf('meadow')[0].id)).toMatch(/wood/);
    expect(levelOf({ id: 'h', kind: `house-${plot.region}`, x: 0, z: -5, rot: 0 })).toBe(2);
  });

  it('a house is drawn by its design, fuller at each level', () => {
    const d = designsOf('japan')[0], mat = new THREE.MeshStandardMaterial();
    const size = (level: number) => {
      const b = buildDecor(`house-${d.land}`, 'meadow', 'x', 0, undefined, undefined, { design: d.id, level });
      return (b.g.build(mat)?.geometry.getAttribute('position').count ?? 0) + (b.glow.build(mat)?.geometry.getAttribute('position').count ?? 0);
    };
    const [a, b, c, e] = [1, 2, 3, 4].map(size);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(e).toBeGreaterThan(c);
  });
});
