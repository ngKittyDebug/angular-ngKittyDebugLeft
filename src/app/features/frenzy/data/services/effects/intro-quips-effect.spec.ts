import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Player } from '@game/frenzy/types';

import { bodyForAppearance } from '../../../ui/constants/pokemon-registry';
import { FrenzyStore } from '../../store/frenzy.store';
import { FloatingMessagesStore } from './floating-messages.store';
import { IntroQuipsEffect } from './intro-quips-effect.service';

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

describe('IntroQuipsEffect', () => {
  let floats: FloatingMessagesStore;
  let meSignal: ReturnType<typeof signal<Player | null>>;

  beforeEach(() => {
    meSignal = signal<Player | null>(null);

    TestBed.configureTestingModule({
      providers: [
        IntroQuipsEffect,
        FloatingMessagesStore,
        { provide: FrenzyStore, useValue: { me: meSignal } },
      ],
    });
    TestBed.inject(IntroQuipsEffect);
    floats = TestBed.inject(FloatingMessagesStore);
    TestBed.tick();
  });

  it('floats a random 2–3 distinct intro quips on spawn', () => {
    const spy = vi.spyOn(floats, 'pushOwned');

    meSignal.set(me(98));
    TestBed.tick();

    const keys = spy.mock.calls.map((call) => call[0].textKey);

    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(keys.length).toBeLessThanOrEqual(3);
    expect(keys.every((key) => key.startsWith('intro.'))).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('does not quip again while the Pokémon stays alive', () => {
    meSignal.set(me(98));
    TestBed.tick();

    const spy = vi.spyOn(floats, 'pushOwned');

    meSignal.set(me(60));
    TestBed.tick();
    meSignal.set(me(120));
    TestBed.tick();

    expect(spy).not.toHaveBeenCalled();
  });

  it('quips again after a respawn', () => {
    meSignal.set(me(98));
    TestBed.tick();

    const spy = vi.spyOn(floats, 'pushOwned');

    meSignal.set(null);
    TestBed.tick();
    meSignal.set(me(98));
    TestBed.tick();

    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(spy.mock.calls.every((call) => call[0].textKey.startsWith('intro.'))).toBe(true);
  });
});
