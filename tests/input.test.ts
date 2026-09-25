import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../src/core/Input';

describe('keyboard and touch controls', () => {
  let input: Input;
  beforeEach(() => {
    vi.stubGlobal('addEventListener', vi.fn());
    input = new Input({ addEventListener: vi.fn() } as unknown as HTMLElement);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('stops touch motion while a menu is open', () => {
    input.stick = { x: 1, y: -1 };
    expect(Math.hypot(input.axis().x, input.axis().y)).toBeCloseTo(1);
    input.blocked = true;
    expect(Math.hypot(input.axis().x, input.axis().y)).toBe(0);
  });
  it('holds ascent across frames but triggers flight only once per press', () => {
    input.setVirtual(' ', true);
    expect(input.hit(' ')).toBe(true);
    input.endFrame();
    expect(input.held(' ')).toBe(true);
    expect(input.hit(' ')).toBe(false);
    input.setVirtual(' ', false);
    expect(input.held(' ')).toBe(false);
    input.setVirtual('f', true);
    input.endFrame();
    input.setVirtual('f', true);
    expect(input.hit('f')).toBe(false);
  });
  it('clears held controls and camera deltas when focus or a panel changes', () => {
    input.setVirtual('shift', true);
    input.stick = { x: 1, y: 1 };
    input.dx = 50;
    input.reset();
    expect(input.held('shift')).toBe(false);
    expect(input.hit('shift')).toBe(false);
    expect(Math.hypot(input.axis().x, input.axis().y)).toBe(0);
    expect(input.dx).toBe(0);
  });
});

