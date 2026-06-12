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
  // Current drift speed (|velocity|, normalized units/sec, 2 decimals) — shown by the `?debug` overlay readout.
  debugSpeed: string;
  // Y offset (px, world units) from the actor point to sit the `?debug` readout just above the native (art) box's
  // top edge — varies per sprite/stage with the render height + centring offset, so it tracks each box.
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
  /** Bomb bat input: signed normalized horizontal displacement (fixed pixel step ÷ world width). Undefined for non-bomb items. */
  nudgeX?: number;
}
