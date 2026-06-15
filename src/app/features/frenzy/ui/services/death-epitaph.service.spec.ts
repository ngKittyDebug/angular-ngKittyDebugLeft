import { describe, expect, it } from 'vitest';

import type { FaintCause } from '@game/frenzy/types';

import { DeathEpitaphService } from './death-epitaph.service';

// Deterministic rng so the rolled variant index is predictable: 0 → first variant.
const firstVariant = (): number => 0;

describe('DeathEpitaphService', () => {
  const service = new DeathEpitaphService();

  it('maps a missing cause to the generic "unknown" bucket', () => {
    expect(service.compose(null, null, false, firstVariant)).toEqual({
      textKey: 'obituary.unknown.0',
      params: {},
    });
  });

  it('maps decay to the starvation bucket', () => {
    expect(service.compose({ by: 'decay' }, null, false, firstVariant).textKey).toBe(
      'obituary.decay.0',
    );
  });

  it('maps a plain lethal item to its own bucket, no killer param', () => {
    const cause: FaintCause = { by: 'item', itemType: 'rock' };

    expect(service.compose(cause, null, false, firstVariant)).toEqual({
      textKey: 'obituary.rock.0',
      params: {},
    });
  });

  it('falls back to the generic item bucket for an unlisted item type', () => {
    const cause: FaintCause = { by: 'item', itemType: 'poop' };

    expect(service.compose(cause, null, false, firstVariant).textKey).toBe('obituary.item.0');
  });

  it('uses the gloating killer.bomb bucket and names the culprit when a bomb has an owner', () => {
    const cause: FaintCause = { by: 'item', itemType: 'bomb', killerId: 'p2' };

    expect(service.compose(cause, 'Rival', false, firstVariant)).toEqual({
      textKey: 'obituary.killer.bomb.0',
      params: { killer: 'Rival' },
    });
  });

  it('routes a thrown rock/brick from a named player to the killer.thrown bucket', () => {
    const cause: FaintCause = { by: 'item', itemType: 'brick', killerId: 'p2' };

    expect(service.compose(cause, 'Rival', false, firstVariant).textKey).toBe(
      'obituary.killer.thrown.0',
    );
  });

  it('routes any other owned item from a named player to the killer.generic bucket', () => {
    const cause: FaintCause = { by: 'item', itemType: 'rotten', killerId: 'p2' };

    expect(service.compose(cause, 'Rival', false, firstVariant).textKey).toBe(
      'obituary.killer.generic.0',
    );
  });

  it('reuses the killer.generic bucket for a fatal collision, naming the rammer', () => {
    const cause: FaintCause = { by: 'bump', killerId: 'p2' };

    expect(service.compose(cause, 'Rival', false, firstVariant)).toEqual({
      textKey: 'obituary.killer.generic.0',
      params: { killer: 'Rival' },
    });
  });

  it('falls back to the unknown bucket for a collision whose rammer can no longer be named', () => {
    const cause: FaintCause = { by: 'bump', killerId: 'p2' };

    expect(service.compose(cause, null, false, firstVariant)).toEqual({
      textKey: 'obituary.unknown.0',
      params: {},
    });
  });

  it('routes a self-destruct (shoved my own mine into myself) to the self bucket, no name param', () => {
    // killerId is my own id; killerName resolves to my own name, but selfDestruct swaps the gloat line out.
    const cause: FaintCause = { by: 'item', itemType: 'bomb', killerId: 'me' };

    expect(service.compose(cause, 'Me', true, firstVariant)).toEqual({
      textKey: 'obituary.self.0',
      params: {},
    });
  });

  it('rolls within the bucket variant count', () => {
    // rng → 0.99 must stay inside the bucket (index < count), never key a missing phrase.
    const cause: FaintCause = { by: 'decay' };
    const { textKey } = service.compose(cause, null, false, () => 0.99);

    expect(textKey).toBe('obituary.decay.3');
  });
});
