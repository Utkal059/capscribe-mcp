import { describe, it, expect } from 'vitest';
import { AGENTS, getAgent, tinybarsToHbar } from '../src/agents/registry';

describe('agent registry', () => {
  it('exposes a non-empty catalog with unique ids', () => {
    expect(AGENTS.length).toBeGreaterThan(0);
    const ids = AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every agent has a positive tinybar price and required fields', () => {
    for (const a of AGENTS) {
      expect(BigInt(a.priceTinybars) > 0n).toBe(true);
      expect(a.name).toBeTruthy();
      expect(a.inputLabel).toBeTruthy();
    }
  });

  it('resolves agents by id', () => {
    expect(getAgent('capital-events')?.name).toContain('Capital');
    expect(getAgent('does-not-exist')).toBeUndefined();
  });

  it('converts tinybars to HBAR correctly', () => {
    expect(tinybarsToHbar('100000000')).toBe('1');
    expect(tinybarsToHbar('50000000')).toBe('0.5');
    expect(tinybarsToHbar('150000000')).toBe('1.5');
    expect(tinybarsToHbar('1')).toBe('0.00000001');
  });
});
