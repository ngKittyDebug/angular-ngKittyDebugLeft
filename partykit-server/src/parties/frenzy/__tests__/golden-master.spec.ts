import { describe, expect, it } from 'vitest';

import { FRENZY, restYFor } from '@game/frenzy/config';
import { ANGRY_BOMB } from '@game/frenzy/npc/angry-bomb';
import type {
  GameEvent,
  HumanPlayer,
  Item,
  ItemType,
  NpcPlayer,
  PlayerEffectKind,
  ServerState,
} from '@game/frenzy/types';

import { applyClick } from '../engine/apply-click';
import { applyEmissions } from '../engine/apply-emissions';
import { applyTick } from '../engine/apply-tick';
import { calculateStage } from '../engine/calculate-stage';
import { accrueAnger } from '../engine/npc/angry-bomb/anger';
import { TEST_BODY } from './test-body';

// Golden master for the whole engine (phase 0 of the theme-agnostic refactor): one deterministic ~600-tick
// scenario drives every item type through its click/collide/land path, both auras, a click-detonated bomb, a
// deliberate ram (bump), the NPC's poke→rage-blast cycle and a decay faint — then freezes the full event stream
// and periodic state hashes as committed snapshots. Phases 1–5 of the refactor must keep these snapshots
// byte-identical; regenerating them is only legal for a DELIBERATE behaviour change.
//
// Engine-level on purpose: every entry point takes injectable `rng`/`now`/`createId`, so the run is fully
// deterministic without mocking globals (no fake timers, no Math.random spy). The one exception is `createNpc`
// (hardwired `crypto.randomUUID`), so the NPC is built as a literal mirroring its shape.

const TICK_MS = 1000 / FRENZY.tickRateHz;
const TICK_SECONDS = 1 / FRENZY.tickRateHz;
const DECAY_EVERY_N_TICKS = (FRENZY.decayIntervalMs / 1000) * FRENZY.tickRateHz;
const TOTAL_TICKS = 600;
const HASH_EVERY_N_TICKS = 50;

// Scripted order: hp-positive types first so the hunter is fattened up before the damaging ones hit it (it must
// survive the whole timeline), explosives last. One scripted moment per type per path, spaced so outcomes settle.
const ITEM_TYPES: readonly ItemType[] = [
  'food',
  'rareCandy',
  'goldenBerry',
  'crumb',
  'mushroom',
  'vitamin',
  'shield',
  'easterEgg',
  'rotten',
  'poop',
  'rock',
  'brick',
  'bomb',
];
const SCRIPT_STEP_TICKS = 4;
const COLLIDE_BASE_TICK = 20;
const CLICK_BASE_TICK = 100;
const LAND_BASE_TICK = 180;
const JUGGLE_BOMB_TICK = 320;
const RAM_TICK = 350;
const NPC_SPAWN_TICK = 380;
const NPC_POKE_FIRST_TICK = 382;
const NPC_POKE_LAST_TICK = 393;
const LAYING_AURA_TICK = 430;
const POOPING_AURA_TICK = 500;
const AURA_DURATION_MS = 5_000;

const HUNTER_ID = 'gm-hunter';
const RIVAL_ID = 'gm-rival';
const STARVING_ID = 'gm-starving';
const NPC_ID = 'gm-npc';
const JUGGLE_BOMB_ID = 'gm-juggle-bomb';

type RecordedEvent = GameEvent | { type: 'spawned'; item: Item };

interface ScenarioRun {
  events: [number, RecordedEvent][];
  hashes: [number, number][];
}

// Deterministic LCG (numerical-recipes constants) — the engine's only entropy source for the run.
function makeRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;

    return value / 2 ** 32;
  };
}

// djb2 over the serialized state — cheap, stable fingerprint for the periodic state snapshots.
function hashState(state: ServerState): number {
  const text = JSON.stringify(state);
  let hash = 5381;

  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(hash, 33) ^ text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function human(id: string, x: number, y: number, hp: number): HumanPlayer {
  return {
    kind: 'human',
    id,
    name: id,
    appearance: 'pidgey',
    body: TEST_BODY,
    stage: calculateStage(hp, TEST_BODY),
    hp,
    mana: 0,
    x,
    y,
    vx: 0.01,
    vy: 0.005,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: 0,
    effects: [],
    scores: {},
  };
}

// Literal mirror of `createNpc` with a fixed id/position (its id comes from a non-injectable randomUUID).
function npcLiteral(now: number): NpcPlayer {
  return {
    kind: 'npc',
    npcKind: 'angryBomb',
    id: NPC_ID,
    name: ANGRY_BOMB.appearance,
    appearance: ANGRY_BOMB.appearance,
    body: ANGRY_BOMB.body,
    stage: calculateStage(ANGRY_BOMB.startingHp, ANGRY_BOMB.body),
    hp: ANGRY_BOMB.startingHp,
    mana: ANGRY_BOMB.startingMana,
    x: 0.5,
    y: FRENZY.npc.floorY,
    vx: 0,
    vy: 0,
    status: 'alive',
    disconnectedAt: null,
    joinedAt: now,
    effects: [],
    scores: {},
  };
}

function runScenario(): ScenarioRun {
  const random = makeRandom(0xc0_ff_ee);
  let itemCounter = 0;
  const createId = (): string => `gm-item-${(itemCounter += 1)}`;
  let now = 1_750_000_000_000;
  let state: ServerState = {
    // No spawn-shield on purpose (players are literals): collide-path damage must actually land.
    players: [
      human(HUNTER_ID, 0.3, 0.4, 150),
      human(RIVAL_ID, 0.7, 0.35, 120),
      // Faints on its 4th decay step (tick 120): 7 − 4×decayPerTick(2) < 0 — the decay-faint coverage.
      human(STARVING_ID, 0.5, 0.7, 7),
    ],
    items: [],
    tick: 0,
  };
  let schedule: ReadonlyMap<string, number> = new Map<string, number>();
  let npcPokeTimestamps: readonly number[] = [];
  const events: [number, RecordedEvent][] = [];
  const hashes: [number, number][] = [];

  const record = (tick: number, batch: readonly RecordedEvent[]): void => {
    for (const event of batch) {
      events.push([tick, event]);
    }
  };

  const addItem = (item: Item): void => {
    state = { ...state, items: [...state.items, item] };
  };

  const hunterPosition = (): { x: number; y: number } => {
    const hunter = state.players.find((player) => player.id === HUNTER_ID);

    return { x: hunter?.x ?? 0.3, y: hunter?.y ?? 0.4 };
  };

  const click = (tick: number, itemId: string, nudgeX?: number, nudgeY?: number): void => {
    const result = applyClick(state, HUNTER_ID, itemId, nudgeX, nudgeY, random, now);

    state = result.state;
    record(tick, result.events);
  };

  // Drop an item right onto the hunter so this tick's collision pass resolves it.
  const injectCollideItem = (type: ItemType): void => {
    const { x, y } = hunterPosition();

    addItem({ id: createId(), type, x, y, vy: FRENZY.fallSpeed[type] });
  };

  // Park an item away from the actors and have the hunter click it the same tick (click wins the race by
  // running before the tick's collision pass).
  const injectAndClickItem = (tick: number, type: ItemType): void => {
    const id = createId();

    addItem({ id, type, x: 0.85, y: 0.25, vy: FRENZY.fallSpeed[type] });
    // A bomb click is a shove and needs a direction; other types ignore the nudge arguments.
    click(tick, id, type === 'bomb' ? 1 : undefined, type === 'bomb' ? -0.5 : undefined);
  };

  // Drop an item a hair above its own seabed line so the next tick lands it (explosives detonate on landing,
  // everything else rests `itemRestMs` and later expires through the landing pass).
  const injectLandingItem = (type: ItemType, index: number): void => {
    const id = createId();

    addItem({
      id,
      type,
      x: 0.08 + index * 0.06,
      y: restYFor(id) - 0.005,
      vy: FRENZY.fallSpeed[type],
    });
  };

  // Mirror of the room's handlePokeNpc: window the pokes, add the superlinear gain, clamp to max.
  const pokeNpc = (): void => {
    const npc = state.players.find((player) => player.id === NPC_ID);

    if (npc === undefined || npc.status !== 'alive') {
      return;
    }

    const accrual = accrueAnger(npcPokeTimestamps, now, FRENZY.npc.anger);

    npcPokeTimestamps = accrual.timestamps;

    const mana = Math.min(FRENZY.npc.anger.max, npc.mana + accrual.gain);

    state = {
      ...state,
      players: state.players.map((player) => (player.id === NPC_ID ? { ...player, mana } : player)),
    };
  };

  const grantAura = (kind: PlayerEffectKind): void => {
    state = {
      ...state,
      players: state.players.map((player) =>
        player.id === HUNTER_ID
          ? { ...player, effects: [...player.effects, { kind, expiresAt: now + AURA_DURATION_MS }] }
          : player,
      ),
    };
  };

  // Teleport the rival into overlap with the hunter and set BOTH velocities head-on, so the closing speed along
  // the contact normal (0.10) clears the bump threshold no matter what the hunter's drift was doing by now.
  const ramHunter = (): void => {
    const { x, y } = hunterPosition();

    state = {
      ...state,
      players: state.players.map((player) => {
        if (player.id === RIVAL_ID) {
          return { ...player, x: x + 0.02, y, vx: -0.06, vy: 0 };
        }

        if (player.id === HUNTER_ID) {
          return { ...player, vx: 0.04, vy: 0 };
        }

        return player;
      }),
    };
  };

  const scriptTick = (tick: number): void => {
    for (const [index, type] of ITEM_TYPES.entries()) {
      if (tick === COLLIDE_BASE_TICK + index * SCRIPT_STEP_TICKS) {
        injectCollideItem(type);
      }

      if (tick === CLICK_BASE_TICK + index * SCRIPT_STEP_TICKS) {
        injectAndClickItem(tick, type);
      }

      if (tick === LAND_BASE_TICK + index * SCRIPT_STEP_TICKS) {
        injectLandingItem(type, index);
      }
    }

    if (tick === JUGGLE_BOMB_TICK) {
      // Two clicks in the budget: the first shove spends one, the second would drop it below 1 → detonates.
      addItem({ id: JUGGLE_BOMB_ID, type: 'bomb', x: 0.6, y: 0.3, vy: 0, clicksLeft: 2 });
    }

    if (tick === JUGGLE_BOMB_TICK + 1) {
      click(tick, JUGGLE_BOMB_ID, 1, 0);
    }

    if (tick === JUGGLE_BOMB_TICK + 2) {
      click(tick, JUGGLE_BOMB_ID, -1, 0);
    }

    if (tick === RAM_TICK) {
      ramHunter();
    }

    if (tick === NPC_SPAWN_TICK) {
      state = { ...state, players: [...state.players, npcLiteral(now)] };
    }

    if (tick >= NPC_POKE_FIRST_TICK && tick <= NPC_POKE_LAST_TICK) {
      pokeNpc();
    }

    if (tick === LAYING_AURA_TICK) {
      grantAura('laying');
    }

    if (tick === POOPING_AURA_TICK) {
      grantAura('pooping');
    }
  };

  for (let tick = 1; tick <= TOTAL_TICKS; tick += 1) {
    now += TICK_MS;
    scriptTick(tick);

    // Mirrors the room's gameTick order: the tick passes first, then the aura emissions.
    const result = applyTick(state, TICK_SECONDS, tick % DECAY_EVERY_N_TICKS === 0, random, now);

    state = { ...result.state, tick };
    record(tick, result.events);

    const emission = applyEmissions(state, now, schedule, random, createId);

    schedule = emission.schedule;

    if (emission.spawned.length > 0) {
      state = emission.state;
      record(
        tick,
        emission.spawned.map((item) => ({ type: 'spawned' as const, item })),
      );
    }

    if (tick % HASH_EVERY_N_TICKS === 0) {
      hashes.push([tick, hashState(state)]);
    }
  }

  return { events, hashes };
}

describe('golden master — deterministic 600-tick engine scenario', () => {
  it('freezes the full event stream', () => {
    expect(runScenario().events).toMatchSnapshot();
  });

  it('freezes periodic state hashes', () => {
    expect(runScenario().hashes).toMatchSnapshot();
  });

  it('replays identically from the same seed (determinism without snapshots)', () => {
    const first = runScenario();
    const second = runScenario();

    expect(second.events).toEqual(first.events);
    expect(second.hashes).toEqual(first.hashes);
  });

  // Guards the scenario itself: if a future edit silently degenerates the timeline (an actor dies early, a path
  // stops firing), this fails with a readable message instead of an opaque snapshot diff.
  it('exercises the full behaviour surface', () => {
    const seen = new Set(runScenario().events.map(([, event]) => event.type));

    for (const expected of [
      'eaten',
      'evolved',
      'fainted',
      'detonated',
      'effectGranted',
      'bumped',
      'itemNudged',
      'spawned',
    ]) {
      expect([...seen], `event type "${expected}" never fired`).toContain(expected);
    }
  });
});
