# 3. Frame-aware reconciliation τ for the own-sprite glide

Date: 2026-06-16

Status: Accepted

## Context

When a server snapshot corrects the local Pokémon, the client doesn't snap it to the authoritative position —
it captures the visual gap as an offset and decays that offset toward 0 so the sprite glides onto the correct
track. The decay is wall-clock exponential: `offset(t) = offset0 · exp(-(now - stamp) / τ)`, with `τ = 90ms`
(`OFFSET_DECAY_TAU_MS`), a glide of ~3τ ≈ 270ms.

Wall-clock decay is frame-rate-independent in _wall time_, but the eye sees _frames_. At 60fps a 270ms glide is
~16 smooth steps. On the weak Lenovo tablet at ~17–27fps, the frame interval is ~37–59ms, so the first frame
after a correction collapses up to ~half the gap in a single step — the "rubber-band snap" the player reported
(the sprite races ahead under steering prediction, then jerks back when the snapshot lands). Measured tablet FPS
sat at 17–27; raising it cheaply proved infeasible (the per-frame cost is intrinsic O(actors) extrapolation, and
GPU work isn't the bottleneck — see ADR 0001/0002). So the snap had to be fixed independently of FPS.

## Decision

Make the reconciliation τ **frame-aware**: raise it on a slow client so that no single frame decays the offset
by more than a fixed fraction (`MAX_OFFSET_COLLAPSE_PER_FRAME = 0.2`), i.e. the glide always spans enough frames
to read as smooth regardless of frame rate.

- A pure `frameAwareTau(baseτ, frameIntervalMs)` (in `drift-math`) returns `max(baseτ, k · frameIntervalMs)`,
  where `k = 1 / -ln(1 - collapse)` makes the per-frame decay factor `exp(-frameMs/τ) ≥ 1 - collapse`. At 60fps
  the base τ already clears the floor, so it's returned unchanged — desktop/Pixel behaviour is untouched.
- `PlayerExtrapolatorService` measures the smoothed frame interval (a light EMA, weight 0.2) from the `tick`
  cadence only — never from `ingest`, which runs on the ~300ms snapshot cadence and isn't a frame. Pathological
  deltas (≤0, or a stall/GC pause > 250ms ≈ 4fps) are skipped so a backgrounded tab can't bloat the estimate and
  freeze the glide. The derived `τ` is stored once per frame and read by `compute`/`sync`/`predictSteer`, so every
  reconciliation read in a frame agrees (the property the stateless `decayedOffset` was built to preserve).

The decay stays the same closed-form, stateless exponential — only the τ it's evaluated with adapts. The two
rejected alternatives both gave that up: a per-frame multiplicative decay (mutating the offset each tick) breaks
the "two readers in a frame agree" guarantee; and a prediction-lead cap addresses gap _magnitude_, not the glide
_shape_ that produces the snap (the measured gap was only yellow, 20–50px). The lead cap remains available as a
follow-up if the artefact persists.

## Consequences

- **Positive:** the snap is bounded on any device — at worst 20% of the gap closes per frame — without changing
  the smooth 60fps feel. Self-contained: a pure math function plus an interval estimate, fully reversible, no new
  per-frame change detection (the τ field is read inside the existing extrapolation).
- **Negative / trade-offs:**
  - On a slow client the sprite now takes more _wall-clock_ time to catch up to the authoritative track (the glide
    stretches): smoothness is bought with a little more positional lag. This is the intended netcode trade-off —
    a smooth glide that lands slightly late beats a correct-but-jarring snap for this game.
  - The EMA lags a sudden FPS change by ~5–10 frames, so a correction during an abrupt dip can still snap a touch
    until the estimate catches up. Acceptable for a smoothing aid; the cap holds in steady state.
  - `MAX_OFFSET_COLLAPSE_PER_FRAME` (0.2) and the EMA weight (0.2) are tuning constants; revisit by playtest if the
    glide feels too slow (lag) or too snappy (cap too loose) on the tablet.
- **Validation:** unit-tested at the math layer (`frameAwareTau` cap invariant) and the service layer (a warmed
  slow-client correction glides within the cap). Subjective rubber-band + `?debug=perf` gap to be confirmed on the
  tablet.
