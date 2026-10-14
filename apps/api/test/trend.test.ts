import { describe, expect, it } from 'vitest';
import { pm25Trend } from '../src/services/trend';

describe('pm25Trend', () => {
  it('worsening when the upcoming peak rises past the threshold', () => {
    expect(pm25Trend(40, [45, 80, 120])).toBe('worsening');
  });
  it('improving when the upcoming trough falls past the threshold', () => {
    expect(pm25Trend(120, [100, 60, 50])).toBe('improving');
  });
  it('stable for small changes', () => {
    expect(pm25Trend(40, [42, 38, 45])).toBe('stable');
  });
  it('unknown when inputs are missing', () => {
    expect(pm25Trend(null, [40])).toBe('unknown');
    expect(pm25Trend(40, [null, null])).toBe('unknown');
  });
});
