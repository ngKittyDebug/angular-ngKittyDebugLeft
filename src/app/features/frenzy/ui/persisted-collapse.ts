import { inject, linkedSignal } from '@angular/core';
import type { WritableSignal } from '@angular/core';

import { FrenzyStorageService } from '../data/services/frenzy-storage.service';

// Per-panel localStorage keys for HUD-panel collapse state (see CONTEXT.md "Persisted collapse"). Each HUD panel
// owns exactly one; kept next to the helper that reads/writes them so the storage shape has a single source.
export const COLLAPSE_KEY = {
  leaderboard: 'frenzy-leaderboard-collapsed',
  minimap: 'frenzy-minimap-collapsed',
  legend: 'frenzy-legend-collapsed',
  perfReadout: 'frenzy-perf-readout-collapsed',
} as const;

/**
 * A HUD panel's persisted collapse state as a single writable signal — the shared deep seam that hides the DI/storage
 * so the panel stays free of cross-cutting injects (ADR 0004 §3). It seeds from the stored value (the responsive
 * `fallback` when none is stored) and writes through to localStorage ONLY on an explicit `set`/`update`. Crucially it
 * does NOT persist when it re-derives its default: a panel with no stored choice keeps following `fallback`
 * reactively (e.g. the minimap/legend tracking the breakpoint) until the user actually toggles it, after which the
 * stored choice wins over the fallback — exactly the `linkedSignal(() => stored ?? fallback())` behaviour each panel
 * used to inline against `PlayerPersistenceService`.
 */
export function persistedCollapse(key: string, fallback: () => boolean): WritableSignal<boolean> {
  const storage = inject(FrenzyStorageService);
  const state = linkedSignal<boolean>(() => readStored(storage, key) ?? fallback());
  // linkedSignal re-derives via its own internal write, never through the public `set`/`update` — so wrapping those
  // persists on user toggles only, leaving the reactive default free to track `fallback` until then.
  const baseSet = state.set.bind(state);
  const baseUpdate = state.update.bind(state);

  state.set = (value: boolean): void => {
    baseSet(value);
    writeStored(storage, key, value);
  };
  state.update = (updater: (value: boolean) => boolean): void => {
    baseUpdate(updater);
    writeStored(storage, key, state());
  };

  return state;
}

function readStored(storage: FrenzyStorageService, key: string): boolean | null {
  const raw = storage.getString(key);

  // Only the two values we ever write count as a stored choice; anything else (missing or corrupt) falls back.
  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  return null;
}

function writeStored(storage: FrenzyStorageService, key: string, value: boolean): void {
  storage.setString(key, String(value));
}
