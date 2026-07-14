# 5. Frenzy hybrid-canvas item renderer: a toggleable second render backend

Date: 2026-06-18

Status: Accepted

## Context

On the weak tablet the Frenzy scene is render/raster-bound, not script-bound (the `?debug=perf` `loop` metric stays
green while fps/p50/p1/jank/jitter are red). Phase-1 + the phase-2 cheap levers (imperative positioning — ADR 0001;
off-screen soft-cull — ADR 0002; frame-aware reconciliation — ADR 0003; compositor-layer promotion of the actors)
helped but did not lift the floor to comfortable. The dominant cost is the per-frame paint/composite of the many
falling **items** — each a DOM node on (after the layer-promotion lever) its own compositor layer.

A desktop Chrome 4× CPU throttle had earlier suggested layer-promotion would be enough, but that proxy throttles
only the main thread, not GPU rasterisation / compositing / memory bandwidth — exactly what a weak mobile GPU is
limited by. Real-device evidence contradicted the "cheap levers are enough" conclusion, so the next lever is a
render-model change for the items: draw them on a `<canvas>` instead of one DOM node each (PRD §2.C lever 7 / issue
17). ADR 0004 turned the render loop (`SceneRenderLoopService`) and the per-frame view-models into the seam this
swaps at, so it is a surgical addition rather than surgery on a god-component.

We are **not** certain canvas wins on the device (the proxy misled us once). So the change must be measurable and
reversible on the device, not a one-way rewrite.

## Decision

Add a **second item render backend** selected by a persisted runtime toggle — not a replacement of the DOM one.

- **Toggle.** `DebugSettingsStore.renderMode: 'dom' | 'canvas'` (+ `canvasDprCap: 0 | 1 | 1.5`), persisted to
  localStorage so the two backends can be A/B'd on the tablet across reloads/rebuilds. Default `dom` — normal play
  stays on the proven path; the store (and thus canvas mode) is only reachable under `?debug=perf`, so a real player
  has zero new cost. This is a **temporary scaffold**: once the device A/B picks a winner we keep it (canvas as the
  mobile/weak-device default, DOM as a thin fallback) and may delete the loser. It is not permanent dual maintenance.

- **One pipeline, swappable paint step.** Extrapolation, camera math, view-models and the soft-cull are reused
  unchanged. Only the final paint differs: `registry.writeTranslate()` (DOM, per item) vs `ctx.drawImage()`
  (canvas, all items). The facade branches in `tickItems`; the loop passes the mode each frame.

- **Canvas placement.** The `<canvas>` is a **world-sized child of `.scene__world`**, so the parent camera
  transform pans/zooms it for free — items draw in plain world px and stay in lockstep with the DOM players (also
  in-world), with no per-frame camera math and no one-frame desync. It carries its own compositor layer
  (`will-change: transform`) so the per-frame redraw uploads a single texture and never repaints the seabed/kelp
  backdrop — the win — and the per-item compositor-layer count collapses to one. Stacking (decor → items →
  players → foreground) is preserved by DOM child order.

- **DPR cap as the fill-rate lever.** The canvas backing store is `worldSize × effectiveRatio`; the cap lets the
  device render below native DPR (fewer pixels to rasterise), the lever DOM can't offer. The A/B sweeps
  dom / canvas-native / canvas-1.5 / canvas-1.

- **The bomb, players, NPCs, HUD stay DOM.** The bomb keeps its CSS-animated SVG sensor lights and its shove; it is
  one instance and not the cost. In canvas mode the bomb is the only DOM item host, so `registry.writeItems` still
  positions it while the canvas draws the rest.

- **Behaviour parity, no simplifications.** Tumble/breathe/sway, the wavy buried sand-clip, the rock/rotten
  desaturation, the hover glow and the grounding shadow are all reproduced. The keyframe math is ported to pure,
  unit-tested functions (`item-canvas-animation.ts`); the buried-clip generator is extracted to a shared pure module
  (`buried-clip.ts`) the DOM renderer and canvas both consume, so the shape can't drift. Static filters (rock/rotten)
  are pre-baked into the sprite cache and the hover filter is applied to at most one item, so no per-frame `filter`
  cost on the bulk.

- **Hit-testing.** Canvas items are not DOM nodes, so the tap is resolved by a pure `hitTestItem` against the
  press's normalized world point (the canvas rides the same camera-transformed world, so `resolveSceneTap`'s
  normalization already applies); a hit eats the item and suppresses the miss-bubble + steer exactly like a DOM tap.
  Hover (desktop, mouse only) tracks the pointer the same way.

Relates to and builds on ADR 0001 (imperative positioning), 0002 (soft-cull, reused by the canvas draw) and 0004
(the render-loop seam this plugs into).

## Consequences

- A second render path exists while the A/B runs. Mitigated: the shared pipeline + shared pure math keep the
  duplication to the paint step, and the DOM path is untouched (and the default), so there is a zero-rework fallback.
- The canvas backing store is world-sized (up to `worldSize × deviceDPR`); larger than a viewport-sized canvas but
  bounded and within mobile texture limits, and the DPR cap bounds it further.
- Two small visual approximations, both imperceptible and noted in code: the breathe/sway ease-in-out uses
  smoothstep (vs CSS's cubic-bezier) and the grounding-shadow foot offset is tuned by eye.
- The canvas backend is unit-tested only at its pure-math boundary (animation, buried-clip, hit-test); the canvas
  2D shell itself is verified by the on-device A/B playtest.
- Open: the default-on decision (and whether to delete the DOM path) is gated on the tablet A/B. If canvas does not
  lift the floor, the suspects shift to the DOM player GIF sprites and the water-gradient/parallax fill-rate.
