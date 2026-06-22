import { linkedSignal } from '@angular/core';
import type { WritableSignal } from '@angular/core';

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
  const state = linkedSignal<boolean>(() => readStored(key) ?? fallback());
  // linkedSignal re-derives via its own internal write, never through the public `set`/`update` — so wrapping those
  // persists on user toggles only, leaving the reactive default free to track `fallback` until then.
  const baseSet = state.set.bind(state);
  const baseUpdate = state.update.bind(state);

  state.set = (value: boolean): void => {
    baseSet(value);
    writeStored(key, value);
  };
  state.update = (updater: (value: boolean) => boolean): void => {
    baseUpdate(updater);
    writeStored(key, state());
  };

  return state;
}

function readStored(key: string): boolean | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(key);

  // Only the two values we ever write count as a stored choice; anything else (missing or corrupt) falls back.
  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  return null;
}

function writeStored(key: string, value: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(key, String(value));
}
