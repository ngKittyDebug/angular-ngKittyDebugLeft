import { FRENZY, isItemEnabled } from '@game/frenzy/config';
import type { Item, ItemType, PlayerEffectKind, ServerState } from '@game/frenzy/types';

import { pickItemType } from './pick-item-type';

export interface EmissionResult {
  state: ServerState;
  /** Newly emitted items, so the caller can broadcast a `spawned` event per item. */
  spawned: Item[];
}

/**
 * Per-emitting-effect config: which aura triggers it, which `FRENZY` block holds its launch tunables and the pool it
 * draws an item type from. Order matters — for a player the FIRST matching active effect wins, so a Pokémon that
 * somehow holds both auras can never emit twice in one tick. Each aura sprays its OWN curated pool (not the world
 * `spawnWeights`): `laying` the all-positive `eggEmitWeights` (a treat — no nasties, no bomb, no aura items),
 * `pooping` the nasty `poopEmitWeights` (rock/brick/bomb). Both still respect feature flags via `isItemEnabled`.
 */
const EMITTERS: readonly {
  kind: PlayerEffectKind;
  config: {
    emitChancePerTick: number;
    emitBack: number;
    emitDown: number;
    emitBackSpeed: number;
    emitAngleJitter: number;
  };
  pickType: (rng: () => number) => ItemType;
}[] = [
  {
    kind: 'laying',
    config: FRENZY.easterEgg,
    pickType: (rng) => pickItemType(rng, isItemEnabled, FRENZY.eggEmitWeights),
  },
  {
    kind: 'pooping',
    config: FRENZY.poop,
    pickType: (rng) => pickItemType(rng, isItemEnabled, FRENZY.poopEmitWeights),
  },
];

/**
 * Item emissions: each alive Pokémon under an emitting aura (`laying` from the easter egg, `pooping` from the poop)
 * has a per-tick chance to spray out a falling item. The item spawns at the body's lower-rear EDGE — offset by half
 * the body size (so it clears the sprite at any stage) plus a small gap behind the heading and below the bottom edge
 * — and is launched backward (opposite the heading) with a small random angle jitter (`emitAngleJitter`), so a burst
 * fans out in a cone from behind the layer rather than flinging every item out along the exact same line.
 * Emitted items carry `ownerId`, so the layer is immune to them (collision and bomb blast skip the owner). Pure —
 * `rng` and `createId` are injected for tests.
 */
export function applyEmissions(
  state: ServerState,
  rng: () => number = Math.random,
  createId: () => string = () => crypto.randomUUID(),
): EmissionResult {
  const spawned: Item[] = [];
  const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

  for (const player of state.players) {
    if (player.status !== 'alive') {
      continue;
    }

    // First matching emitter wins — a player can never double-emit even if holding both auras.
    const emitter = EMITTERS.find((candidate) =>
      player.effects.some((effect) => effect.kind === candidate.kind),
    );

    if (emitter === undefined || rng() >= emitter.config.emitChancePerTick) {
      continue;
    }

    const type = emitter.pickType(rng);
    // Heading: +1 facing right, -1 facing left (default right when idle). Items fly the opposite way (behind).
    const heading = player.vx < 0 ? -1 : 1;
    // Spawn from the body edge, not the centre: half the body size (normalized) + a small gap behind/below.
    const stageBody = player.body[player.stage];
    const halfWidthNorm = stageBody.width / 2 / FRENZY.world.width;
    const halfHeightNorm = stageBody.height / 2 / FRENZY.world.height;
    // The bomb is a heavy drifting mine with its own low speed cap — launch it far gentler than the light rock/brick
    // (which keep the shared `emitBackSpeed`), so it eases out near its cap instead of shooting out and snapping back.
    const backSpeed = type === 'bomb' ? FRENZY.bomb.emitBackSpeed : emitter.config.emitBackSpeed;
    // Base launch: backward (opposite heading) + downward. Rotate the vector by a small random angle so a burst of
    // emissions fans out in a cone instead of every item flying the identical way and lining up (most obvious with
    // the heavy bombs). Rotation preserves the launch speed, so the bomb stays under its drift cap.
    const baseVx = -heading * backSpeed;
    const baseVy = FRENZY.fallSpeed[type];
    const angle = (rng() - 0.5) * 2 * emitter.config.emitAngleJitter;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    spawned.push({
      id: createId(),
      type,
      x: clamp01(player.x - heading * (halfWidthNorm + emitter.config.emitBack)),
      y: clamp01(player.y + halfHeightNorm + emitter.config.emitDown),
      vx: baseVx * cos - baseVy * sin,
      vy: baseVx * sin + baseVy * cos,
      ownerId: player.id,
    });
  }

  if (spawned.length === 0) {
    return { state, spawned };
  }

  return { state: { ...state, items: [...state.items, ...spawned] }, spawned };
}
