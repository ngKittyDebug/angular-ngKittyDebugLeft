import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Player, ServerMessage } from '@game/frenzy/types';

import { bodyForAppearance } from '../../../ui/constants/pokemon-registry';
import { effectContext } from './effect-context.mock';
import { FloatingMessagesStore } from './floating-messages.store';
import { PresenceTracker } from './presence-tracker.service';

function player(id: string, name: string, x = 0.5, y = 0.5): Player {
  return {
    kind: 'human',
    id,
    name,
    appearance: 'pidgey',
    body: bodyForAppearance('pidgey'),
    stage: 1,
    hp: 100,
    mana: 0,
    x,
    y,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

function npcPlayer(id: string, x = 0.5, y = 0.5): Player {
  return {
    ...player(id, 'angryBomb', x, y),
    kind: 'npc',
    npcKind: 'angryBomb',
    appearance: 'angryBomb',
  };
}

function snapshot(players: Player[]): ServerMessage {
  return { type: 'snapshot', state: { players, items: [], tick: 0 } };
}

function slimSnapshot(players: Player[]): ServerMessage {
  return {
    type: 'slimSnapshot',
    state: {
      players: players.map((full) => ({
        id: full.id,
        stage: full.stage,
        hp: full.hp,
        mana: full.mana,
        x: full.x,
        y: full.y,
        vx: full.vx,
        vy: full.vy,
        status: full.status,
        disconnectedAt: full.disconnectedAt,
        effects: full.effects,
        scores: full.scores,
      })),
      items: [],
      tick: 1,
    },
  };
}

describe('PresenceTracker', () => {
  let tracker: PresenceTracker;
  let floats: FloatingMessagesStore;
  const context = effectContext({ myId: 'me' });

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [PresenceTracker, FloatingMessagesStore],
    });
    tracker = TestBed.inject(PresenceTracker);
    floats = TestBed.inject(FloatingMessagesStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits no quips for the first snapshot it sees', () => {
    tracker.handle(snapshot([player('me', 'Me'), player('other', 'Ash')]), context);

    expect(floats.ownedMessages()).toHaveLength(0);
  });

  it('announces a newly appeared other player, not myself', () => {
    tracker.handle(snapshot([player('me', 'Me'), player('other', 'Ash')]), context);
    tracker.handle(
      snapshot([player('me', 'Me'), player('other', 'Ash'), player('p3', 'Misty')]),
      context,
    );

    const messages = floats.ownedMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].ownerId).toBe('p3');
    expect(messages[0].who).toBe('Misty');
    expect(messages[0].textKey).toContain('statusMessage.appeared');
  });

  it('announces an appeared NPC anchored to it but without a name label', () => {
    tracker.handle(snapshot([player('me', 'Me')]), context);
    tracker.handle(snapshot([player('me', 'Me'), npcPlayer('npc-1')]), context);

    const messages = floats.ownedMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].ownerId).toBe('npc-1');
    expect(messages[0].who).toBeUndefined();
    expect(messages[0].textKey).toContain('statusMessage.npcAppeared');
  });

  it('floats an unnamed NPC death quip when an NPC faints', () => {
    tracker.handle(snapshot([npcPlayer('npc-1', 0.3, 0.7)]), context);
    tracker.handle({ type: 'fainted', playerId: 'npc-1' }, context);

    const messages = floats.orphanMessages();
    const died = messages[messages.length - 1];

    expect(died.textKey).toContain('statusMessage.npcDied');
    expect(died.who).toBeUndefined();
    expect(died.x).toBe(0.3);
    expect(died.y).toBe(0.7);
  });

  it('floats a death quip at the last-known spot when another player faints', () => {
    tracker.handle(snapshot([player('other', 'Ash', 0.4, 0.6)]), context);
    tracker.handle({ type: 'fainted', playerId: 'other' }, context);

    const messages = floats.orphanMessages();
    const died = messages[messages.length - 1];

    expect(died.textKey).toContain('statusMessage.died');
    expect(died.who).toBe('Ash');
    expect(died.x).toBe(0.4);
    expect(died.y).toBe(0.6);
  });

  it('refreshes the last-known position from slim snapshots, so the death quip lands where the player was', () => {
    tracker.handle(snapshot([player('other', 'Ash', 0.4, 0.6)]), context);
    // The player drifts between roster changes — only slim snapshots arrive, carrying the fresh position.
    tracker.handle(slimSnapshot([player('other', 'Ash', 0.8, 0.3)]), context);
    tracker.handle({ type: 'fainted', playerId: 'other' }, context);

    const messages = floats.orphanMessages();
    const died = messages[messages.length - 1];

    expect(died.textKey).toContain('statusMessage.died');
    expect(died.who).toBe('Ash'); // the name survives from the full snapshot — slim carries none
    expect(died.x).toBe(0.8);
    expect(died.y).toBe(0.3);
  });

  it('does not announce a slim-only id (the announcing full snapshot owns the appeared quip)', () => {
    tracker.handle(snapshot([player('me', 'Me')]), context);
    tracker.handle(slimSnapshot([player('me', 'Me'), player('ghost', 'Ghost')]), context);

    expect(floats.ownedMessages()).toHaveLength(0);
  });

  it('prunes a player dropped from a slim snapshot, so a later faint stamps no quip', () => {
    tracker.handle(snapshot([player('other', 'Ash', 0.4, 0.6)]), context);
    tracker.handle(slimSnapshot([]), context);
    tracker.handle({ type: 'fainted', playerId: 'other' }, context);

    expect(floats.orphanMessages()).toHaveLength(0);
  });

  it('stays silent when my own Pokémon faints', () => {
    tracker.handle(snapshot([player('me', 'Me')]), context);
    tracker.handle({ type: 'fainted', playerId: 'me' }, context);

    expect(floats.orphanMessages()).toHaveLength(0);
  });
});
