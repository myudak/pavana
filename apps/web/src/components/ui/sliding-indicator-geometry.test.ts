import { describe, expect, it } from 'vitest';
import { getIndicatorLocalBounds } from './sliding-indicator-geometry';

describe('sliding indicator geometry', () => {
  it('converts rendered bounds back to local CSS pixels under page zoom', () => {
    const rootRect = { left: 100, top: 200, width: 450, height: 45 };
    const activeRect = { left: 103.6, top: 203.6, width: 54, height: 36 };
    const root = {
      scrollLeft: 0,
      scrollTop: 0,
      offsetWidth: 500,
      offsetHeight: 50,
      borderLeft: 0,
      borderTop: 0,
    };

    const bounds = getIndicatorLocalBounds(rootRect, activeRect, root);
    expect(bounds.left).toBeCloseTo(4, 6);
    expect(bounds.top).toBeCloseTo(4, 6);
    expect(bounds.width).toBeCloseTo(60, 6);
    expect(bounds.height).toBeCloseTo(40, 6);
  });

  it('subtracts fractional borders when aligning controls under page zoom', () => {
    const rootRect = { left: 100, top: 200, width: 90, height: 45 };
    const activeRect = { left: 100.5, top: 200.5, width: 54, height: 36 };
    const root = {
      scrollLeft: 0,
      scrollTop: 0,
      offsetWidth: 100,
      offsetHeight: 50,
      borderLeft: 0.5555555556,
      borderTop: 0.5555555556,
    };

    const bounds = getIndicatorLocalBounds(rootRect, activeRect, root);
    expect(bounds.left).toBeCloseTo(0, 6);
    expect(bounds.top).toBeCloseTo(0, 6);
    expect(bounds.width).toBeCloseTo(60, 6);
    expect(bounds.height).toBeCloseTo(40, 6);
  });
});
