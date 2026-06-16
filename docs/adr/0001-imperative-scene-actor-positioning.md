# 1. Imperative per-frame positioning of Frenzy scene actors

Date: 2026-06-16

Status: Accepted

## Context

The Frenzy scene renders drifting actors (falling items, player/NPC sprites) inside a camera-panned world.
Their on-screen position is extrapolated client-side every animation frame (~60 Hz on a desktop) to smooth over
the 10 Hz server tick. Until now each frame the extrapolators rebuilt the `renderedItems` / `renderedPlayers`
signals with fresh view-model objects, and the template bound each actor's position through
`[leftPawScenePosition]="{ x, y }"` plus `[item]`/`[player]` inputs.

Because the view-model object reference changed every frame, Angular ran OnPush change detection over **every**
actor child component every frame — re-checking HP bars, auras, badges, sprites — even though only `x`/`y` (and
occasionally the facing flip) had moved. On-device measurement on a weak Lenovo tablet showed ~19–20 FPS, and
crucially removing GPU work (blur filters) did **not** raise it: the bottleneck is the main thread / change
detection, not GPU fill-rate. The low FPS is also the root of the steering "rubber-band" artefact (the
reconciliation glide spans too few frames to read as smooth).

The camera, parallax and off-screen indicators already sidestep change detection — the rAF loop writes their
transforms straight to the DOM. Actors were the remaining per-frame change-detection load.

## Decision

Move the **per-frame** actor visuals — position and the facing flip — off change detection and write them
imperatively to the DOM, while keeping all **structural** visuals declarative.

- A `SceneActorRegistryService` holds `id → host element` maps. Each frame the scene feeds it the freshly
  extrapolated frame; it writes each registered host's `translate` CSS property (and toggles the
  `scene__player--facing-right` class) directly. An `ActorHostDirective` (`[leftPawActorHost]`) registers each
  actor host and positions it immediately from the last frame on registration (no origin pop-in).
- The extrapolators keep a plain per-frame `frame()` (read by the writer, the sand-puff detector and the
  `?debug=perf` gap) and publish the `rendered` **signal** only when structure changes — on a server snapshot
  (`ingest`) and on an item's `landed` rising edge (which gates the buried shadow, the wavy sand clip and the
  spin-freeze, i.e. real structure, fired once per item).
- The facing flip is treated as a per-frame flag (imperative). An item's `landed` is treated as structure
  (a rare republish), because making it imperative would scatter item-specific logic into the central writer for
  ~zero change-detection saving.
- `?debug=perf` reads a separate per-frame `perfPlayers` signal so the panel measures the optimized path and a
  correct gap; the `?debug` box overlays (`pokemon-borders`/`item-borders`/`speed`, a dev tool) fall back to
  per-frame `rendered` publishing so their boxes still track the sprites.

## Consequences

- **Positive:** ~N+M actor child components no longer change-detect every frame; per-frame work drops to a flat
  position write per actor. This is the main FPS lever on weak devices (validated by `?debug=perf` on the tablet).
- **Negative / trade-offs:**
  - Position and facing are no longer declarative; they live in an imperative writer, so they are not expressible
    in the template and not covered by template-level tests (the position math stays unit-tested in the
    extrapolators).
  - Depth paint order (items sorted by `y`) refreshes on republish, not every frame: while two items fall past
    each other their overlap can be momentarily stale; at rest (where depth reads most) the `landed` edge
    re-sorts them. Accepted as imperceptible.
  - A new coupling: the actor host elements must carry a stable id and live under `.scene__world` (the constant-px
    positioning parent). Documented on the directive and the registry.
- **Not done here:** off-screen culling and frame-aware reconciliation build on this model and are tracked
  separately. If a second theme/world appears, the constant world-px assumption in the writer must be revisited.
