# 2. Off-screen item culling by skipping writes (soft cull), not conditional render

Date: 2026-06-16

Status: Accepted

## Context

The Frenzy world is fixed at 2400×900px; the camera follows the player and shows only a slice, so in a busy
game roughly half the falling items are off-screen at any moment. After ADR 0001 took actor positions off Angular
change detection, every actor — on- or off-screen — still costs one `element.style.translate` write per animation
frame (a compositor update). On the weak Lenovo tablet that per-frame write loop is part of the main-thread budget
that caps FPS, so cutting the off-screen writes is a lever worth pulling.

The obvious implementation — **conditional render** (`@if` "is this actor on-screen" inside the `@for`) — was
built and reverted (commits `11f13e8` → `9915530`). It made the scene jerk while scrolling: panning the camera
drags the visible rect across the world every frame, so items continuously cross the margin boundary, and each
crossing makes Angular create/destroy a `SceneItemComponent` (sprite + `afterNextRender` host registration)
mid-scroll. The churn — plus a per-frame bbox test and `Set` allocation — spiked exactly during the camera pans
it was meant to make cheaper. (An earlier deleted ADR 0002 recorded that conditional-render attempt; this ADR
replaces it with the approach that actually held.)

## Decision

Cull by **skipping the per-frame position write** for off-screen items, while keeping their DOM nodes mounted.

- `visibleNormBounds` (pure, in `camera-math`) inverts the camera projection to the normalized world rectangle
  visible this frame, widened by a screen-px margin (`CULL_MARGIN_PX`). `SceneCameraService.visibleBounds()`
  exposes it from the cached projection state (null before the first frame snaps the camera → cull nothing).
- `SceneActorRegistryService.writeItems(frame, visible)` skips `writeTranslate` for any item outside those bounds.
  The node stays in the DOM at its last-written `translate` (frozen, but it's off-screen so the freeze is never
  seen); the moment it re-enters the **margin band** — still past the true viewport edge — writing resumes, so it
  is already at its current position by the time it scrolls into view. No pop-in, and crucially **no view
  create/destroy churn**, because the `@for` is untouched.
- **Items only.** Players are few (≤20, usually a handful) and carry owned-float columns that ride their drift;
  culling them saves little and risks float desync. The numerous off-screen actors are items.

This is deliberately **not** `content-visibility: auto` either: that skips paint (a GPU saving) but leaves the
work this targets — the per-frame style write and its compositor update — in place, and GPU fill-rate was already
shown not to be the bottleneck (ADR 0001 / removing blur didn't move FPS).

## Consequences

- **Positive:** off-screen items cost nothing per frame beyond the (cheap, pure-JS) extrapolation that still feeds
  `frame()` for everything that reads it (sand-puffs, perf gap, the depth sort). Self-contained and fully
  reversible — a pure bounds function plus an optional argument threaded through the facade; no template change,
  no new change detection. Subjectively a clear smoothness win on the tablet.
- **Negative / trade-offs:**
  - The cull only helps when items are **off-screen**. It does nothing for the dense **on-screen** clusters that
    set the FPS floor (~17fps on the tablet) — there every item is visible and must be written. That floor is a
    separate, harder problem (actor count, not culling), and this decision does not pretend to address it.
  - The bounds read in the rAF loop are one frame stale (item writes run before the camera updates that frame);
    `CULL_MARGIN_PX` is sized generously to absorb that and a fast pan. Too tight a margin would pop an item in at
    the edge; revisit by playtest.
  - Extrapolation is intentionally **not** skipped for off-screen items, only the DOM write. Skipping it too would
    save a little more CPU but complicate the readers of `frame()`; left as a possible follow-up if measurement
    ever demands it.
- **Validation:** `visibleNormBounds` / `withinNormBounds` unit-tested (projection inversion + margin + boundary
  inclusivity). Subjective smoothness and FPS (17-30, floor unchanged as predicted) confirmed on the tablet.
