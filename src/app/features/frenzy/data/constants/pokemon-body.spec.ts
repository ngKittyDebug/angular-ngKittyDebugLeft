import { describe, expect, it } from 'vitest';

import { resolveLine } from './pokemon-body';

describe('resolveLine', () => {
  it('resolves a real roster id to itself', () => {
    expect(resolveLine('magikarp')).toBe('magikarp');
    expect(resolveLine('charmander')).toBe('charmander');
  });

  it('falls back for a prototype-chain builtin name like an ordinary unknown id', () => {
    // Regression: `appearance in STAGE_ART` matched inherited names, so STAGE_ART[appearance] was a builtin, not a
    // sprite table. An own-property check makes a builtin name fall through to the fallback line.
    expect(resolveLine('constructor')).toBe(resolveLine('unknown-garbage-id'));
    expect(resolveLine('__proto__')).toBe(resolveLine('unknown-garbage-id'));
    expect(resolveLine('toString')).toBe(resolveLine('unknown-garbage-id'));
  });
});
