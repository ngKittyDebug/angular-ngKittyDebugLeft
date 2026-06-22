import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrphanFloat, OwnedFloat } from '../../models/floating-message';
import { FloatingMessagesStore } from './floating-messages.store';
import { FLOAT_RELEASE_STAGGER_MS } from './owner-release-queue';
import { createTransientId } from './transient-list';

function owned(partial: Partial<OwnedFloat> = {}): OwnedFloat {
  return {
    id: createTransientId(),
    ownerId: 'owner',
    tone: 'neutral',
    textKey: 'floatingText.food.0',
    durationMs: 1000,
    priority: 10,
    ...partial,
  };
}

function orphan(partial: Partial<OrphanFloat> = {}): OrphanFloat {
  return {
    id: createTransientId(),
    x: 0.5,
    y: 0.5,
    tone: 'neutral',
    textKey: 'statusMessage.died.0',
    durationMs: 1000,
    priority: 100,
    ...partial,
  };
}

describe('FloatingMessagesStore', () => {
  let store: FloatingMessagesStore;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({ providers: [FloatingMessagesStore] });
    store = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('owned floats', () => {
    it('releases the first owned float immediately', () => {
      store.pushOwned(owned({ id: 'a' }));

      expect(store.ownedMessages().map((float) => float.id)).toEqual(['a']);
    });

    it('staggers a second float of the same owner behind the release gap', () => {
      store.pushOwned(owned({ id: 'a' }));
      store.pushOwned(owned({ id: 'b' }));

      expect(store.ownedMessages().map((float) => float.id)).toEqual(['a']);

      vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS);

      expect(store.ownedMessages().map((float) => float.id)).toEqual(['a', 'b']);
    });

    it('releases a higher-priority float ahead of a pending lower one', () => {
      store.pushOwned(owned({ id: 'low', priority: 1 }));
      store.pushOwned(owned({ id: 'mid', priority: 5 }));
      store.pushOwned(owned({ id: 'high', priority: 9 }));

      vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS);

      expect(store.ownedMessages().map((float) => float.id)).toEqual(['low', 'high']);
    });

    it('releases floats of different owners independently, without staggering across owners', () => {
      store.pushOwned(owned({ id: 'a', ownerId: 'one' }));
      store.pushOwned(owned({ id: 'b', ownerId: 'two' }));

      expect(
        store
          .ownedMessages()
          .map((float) => float.id)
          .sort(),
      ).toEqual(['a', 'b']);
    });

    it('self-removes an owned float once its lifetime elapses', () => {
      store.pushOwned(owned({ id: 'a', durationMs: 500 }));

      vi.advanceTimersByTime(500);

      expect(store.ownedMessages()).toHaveLength(0);
    });
  });

  describe('remove', () => {
    it('drops a still-pending float so it never surfaces', () => {
      store.pushOwned(owned({ id: 'a' }));
      store.pushOwned(owned({ id: 'pending' }));

      store.remove('pending');
      vi.advanceTimersByTime(FLOAT_RELEASE_STAGGER_MS);

      expect(store.ownedMessages().map((float) => float.id)).toEqual(['a']);
    });

    it('pulls a released float and lets a pending replacement surface at once', () => {
      store.pushOwned(owned({ id: 'a' }));
      store.pushOwned(owned({ id: 'b' }));

      store.remove('a');

      // Freeing the released slot must release the pending one without waiting out the stagger.
      expect(store.ownedMessages().map((float) => float.id)).toEqual(['b']);
    });

    it('is a no-op for an unknown id', () => {
      store.pushOwned(owned({ id: 'a' }));

      store.remove('missing');

      expect(store.ownedMessages().map((float) => float.id)).toEqual(['a']);
    });
  });

  describe('orphan floats', () => {
    it('adds an orphan float to the overlay list immediately', () => {
      store.pushOrphan(orphan({ id: 'o', x: 0.2, y: 0.8 }));

      expect(store.orphanMessages()).toHaveLength(1);
      expect(store.orphanMessages()[0]).toMatchObject({ id: 'o', x: 0.2, y: 0.8 });
    });

    it('self-removes an orphan float once its lifetime elapses', () => {
      store.pushOrphan(orphan({ durationMs: 800 }));

      vi.advanceTimersByTime(800);

      expect(store.orphanMessages()).toHaveLength(0);
    });
  });

  describe('status floats', () => {
    it('stamps an owned status float with the owner, who and a kind-derived text key', () => {
      store.pushOwnedStatus('appeared', 'p3', 'Misty');

      const float = store.ownedMessages()[0];

      expect(float.ownerId).toBe('p3');
      expect(float.who).toBe('Misty');
      expect(float.textKey).toContain('statusMessage.appeared');
    });

    it('returns the id of the owned status float so callers can replace or clear it', () => {
      const id = store.pushOwnedStatus('dying', 'me');

      expect(store.ownedMessages().some((float) => float.id === id)).toBe(true);
    });

    it('stamps an orphan status float at the given scene position', () => {
      store.pushOrphanStatus('died', 0.3, 0.7, 'Ash');

      const float = store.orphanMessages()[0];

      expect(float).toMatchObject({ x: 0.3, y: 0.7, who: 'Ash' });
      expect(float.textKey).toContain('statusMessage.died');
    });
  });
});
