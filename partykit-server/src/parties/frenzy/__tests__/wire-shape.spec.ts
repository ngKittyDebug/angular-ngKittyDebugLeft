import { describe, expect, it } from 'vitest';

import type { HumanPlayer, Item, ServerMessage, SlimPlayer } from '@game/frenzy/types';

import { serializeServerMessage } from '../serialize-server-message';
import { TEST_BODY } from './test-body';

// Wire-shape golden master (phase 0 of the theme-agnostic refactor): one committed snapshot of the SERIALIZED
// form of every ServerMessage type, fixing both the field layout and the 4-decimal quantization on the wire.
// The companion serialize-server-message.spec.ts covers the quantization MATH; this file freezes the SHAPES.
// Phases 1–5 must keep these snapshots byte-identical — regenerate only for a deliberate protocol change.
//
// The exemplar coordinates use awkward floats on purpose, so the frozen output shows quantization applied.

const ITEM: Item = {
  id: 'item-1',
  type: 'food',
  x: 0.123456789,
  y: 0.987654321,
  vy: 0.15,
};

const EMITTED_BOMB: Item = {
  id: 'item-2',
  type: 'bomb',
  x: 0.456789123,
  y: 0.5,
  vy: 0.01,
  vx: -0.034567891,
  ownerId: 'player-1',
  armed: true,
  lastNudgedBy: 'player-2',
  clicksLeft: 3,
};

const PLAYER: HumanPlayer = {
  kind: 'human',
  id: 'player-1',
  name: 'Trainer',
  appearance: 'pidgey',
  body: TEST_BODY,
  stage: 1,
  hp: 142,
  mana: 0,
  x: 0.314159265,
  y: 0.271828182,
  vx: -0.012345678,
  vy: 0.087654321,
  status: 'alive',
  disconnectedAt: null,
  joinedAt: 1_750_000_000_000,
  effects: [{ kind: 'shield', expiresAt: 1_750_000_005_000 }],
  scores: { kills: 2, timeAlive: 73 },
};

const SLIM_PLAYER: SlimPlayer = {
  id: 'player-1',
  stage: 1,
  hp: 142,
  mana: 0,
  x: 0.314159265,
  y: 0.271828182,
  vx: -0.012345678,
  vy: 0.087654321,
  status: 'alive',
  disconnectedAt: null,
  effects: [{ kind: 'wellFed', expiresAt: 1_750_000_005_000 }],
  scores: { timeAlive: 73 },
};

// One exemplar per ServerMessage type. The Record over the union is the completeness guard: adding a new
// message type without a frozen exemplar fails compilation, so the wire can't grow an untracked shape.
const EXEMPLARS: { [Type in ServerMessage['type']]: Extract<ServerMessage, { type: Type }> } = {
  snapshot: {
    type: 'snapshot',
    state: { players: [PLAYER], items: [ITEM, EMITTED_BOMB], tick: 42 },
  },
  slimSnapshot: {
    type: 'slimSnapshot',
    state: { players: [SLIM_PLAYER], items: [ITEM], tick: 45 },
  },
  spawned: { type: 'spawned', item: EMITTED_BOMB },
  eaten: {
    type: 'eaten',
    itemId: 'item-1',
    itemType: 'food',
    playerId: 'player-1',
    newHp: 152,
    delta: 10,
    x: 0.123456789,
    y: 0.987654321,
    via: 'click',
    priority: 2,
  },
  evolved: { type: 'evolved', playerId: 'player-1', newStage: 2, priority: 1 },
  fainted: {
    type: 'fainted',
    playerId: 'player-1',
    cause: { by: 'item', itemType: 'bomb', killerId: 'player-2' },
    priority: 0,
  },
  itemNudged: {
    type: 'itemNudged',
    itemId: 'item-2',
    x: 0.456789123,
    y: 0.5,
    vx: 0.123456789,
    vy: -0.087654321,
    clicksLeft: 2,
  },
  detonated: {
    type: 'detonated',
    itemId: 'item-2',
    x: 0.456789123,
    y: 0.5,
    radius: 0.183333333,
    hits: [
      { playerId: 'player-1', delta: -34.567891234 },
      { playerId: 'player-2', delta: -12.3 },
    ],
    priority: 0,
  },
  effectGranted: {
    type: 'effectGranted',
    playerId: 'player-1',
    effect: { kind: 'shield', expiresAt: 1_750_000_005_000 },
    itemId: 'item-3',
    x: 0.111111111,
    y: 0.222222222,
    via: 'collision',
  },
  bumped: { type: 'bumped', playerId: 'player-1', priority: 3 },
  steered: {
    type: 'steered',
    playerId: 'player-1',
    x: 0.785234567,
    y: 0.520123456,
    vx: -0.040512345,
    vy: -0.032687654,
  },
  npcAngered: { type: 'npcAngered', npcId: 'npc-1', mana: 123.456789 },
  roomFull: { type: 'roomFull' },
  joinRejected: { type: 'joinRejected', reason: 'invalidBody' },
  joined: { type: 'joined', playerId: 'player-1' },
  identifyRejected: { type: 'identifyRejected' },
  rejoined: { type: 'rejoined', playerId: 'player-1' },
  ping: { type: 'ping' },
};

describe('wire shape — serialized form of every ServerMessage type', () => {
  for (const [type, message] of Object.entries(EXEMPLARS)) {
    it(`freezes the "${type}" frame`, () => {
      expect(serializeServerMessage(message)).toMatchSnapshot();
    });
  }
});
