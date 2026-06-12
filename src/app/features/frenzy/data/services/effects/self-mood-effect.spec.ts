import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Player } from '@game/frenzy/types';

import { bodyForAppearance } from '../../../ui/constants/pokemon-registry';
import { FrenzyStore } from '../../store/frenzy.store';
import { FloatingMessagesStore } from './floating-messages.store';
import { SelfMoodEffect } from './self-mood-effect.service';

function me(hp: number): Player {
  return {
    kind: 'human',
    id: 'me',
    name: 'Me',
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
    stage: 1,
    hp,
    mana: 0,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

describe('SelfMoodEffect', () => {
  let mood: SelfMoodEffect;
  let floats: FloatingMessagesStore;
  let meSignal: ReturnType<typeof signal<Player | null>>;

  beforeEach(() => {
    meSignal = signal<Player | null>(null);

    TestBed.configureTestingModule({
      providers: [
        SelfMoodEffect,
        FloatingMessagesStore,
        { provide: FrenzyStore, useValue: { me: meSignal } },
      ],
    });
    mood = TestBed.inject(SelfMoodEffect);
    floats = TestBed.inject(FloatingMessagesStore);
    TestBed.tick();
  });

  function last() {
    const messages = floats.ownedMessages();

    return messages[messages.length - 1];
  }

  it('floats nothing while the Pokémon is healthy', () => {
    meSignal.set(me(150));
    TestBed.tick();

    expect(floats.ownedMessages()).toHaveLength(0);
  });

  it('floats sad once when the Pokémon gets hungry, then happy on recovery', () => {
    meSignal.set(me(150));
    TestBed.tick();

    meSignal.set(me(50));
    TestBed.tick();
    expect(last().textKey).toContain('statusMessage.sad');

    const afterSad = floats.ownedMessages().length;

    meSignal.set(me(40));
    TestBed.tick();
    expect(floats.ownedMessages()).toHaveLength(afterSad);

    meSignal.set(me(150));
    TestBed.tick();
    expect(last().textKey).toContain('statusMessage.happy');
  });

  it('raises a sticky dying warning and clears it once the threat is gone', () => {
    meSignal.set(me(4));
    TestBed.tick();

    const dying = last();

    expect(dying.textKey).toContain('statusMessage.dying');

    meSignal.set(me(150));
    TestBed.tick();
    expect(floats.ownedMessages().some((message) => message.id === dying.id)).toBe(false);
  });

  it('pokeSelf floats a quip and replaces the previous one on rapid clicks', () => {
    meSignal.set(me(150));

    mood.pokeSelf();
    const first = last();

    expect(first.textKey).toContain('statusMessage.poke');

    mood.pokeSelf();
    expect(floats.ownedMessages().some((message) => message.id === first.id)).toBe(false);
    expect(last().textKey).toContain('statusMessage.poke');
  });
});
