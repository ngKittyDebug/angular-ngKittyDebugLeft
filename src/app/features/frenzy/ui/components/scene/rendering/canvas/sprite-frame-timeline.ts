// Pure frame-picker for the canvas players-pass GIF decoder: maps a wall-clock time to the frame index that should
// be showing, so a decoded sprite loops forever off the free-running draw clock with no per-sprite playback state.
// `ends` are the cumulative frame-END times (ms), strictly increasing, last = the full loop duration. Time wraps
// into `[0, total)` — including negative inputs — so any `now` (even before the sprite first decoded) maps to a
// valid frame. Unit-tested; the source (a hidden `<img>`) froze on canvas, so we drive the animation ourselves.

export function frameIndexAt(ends: readonly number[], elapsedMs: number): number {
  const total = ends.at(-1) ?? 0;

  if (total <= 0) {
    return 0;
  }

  // Euclidean modulo: a negative `elapsedMs` still maps into [0, total) (`-1` → the last frame, not a negative index).
  const wrapped = ((elapsedMs % total) + total) % total;

  for (let index = 0; index < ends.length; index += 1) {
    if (ends[index] > wrapped) {
      return index;
    }
  }

  // Unreachable for a well-formed (strictly increasing, positive) `ends` since `wrapped < total = ends.at(-1)`;
  // a safety net so a malformed timeline returns the last frame rather than -1.
  return ends.length - 1;
}
