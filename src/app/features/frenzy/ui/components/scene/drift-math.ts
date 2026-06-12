// Pure motion math for the scene's client-side extrapolation and snapshot reconciliation. Kept free of Angular
// so it can be unit-tested directly: drift position/direction (mirroring the server's bounce) and the decaying
// offset that smooths a snapshot correction.

// Closed-form reflective ("ping-pong") drift along one axis: mirrors the server's bounce so the
// client can extrapolate between snapshots smoothly instead of stepping each snapshot.
export function reflect(p0: number, v: number, elapsedSeconds: number, min: number, max: number): number {
  const span = max - min;

  if (span <= 0) {
    return min;
  }

  const period = span * 2;
  const offset = p0 - min + v * elapsedSeconds;
  const wrapped = ((offset % period) + period) % period;

  return min + (wrapped <= span ? wrapped : period - wrapped);
}

// Instantaneous horizontal direction of the reflective drift (+1 right, -1 left, 0 stationary):
// the sign of the derivative of `reflect`, which flips on every wall bounce.
export function reflectDirection(
  p0: number,
  v: number,
  elapsedSeconds: number,
  min: number,
  max: number,
): number {
  const span = max - min;

  if (v === 0 || span <= 0) {
    return 0;
  }

  const period = span * 2;
  const offset = p0 - min + v * elapsedSeconds;
  const wrapped = ((offset % period) + period) % period;

  return Math.sign(v) * (wrapped <= span ? 1 : -1);
}

// Reconciliation smoothing time-constant (ms): when a snapshot corrects a player, the visual gap is carried as
// an offset that decays toward 0 with this τ. The glide is ~3τ ≈ 270ms — long enough to read as smooth, short
// enough that the sprite never lags meaningfully behind the authoritative track.
export const OFFSET_DECAY_TAU_MS = 90;

// Frame-rate-independent exponential decay of a reconciliation offset toward 0. The offset is a pure function of
// elapsed wall-time since it was set (not mutated per frame), so two readers in the same frame agree and there's
// no accumulation error. A long stall (backgrounded tab → huge dt) underflows cleanly to ~0 rather than NaN.
export function decayedOffset(offset0: number, dtMs: number, tauMs: number): number {
  if (offset0 === 0) {
    return 0;
  }

  return offset0 * Math.exp(-Math.max(0, dtMs) / tauMs);
}
