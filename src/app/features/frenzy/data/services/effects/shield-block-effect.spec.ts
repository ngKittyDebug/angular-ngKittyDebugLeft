import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  HumanPlayer,
  Player,
  PlayerEffect,
  ServerMessage,
  ServerState,
  StageBody,
} from '@game/frenzy/types';

import { effectContext } from './effect-context.mock';
import { ShieldBlockEffect } from './shield-block-effect.service';

const STAGE: StageBody = { width: 60, height: 60, speed: 0.03, maxSpeed: 0.07, hp: 0 };
const SHIELD: PlayerEffect = { kind: 'shield', expiresAt: Number.MAX_SAFE_INTEGER };

function player(id: string, partial: Partial<HumanPlayer> = {}): Player {
  return {
    kind: 'human',
    id,
    name: id,
    appearance: 'caterpie',
    body: { 1: STAGE, 2: STAGE, 3: STAGE },
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
    effects: [],
    scores: {},
    ...partial,
  };
}

function stateWith(players: Player[]): ServerState {
  return { players, items: [], tick: 0 };
}

function eaten(partial: Partial<Extract<ServerMessage, { type: 'eaten' }>> = {}): ServerMessage {
  return {
    type: 'eaten',
    itemId: 'i1',
    itemType: 'rock',
    playerId: 'me',
    newHp: 100,
    delta: 0,
    x: 0.5,
    y: 0.5,
    via: 'collision',
    ...partial,
  };
}

function detonated(
  partial: Partial<Extract<ServerMessage, { type: 'detonated' }>> = {},
): ServerMessage {
  return {
    type: 'detonated',
    itemId: 'b1',
    x: 0.5,
    y: 0.5,
    radius: 0.18,
    // Shielded players are skipped at the blast, so they never appear here — the effect must find them itself.
    hits: [],
    ...partial,
  };
}

describe('ShieldBlockEffect', () => {
  let effect: ShieldBlockEffect;
  let state: ReturnType<typeof signal<ServerState | null>>;

  beforeEach(() => {
    vi.useFakeTimers();
    state = signal<ServerState | null>(null);

    TestBed.configureTestingModule({
      providers: [ShieldBlockEffect],
    });
    effect = TestBed.inject(ShieldBlockEffect);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Dispatch with a context snapshot of the current state — mirrors how the orchestrator rebuilds it per message.
  function dispatch(message: ServerMessage): void {
    effect.handle(message, effectContext({ state: state() }));
  }

  it('marks a warded rock/brick collision (delta 0) as a shield block for the struck player', () => {
    dispatch(eaten({ playerId: 'victim', itemType: 'rock', delta: 0 }));
    dispatch(eaten({ playerId: 'me', itemType: 'brick', delta: 0 }));

    const blocks = effect.ownedShieldBlocks();

    expect(blocks).toHaveLength(2);
    expect(blocks[0].ownerId).toBe('victim');
    expect(blocks[1].ownerId).toBe('me');
  });

  it('marks a warded rotten bite (delta 0 via click) as a shield block', () => {
    dispatch(eaten({ playerId: 'me', itemType: 'rotten', via: 'click', delta: 0 }));

    expect(effect.ownedShieldBlocks()).toHaveLength(1);
    expect(effect.ownedShieldBlocks()[0].ownerId).toBe('me');
  });

  it('does NOT fire when a damaging hit actually dealt damage (delta < 0 — not warded)', () => {
    dispatch(eaten({ playerId: 'me', itemType: 'rock', delta: -20 }));

    expect(effect.ownedShieldBlocks()).toHaveLength(0);
  });

  it('does NOT fire for a genuinely neutral delta-0 pickup (non-damaging type)', () => {
    dispatch(eaten({ playerId: 'me', itemType: 'food', delta: 0 }));
    // mushroom can roll a neutral 0 without a shield — excluded as ambiguous.
    dispatch(eaten({ playerId: 'me', itemType: 'mushroom', delta: 0 }));

    expect(effect.ownedShieldBlocks()).toHaveLength(0);
  });

  it('on a bomb blast, marks shielded players within the radius — even though they are absent from hits', () => {
    state.set(
      stateWith([
        player('shielded-near', { x: 0.5, y: 0.5, effects: [SHIELD] }),
        player('plain-near', { x: 0.5, y: 0.5 }),
        player('shielded-far', { x: 0.95, y: 0.95, effects: [SHIELD] }),
      ]),
    );

    dispatch(detonated({ x: 0.5, y: 0.5, radius: 0.18 }));

    const blocks = effect.ownedShieldBlocks();

    expect(blocks).toHaveLength(1);
    expect(blocks[0].ownerId).toBe('shielded-near');
  });

  it('skips a player whose shield has already expired inside the blast radius', () => {
    state.set(
      stateWith([
        player('lapsed', {
          x: 0.5,
          y: 0.5,
          effects: [{ kind: 'shield', expiresAt: Date.now() - 1 }],
        }),
      ]),
    );

    dispatch(detonated({ x: 0.5, y: 0.5, radius: 0.18 }));

    expect(effect.ownedShieldBlocks()).toHaveLength(0);
  });

  it('skips a dead shielded player caught in the blast radius', () => {
    state.set(
      stateWith([player('ghost', { x: 0.5, y: 0.5, status: 'disconnected', effects: [SHIELD] })]),
    );

    dispatch(detonated({ x: 0.5, y: 0.5, radius: 0.18 }));

    expect(effect.ownedShieldBlocks()).toHaveLength(0);
  });

  it('auto-removes the block cue after its TTL', () => {
    dispatch(eaten({ playerId: 'me', itemType: 'rock', delta: 0 }));

    expect(effect.ownedShieldBlocks()).toHaveLength(1);

    vi.advanceTimersByTime(700);

    expect(effect.ownedShieldBlocks()).toHaveLength(0);
  });
});
