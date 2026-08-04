import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { Item, Player, PlayerEffectKind, ServerMessage } from '@game/frenzy/types';

import { SoundPlayerService } from '../sound/sound-player.service';
import { bodyForAppearance } from '../../constants/pokemon-body';
import { effectContext } from './effect-context.mock';
import { EmissionSoundEffect } from './emission-sound-effect.service';

function player(id: string, effectKinds: PlayerEffectKind[]): Player {
  return {
    kind: 'human',
    id,
    name: id,
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
    stage: 1,
    hp: 100,
    mana: 0,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: effectKinds.map((kind) => ({ kind, expiresAt: Number.MAX_SAFE_INTEGER })),
    scores: {},
  };
}

function spawned(item: Partial<Item> = {}): ServerMessage {
  return {
    type: 'spawned',
    item: { id: 'i1', type: 'food', x: 0.5, y: 0.5, vy: 0.1, ...item },
  };
}

describe('EmissionSoundEffect', () => {
  let effect: EmissionSoundEffect;
  let play: ReturnType<typeof vi.fn>;

  function arrange(): void {
    play = vi.fn();

    TestBed.configureTestingModule({
      providers: [EmissionSoundEffect, { provide: SoundPlayerService, useValue: { play } }],
    });
    effect = TestBed.inject(EmissionSoundEffect);
  }

  it('plays no cue for a normal world spawn (no owner)', () => {
    const context = effectContext({ state: { players: [], items: [], tick: 0 } });

    arrange();
    effect.handle(spawned({ ownerId: undefined }), context);

    expect(play).not.toHaveBeenCalled();
  });

  it('plays the fart cue when the emitting owner has the pooping aura', () => {
    const owner = player('owner', ['pooping']);
    const context = effectContext({ state: { players: [owner], items: [], tick: 0 } });

    arrange();
    effect.handle(spawned({ ownerId: 'owner' }), context);

    expect(play).toHaveBeenCalledExactlyOnceWith('poopEmission');
  });

  it('plays the festive blip when the emitting owner has the laying aura', () => {
    const owner = player('owner', ['laying']);
    const context = effectContext({ state: { players: [owner], items: [], tick: 0 } });

    arrange();
    effect.handle(spawned({ ownerId: 'owner' }), context);

    expect(play).toHaveBeenCalledExactlyOnceWith('eggEmission');
  });

  it('lets pooping win over laying when the owner holds both auras', () => {
    const owner = player('owner', ['laying', 'pooping']);
    const context = effectContext({ state: { players: [owner], items: [], tick: 0 } });

    arrange();
    effect.handle(spawned({ ownerId: 'owner' }), context);

    expect(play).toHaveBeenCalledExactlyOnceWith('poopEmission');
  });

  it('stays silent when the emitting owner is no longer in state', () => {
    const context = effectContext({ state: { players: [], items: [], tick: 0 } });

    arrange();
    effect.handle(spawned({ ownerId: 'ghost' }), context);

    expect(play).not.toHaveBeenCalled();
  });

  it('stays silent when the owner carries neither emitting aura', () => {
    const owner = player('owner', ['shield']);
    const context = effectContext({ state: { players: [owner], items: [], tick: 0 } });

    arrange();
    effect.handle(spawned({ ownerId: 'owner' }), context);

    expect(play).not.toHaveBeenCalled();
  });
});
