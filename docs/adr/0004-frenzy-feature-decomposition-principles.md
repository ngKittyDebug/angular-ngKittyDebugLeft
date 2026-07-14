# 4. Frenzy visual feature decomposition: input-driven leaves, facade-as-seam, service ownership

Date: 2026-06-17

Status: Accepted

## Context

The Frenzy visual feature is about to take a sequence of performance levers (culminating in a possible
hybrid-canvas render-model swap) on top of an architecture with high coupling and uneven cohesion. Before
turning any lever we mapped the feature graph (task 01 of the tablet-perf phase-2 workstream). The friction,
in deletion-test terms:

- **`SceneComponent` is a god-module (~306 lines).** It is simultaneously the view shell, the rAF render-loop
  **driver** (assembles per-frame context, sequences the facade calls, gates the debug publishes), the pointer
  semantics owner (`onScenePointerDown` + `batNudge` + `onItemClick` — coordinate normalization, target
  classification, intent dispatch, bomb-shove geometry) and the grouping host (`groupByOwner` + the `*ByOwner`
  computeds + the depth sort). `SceneFacade` already owns the per-step "what" (the extrapolate→write→observe
  ordering, ADR 0001/0002), but the "when" — the driver — is trapped in the component.
- **Presentational leaves reach across the feature.** `leaderboard`, `minimap` and `item-legend` each inject the
  thin `PlayerPersistenceService` localStorage wrapper and repeat the same get/save-collapsed trio; `pokemon-picker`
  injects it to read the saved name/appearance. The deletion test shows two _different_ needs wearing one coupling:
  the picker's read is **session identity** (which `FrenzyPageFacade` already owns — it reads it for respawn), while
  the three panels' trio is **local panel chrome** (see CONTEXT.md "Persisted collapse"). Naively lifting both into a
  facade would bloat the orchestration seam with widget chrome.
- **Sibling-into-guts.** `offscreen-indicators` injects the scene-internal `PlayerExtrapolatorService` for player
  positions even though the scene loop already drives its `frame()`; `perf-readout` type-imports `RenderedPlayer`
  across the scene module seam (type-only — nearly free).
- The exemplar `current-pokemon-status` is already input/output-driven (zero injects, pure inputs) — the shape we
  are tending the rest of the feature toward.

ADR 0001 established the imperative render model but never formalized the render-loop as a seam; the canvas lever
needs exactly that seam to be a surgical swap rather than an operation on a god-module.

## Decision

Adopt these principles for the Frenzy feature, applied incrementally (one coupling at a time), behavior-preserving
and FPS-neutral. No public contract changes; this ADR records _principles_, the per-slice plan lives with the
workstream issues.

1. **Presentational leaves are input/output-driven, with no visible cross-cutting injects.** Game/session data
   arrives via inputs; user actions leave via outputs. `current-pokemon-status` is the exemplar and is **not**
   touched.
2. **The facade is the orchestration seam — and only that.** `FrenzyPageFacade` owns session lifecycle (incl. the
   single in-feature read of persisted _identity_); `SceneFacade` owns per-frame render-step orchestration. Neither
   accretes local panel chrome: **persisted collapse stays local to its HUD panel**, behind a shared deep seam, and
   never rises into a facade.
3. **Service ownership is explicit — one of three kinds, never "global by habit":**
   - **component-scoped private** — provided at the component that owns it (the scene's extrapolators / camera /
     bursts / sand-puffs, already provided on `SceneComponent`);
   - **shared deep seam** — a small interface hiding real plumbing, reusable across callers (the
     `persistedCollapse(key, default)` free function: it hides the DI and the localStorage read/write/default behind
     one signal-returning call; ≥2 repeating adapters — the collapse trio is 3 — prove the seam is real);
   - **thin persistence wrapper** — `PlayerPersistenceService` keeps exactly one in-feature reader for session
     identity (`FrenzyPageFacade`) and is reached for panel chrome only _through_ the deep seam above, never injected
     into a presentational leaf.
4. **The rAF render-loop is a seam.** A `SceneRenderLoopService` owns the driver (rAF lifecycle via `DestroyRef`,
   the per-frame context, the call sequence, the debug gating); `SceneComponent` drops to a view shell that supplies
   refs and a frame-inputs provider. A future canvas renderer becomes one adapter at this seam (relates ADR 0001).
5. **No sibling-into-guts.** A component never injects another component's internal service; data flows by contract
   or input (`offscreen-indicators` takes player render-data through the loop's `frame()` contract). Shared view-model
   **types** live in the neutral `scene-view-models` module; a type-only cross-import is acceptable and not worth
   chasing on its own.
6. **Depth over purity.** The target is removing **shallow, scattered plumbing**, not the injection keyword per se.
   Prefer a deep cohesive seam (small interface, real behavior behind it) and extract one as soon as two adapters
   repeat. Each extracted decision (pointer intent, grouping, persisted collapse) becomes a pure function/seam with
   its own unit test — the interface is the test surface.

## Consequences

- **Positive:** every subsequent perf lever (and the canvas swap) lands on a clean seam, not a god-clew; behavior is
  verified through public interfaces, so the structural refactor is covered by characterization tests that survive it;
  change/knowledge for each concern (driver, tap-meaning, grouping, panel chrome, identity) concentrates in one place.
- **Trade-offs:**
  - The `persistedCollapse` free function hides its DI inside the helper — slightly less explicit at the call site
    than an injected service, accepted because it keeps the leaf free of visible cross-cutting injects and the state
    local.
  - One more seam (the render-loop service) and one more shared helper to maintain; justified by the canvas gate and
    the three repeating adapters respectively.
  - This is principle-setting, not a rewrite: applied as small one-coupling-at-a-time slices, each behavior-preserving
    and FPS-neutral. Already-cohesive components are left alone.
- **Out of scope / deferred:** the render-model swap itself (hybrid canvas) is a separate gated decision with its own
  ADR; this ADR only guarantees the seam it would swap at.
