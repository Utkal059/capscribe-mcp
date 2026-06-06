import { describe, it, expect } from 'vitest';
import { sha256Json, hashscanTx, hashscanTopic } from '../src/util/hash';

describe('canonical hashing', () => {
  it('is independent of key order', () => {
    expect(sha256Json({ a: 1, b: 2 })).toBe(sha256Json({ b: 2, a: 1 }));
  });

  it('is sensitive to values', () => {
    expect(sha256Json({ a: 1 })).not.toBe(sha256Json({ a: 2 }));
  });

  it('handles nested structures and arrays', () => {
    const h1 = sha256Json({ x: [1, { y: 2, z: 3 }] });
    const h2 = sha256Json({ x: [1, { z: 3, y: 2 }] });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashscan links', () => {
  it('builds testnet links', () => {
    expect(hashscanTx('0.0.7162784@1700000000.0')).toContain('/testnet/transaction/');
    expect(hashscanTopic('0.0.5005')).toBe('https://hashscan.io/testnet/topic/0.0.5005');
  });
});
