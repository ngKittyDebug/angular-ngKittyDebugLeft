// Pure per-item tumble/sway derivation. Each falling item gets a steady spin whose speed and direction are
// derived from its id, so the value is stable across frames (the CSS animation isn't restarted) yet varies item
// to item. Free of Angular so it can be unit-tested directly.

import type { ItemType } from '@game/frenzy/types';

const ITEM_SPIN_MIN_MS = 1800;
const ITEM_SPIN_MAX_MS = 5500;
// The shield rocks rather than tumbles, and reads better swaying briskly — give it a shorter cycle than the spinners.
const ITEM_SWAY_MIN_MS = 900;
const ITEM_SWAY_MAX_MS = 1800;

export function spinFor(id: string, type: ItemType): { durationMs: number; reverse: boolean } {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  const magnitude = Math.abs(hash);
  const [minMs, maxMs] =
    type === 'shield' ? [ITEM_SWAY_MIN_MS, ITEM_SWAY_MAX_MS] : [ITEM_SPIN_MIN_MS, ITEM_SPIN_MAX_MS];

  return {
    durationMs: minMs + (magnitude % (maxMs - minMs)),
    reverse: (magnitude & 1) === 1,
  };
}
