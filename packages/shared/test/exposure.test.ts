import { describe, expect, it } from 'vitest';
import { combineExposure, pm25ExposureLevel, upwindExposureLevel } from '../src';

describe('pm25ExposureLevel', () => {
  it('follows the EPA PM2.5 band edges', () => {
    expect(pm25ExposureLevel(9)).toBe('none');
    expect(pm25ExposureLevel(9.1)).toBe('low');
    expect(pm25ExposureLevel(35.4)).toBe('low');
    expect(pm25ExposureLevel(35.5)).toBe('moderate');
    expect(pm25ExposureLevel(55.5)).toBe('high');
  });

  it('treats missing data as unknown, never none', () => {
    expect(pm25ExposureLevel(null)).toBe('unknown');
    expect(pm25ExposureLevel(Number.NaN)).toBe('unknown');
  });
});

describe('upwindExposureLevel', () => {
  it('bands the upwind score', () => {
    expect(upwindExposureLevel(0)).toBe('none');
    expect(upwindExposureLevel(1.9)).toBe('none');
    expect(upwindExposureLevel(2)).toBe('low');
    expect(upwindExposureLevel(20)).toBe('moderate');
    expect(upwindExposureLevel(80)).toBe('high');
    expect(upwindExposureLevel(null)).toBe('unknown');
  });
});

describe('combineExposure', () => {
  it('takes the higher level and reports which input drove it', () => {
    expect(combineExposure('low', 'high')).toEqual({ level: 'high', driver: 'upwind' });
    expect(combineExposure('high', 'low')).toEqual({ level: 'high', driver: 'pm25' });
    expect(combineExposure('moderate', 'moderate')).toEqual({ level: 'moderate', driver: 'both' });
    expect(combineExposure('none', 'none')).toEqual({ level: 'none', driver: 'none' });
  });

  it('never lowers the level because one input is missing', () => {
    expect(combineExposure('unknown', 'moderate')).toEqual({ level: 'moderate', driver: 'upwind' });
    expect(combineExposure('high', 'unknown')).toEqual({ level: 'high', driver: 'pm25' });
    expect(combineExposure('unknown', 'unknown')).toEqual({ level: 'unknown', driver: 'none' });
  });
});
