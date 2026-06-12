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
  spriteHeight: string;
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

export interface ItemClick {
  itemId: string;
  /** Bomb bat input: signed normalized horizontal displacement (fixed pixel step ÷ world width). Undefined for non-bomb items. */
  nudgeX?: number;
}
