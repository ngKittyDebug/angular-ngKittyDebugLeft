import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FloatingMessagesStore } from './floating-messages.store';
import { NpcQuipEffect } from './npc-quip-effect.service';

describe('NpcQuipEffect', () => {
  let effect: NpcQuipEffect;
  let floats: FloatingMessagesStore;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [NpcQuipEffect, FloatingMessagesStore],
    });
    effect = TestBed.inject(NpcQuipEffect);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function last() {
    const messages = floats.ownedMessageList();

    return messages[messages.length - 1];
  }

  it('floats a poke quip anchored to the poked NPC', () => {
    effect.pokeNpc('npc-1');

    expect(last().ownerId).toBe('npc-1');
    expect(last().textKey).toContain('statusMessage.npcPoke');
  });

  it('replaces the NPC`s previous quip on a rapid second poke rather than stacking', () => {
    effect.pokeNpc('npc-1');
    const first = last();

    effect.pokeNpc('npc-1');

    expect(floats.ownedMessageList().some((message) => message.id === first.id)).toBe(false);
    expect(last().textKey).toContain('statusMessage.npcPoke');
  });

  it('tracks each NPC independently, keeping both quips when two are poked', () => {
    effect.pokeNpc('npc-1');
    effect.pokeNpc('npc-2');

    const owners = floats.ownedMessageList().map((message) => message.ownerId);

    expect(owners).toContain('npc-1');
    expect(owners).toContain('npc-2');
  });
});
