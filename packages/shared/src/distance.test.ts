import { describe, it, expect } from 'vitest';
import { haversineKm, formatDistance } from './distance.js';

describe('haversineKm', () => {
  it('returns null when a coordinate is missing', () => {
    expect(haversineKm(null, { lat: 1, lng: 1 })).toBeNull();
    expect(haversineKm({ lat: 1 }, { lat: 2, lng: 2 })).toBeNull();
    expect(haversineKm({ lat: 1, lng: 1 }, null)).toBeNull();
  });

  it('returns ~0 for identical points', () => {
    const d = haversineKm({ lat: 12.97, lng: 77.59 }, { lat: 12.97, lng: 77.59 });
    expect(d).not.toBeNull();
    expect(d!).toBeCloseTo(0, 5);
  });

  it('computes a known distance (Bengaluru → Mysuru ≈ 127 km)', () => {
    const d = haversineKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.2958, lng: 76.6394 });
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(120);
    expect(d!).toBeLessThan(135);
  });
});

describe('formatDistance', () => {
  it('returns null for unknown distance', () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(undefined)).toBeNull();
  });
  it('formats metres, km and rounded km', () => {
    expect(formatDistance(0.4)).toBe('400 m away');
    expect(formatDistance(5.12)).toBe('5.1 km away');
    expect(formatDistance(42.6)).toBe('43 km away');
  });
});
