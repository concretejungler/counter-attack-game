import { describe, it, expect } from 'vitest';
import { RNG } from '../src/core/rng';

describe('RNG (mulberry32)', () => {
  it('same seed produces identical sequences', () => {
    const a = new RNG(12345);
    const b = new RNG(12345);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = new RNG(1);
    const b = new RNG(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays in [0, 1)', () => {
    const r = new RNG(999);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min, max) is inclusive of both bounds and covers range', () => {
    const r = new RNG(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = r.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen.size).toBe(4);
  });

  it('pick returns elements from the array', () => {
    const r = new RNG(42);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(r.pick(arr));
    }
  });

  it('chance(0) is never true, chance(1) is always true', () => {
    const r = new RNG(5);
    for (let i = 0; i < 100; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
  });

  it('state can be saved and restored for replay continuity', () => {
    const r = new RNG(123);
    r.next();
    r.next();
    const saved = r.getState();
    const ahead = [r.next(), r.next(), r.next()];
    const restored = new RNG(0);
    restored.setState(saved);
    expect([restored.next(), restored.next(), restored.next()]).toEqual(ahead);
  });

  it('shuffle is deterministic per seed and preserves elements', () => {
    const a = new RNG(77);
    const b = new RNG(77);
    const arrA = a.shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    const arrB = b.shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(arrA).toEqual(arrB);
    expect([...arrA].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
