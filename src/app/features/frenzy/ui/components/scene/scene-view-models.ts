// View models the scene renders each frame, derived from the authoritative server state by the extrapolator
// services. Plain data — kept framework-free so the extrapolators and their specs share one source of truth.

import type { Item, Stage } from '@game/frenzy/types';

export interface RenderedPlayer {
  appearance: string;
  effectAuras: readonly string[];
  facingRight: boolean;
  id: string;
  isDisconnected: boolean;
  isEvolving: boolean;
  isMe: boolean;
  isSad: boolean;
  // True for the angry-bomb NPC (kind === 'npc'). Phase 5 reads it to make the sprite clickable (poke) and skip
  // the human-only chrome (poke button, crown). False for humans.
  isNpc: boolean;
  // Normalized NPC anger (mana / FRENZY.npc.anger.max, clamped 0..1); 0 for humans. Phase 5 reads it to redden
  // the NPC sprite as it rages.
  npcAnger: number;
  label: string;
  hp: number;
  // Full-art render box (px strings) and the offset (px) that shifts the art so its body sits on the actor point.
  spriteWidth: string;
  spriteHeight: string;
  spriteOffsetX: number;
  spriteOffsetY: number;
  // Body hitbox box (px strings) — the collidable torso, centred on the point. Drawn by the `?debug` overlay.
  hitboxWidth: string;
  hitboxHeight: string;
  // Current drift speed (|velocity|, normalized units/sec, 4 decimals) — shown by the `?debug` overlay readout.
  debugSpeed: string;
  // X/Y offsets (px, world units) from the actor point to the art box's top-left corner — anchor the `?debug`
  // readout's bottom-left there so the pill sits flush on the box top, left-aligned to the sprite. Track each box
  // (vary per sprite/stage with the render size + centring offset).
  debugReadoutOffsetX: string;
  debugReadoutOffsetY: string;
  stage: Stage;
  x: number;
  y: number;
}

export interface RenderedItem {
  id: string;
  type: Item['type'];
  x: number;
  y: number;
  landed: boolean;
  spinDurationMs: number;
  spinReverse: boolean;
  // Current drift speed (|velocity|, normalized units/sec, 4 decimals) — set only for the bomb (the one item that
  // drifts under physics), shown by the `?debug` speed readout. Undefined for plain fallers.
  debugSpeed?: string;
  // Hidden shove budget left on a mine (set only for the bomb; undefined for aura-emitted mines and other items).
  // Drives the sensor-light chase speed: fewer clicks left → faster running lights (see scene-item).
  clicksLeft?: number;
}

export interface BubbleBurst {
  id: number;
  x: number;
  y: number;
}

export interface SandPuff {
  id: number;
  /** The item that kicked it up — lets the puff tint its grains per type (e.g. orange debris for a bomb). */
  type: Item['type'];
  /** Normalized x,y where the item touched down (y is its per-item seabed rest line, not always 1). */
  x: number;
  y: number;
  /** Render intensity (cloud size/opacity) from the item type's `sandPuffWeightFor`. */
  weight: number;
}

export interface ItemClick {
  itemId: string;
  /** Bomb shove input: a 2D direction pointing AWAY from the tapped side (tap right → push left, tap top → push down); the server applies a fixed impulse along it. Undefined for non-bomb items. */
  nudgeX?: number;
  nudgeY?: number;
}
