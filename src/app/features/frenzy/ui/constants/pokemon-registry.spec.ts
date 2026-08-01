import { describe, expect, it } from 'vitest';

import { isNpcAppearance, spritePathFor, spriteRenderFor } from './pokemon-registry';

describe('isNpcAppearance', () => {
  it('classifies a real NPC appearance as an NPC', () => {
    expect(isNpcAppearance('angryBomb')).toBe(true);
  });

  it('does not classify a prototype-chain builtin name as an NPC', () => {
    // Regression: `appearance in NPC_SPRITES` matched inherited names; an own-property check must not.
    expect(isNpcAppearance('constructor')).toBe(false);
    expect(isNpcAppearance('__proto__')).toBe(false);
    expect(isNpcAppearance('hasOwnProperty')).toBe(false);
    expect(isNpcAppearance('toString')).toBe(false);
    expect(isNpcAppearance('valueOf')).toBe(false);
  });
});

describe('spriteRenderFor', () => {
  it('renders a real NPC as its per-stage square', () => {
    expect(spriteRenderFor('angryBomb', 1)).toEqual({
      width: 64,
      height: 64,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it('falls back for a prototype-chain builtin name instead of throwing', () => {
    // Regression: the builtin name reached NPC_SPRITES[appearance].size[stage] and threw a TypeError per frame.
    expect(() => spriteRenderFor('constructor', 1)).not.toThrow();
    expect(spriteRenderFor('constructor', 1)).toEqual(spriteRenderFor('unknown-garbage-id', 1));
  });
});

describe('spritePathFor', () => {
  it('resolves a builtin name to a pokemon sprite path, not the NPC branch', () => {
    expect(spritePathFor('constructor', 1)).toBe(spritePathFor('unknown-garbage-id', 1));
    expect(spritePathFor('constructor', 1).startsWith('/frenzy/pokemon/sprites/')).toBe(true);
  });
});
