# 2. Off-screen culling of Frenzy items (items only, change-gated)

Date: 2026-06-16

Status: Accepted

## Context

The Frenzy world is a fixed 2400×900 px arena; the camera shows only a slice of it (on a tablet, roughly the
middle ~half horizontally). Every falling item was rendered regardless of whether it was inside that slice. Items
accumulate and rest along the seabed across the **full** world width, so at any moment a large share of them sit
off-screen — yet each still had a DOM subtree to composite and a per-frame imperative `translate` write (ADR 0001).

On-device measurement after ADR 0001 (weak Lenovo tablet, `?debug=perf`) showed FPS ~17–27, with the floor and the
residual steering "rubber-band" both worst **in places with item clusters** — i.e. the cost scales with rendered
item count. Players showed no such correlation (they are few — typically 2–5 — and after ADR 0001 their per-frame
cost is a single `translate` write each).

`content-visibility: auto` was rejected upfront: it skips layout/paint but does **not** stop Angular change
detection, and CD is the established bottleneck. Culling therefore has to be a real conditional render (`@if`),
removing the component from the `@for`.

## Decision

Cull **items only**, gated so culling never reintroduces per-frame change detection.

- A `SceneItemCullingService` exposes a `visibleIds` signal. Each animation frame the scene calls `update(snapshot,
itemFrame)`: it inverts the camera projection into normalized world bounds (`visibleNormBounds` in `camera-math`,
  expanded by a 160px screen margin) and builds the set of item ids inside them. It re-`set`s the signal **only
  when the set's membership actually changes** — i.e. when an item crosses the margin boundary. A stable visible
  set (the common case, helped by the camera dead-zone and the margin's hysteresis) never touches the signal, so
  the `@for` re-diffs on crossings, not every frame. The per-frame in/out test itself is cheap pure arithmetic.
- The items `@for` iterates a `visibleItemsByDepth` computed — the depth-sorted list with culled items already
  filtered out — rather than gating each item with a template `@if` (which would have pushed the scene template
  past the cyclomatic-complexity lint limit and re-run a per-item method on every check). The computed depends on
  the cull signal, so it re-filters exactly when the visible set changes. `visibleIds` is `null` until the
  camera's first frame is ready, and `null` means "render everything" — so the first paint (which happens before
  the rAF loop runs) is never a blank flash.
- **Players are deliberately not culled.** Post-ADR-0001 the saving would be negligible (few players, already off
  change detection), while the risk and complexity are real: large evolved sprites anchored just off-screen would
  pop in unless given a much larger margin, and each player carries overlays (owned-float column, impact sparks,
  shield cues, crown) plus the off-screen indicators that must keep pointing at them. The indicators already read
  the full authoritative `players()` list, not the rendered DOM, so they are unaffected either way.

## Consequences

- **Positive:** in a wide arena most off-screen items render no DOM and take no per-frame `translate` write —
  fewer composited layers and less style recalc, concentrated exactly in the item-cluster scenario that measured
  worst. Anti-pop is inherited from ADR 0001: an item re-entering the window registers and is positioned from the
  last frame before paint.
- **Negative / trade-offs:**
  - The margin (160px) is a fixed tuning constant: too small risks edge pop-in, too large weakens the cull. Chosen
    at ~2.5 item-widths; revisit by playtest if pop-in shows.
  - An item straddling the boundary while the camera scrolls toggles in/out, each toggle a small `@for` re-diff
    (one node add/remove). Bounded by the camera dead-zone + margin hysteresis; accepted as cheap.
  - Off-screen item taps are impossible — a non-issue, the item isn't visible.
- **Not done here:** player culling (judged not worth it above) and frame-aware reconciliation (tracked
  separately) remain. The normalized-bounds math assumes the constant world-px positioning parent of ADR 0001.
