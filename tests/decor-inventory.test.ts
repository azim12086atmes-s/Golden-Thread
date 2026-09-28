import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LAND_TRAFFIC } from '../src/traffic/roster';
import { decorOf } from '../src/world/decorLedger';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGIONS } from '../src/world/regions';
import { SKIES } from '../src/world/skies';

/**
 * The decorations ledger (world/decorLedger.ts): every land is built and what it holds is counted —
 * on its streets, across its land, and in its sky. `GEN_DOCS=1 npx vitest run tests/decor-inventory.test.ts`
 * writes the table to docs/team/handoffs/DECOR_INVENTORY.md.
 */
describe('decorations in every land, counted', () => {
  it('every town has street decorations and lamps, and every sky has things in it', async () => {
    const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();
    const rows: string[] = [];
    for (const r of REGIONS) {
      buildRegion(r, solid, glow);
      const d = decorOf(r.id);
      const sky = LAND_TRAFFIC[r.id].sky.map(([id, n]) => `${id} ×${n}`);
      const orn = SKIES[r.id].effects;
      if (r.id !== 'skyisles') {
        expect(Object.keys(d).some((k) => k.startsWith('street:')), r.id).toBe(true);
        expect(d['street: lamps'] ?? 0, r.id).toBeGreaterThan(10);
      }
      expect(sky.length + orn.length, r.id).toBeGreaterThan(8);
      const part = (p: string) => Object.entries(d).filter(([k]) => k.startsWith(p)).map(([k, n]) => `${k.slice(p.length)} ×${n}`).join(', ') || '—';
      rows.push(`| ${r.name} | ${part('street: ')} | ${part('town: ')} | ${part('land: ')} | ${sky.join(', ')} | ${orn.join(', ')} |`);
    }
    const env = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env;
    const fs: { writeFileSync(p: string, d: string): void } = await import('node:' + 'fs');
    if (env?.GEN_DOCS) fs.writeFileSync('docs/team/handoffs/DECOR_INVENTORY.md', [
      '# Decorations in every land (generated)',
      '',
      'Counted by building every land (`GEN_DOCS=1 npx vitest run tests/decor-inventory.test.ts`). Street: hung across and set along the avenues; town: houses and squares; land: the country round the town; sky: what flies (traffic roster, ×groups) and the sky\'s own ornaments (skies.ts).',
      '',
      '| Land | Street | Town | Land | Flying | Sky ornaments |',
      '|---|---|---|---|---|---|',
      ...rows, ''].join('\n'));
  }, 600000);
});
