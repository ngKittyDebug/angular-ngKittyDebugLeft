# 7. Frenzy decor on the canvas backend: progressive backdrop migration

Date: 2026-06-19

Status: Accepted

## Context

The decor workstream (slices 01–03, ADR 0006) proved the dominant decor cost on the weak tablet is the
**per-frame sway of the animated kelp blades** in `aquarium-decor` — the static blades are nearly free
(GPU-composited DOM layer, panned by the camera transform for free), and the rays/motes/bubbles are minor
(~+3 fps). The shipped near-neutral fix (sway only 1-in-3 blades, `8525fb9`) gave a small but real tablet
gain — there is no further _free_ decor win left in DOM. The remaining lever for the animated kelp is a
render-model change: draw it on a `<canvas>` (cheap path fills + no style-recalc on the blades) instead of
N independently-animating SVG nodes on the main thread.

The items already have exactly this: ADR 0005 added a toggleable hybrid-canvas item backend — a world-sized
`<canvas>` child of `.scene__world` (camera-transformed for free), gated by a persisted `?debug=perf` toggle,
A/B'd on the device because the desktop CPU-throttle proxy once misled us (it throttles the main thread, not
GPU raster — what a weak mobile GPU is bound by). This ADR extends that proven pattern to the decor backdrop.

Constraints carried in:

- **ADR 0006 (no quality tiers).** The canvas decor must be _visually neutral_ — same look on every device,
  just cheaper. Same parity bar ADR 0005 held the items to (keyframe math ported to pure functions).
- **Stacking.** `aquarium-decor` is the _backdrop_ (behind items + actors). The `midground-kelp` and
  `foreground-kelp` render _in front of_ the DOM actors. A single canvas cannot hold both the behind-actors
  backdrop and the in-front-of-actors kelp while the actors are DOM nodes between them. So decor-on-canvas
  means the **backdrop** only; the front kelp stays DOM until actors themselves move to canvas (the larger
  full-WebGL step — phase-2 issue 18 — out of scope here).
- **Uncertainty (the ADR 0005 lesson).** We are not certain canvas decor wins on the device. The change must
  be measurable and reversible on the tablet, not a one-way rewrite.

## Decision

Add a **decor canvas backend** mirroring ADR 0005's scaffold — a parallel render path selected by a persisted
runtime toggle, migrated **progressively** sub-layer by sub-layer so each step is measured on the device
before the next.

- **Toggle.** `DebugSettingsStore.decorMode: 'dom' | 'canvas'`, persisted, reachable only under `?debug=perf`
  (a real player keeps the proven DOM path — zero new cost). Independent of `renderMode` so the decor and item
  canvases can be A/B'd separately. Reuses the existing `canvasDprCap` as the fill-rate lever.

- **Placement.** A world-sized `<canvas>` child of `.scene__world`, stacked **beneath the item canvas** and
  above the (residual) DOM backdrop, so the parent camera transform pans/zooms it for free — drawn in plain
  world px, in lockstep with the items, no per-frame camera math. Its own compositor layer.

- **Static vs animated split.** Static backdrop parts (seabed, sand, vignette, light rays) are baked **once**
  into an offscreen canvas and blitted (a single `drawImage`, redrawn only on resize/DPR change). The animated
  kelp + particles are redrawn per frame from pure, unit-tested keyframe functions (the
  `item-canvas-animation.ts` pattern). No hit-testing — decor is inert, simpler than the item canvas.

- **Behaviour parity, no simplifications (ADR 0006).** Blade sway, ray shimmer, mote/bubble drift are
  reproduced; the keyframe math is ported to pure functions with the same approximations-noted-in-code rule as
  ADR 0005 (smoothstep for ease-in-out, etc.). The bubble `bottom`-animation anti-pattern (a per-frame _layout_
  property, flagged in `findings.md`) is dropped in the port — particles advance by canvas draw, not layout.

- **Front kelp + parallax stay DOM.** `midground-kelp`, `foreground-kelp` and the parallax sheets are in front
  of the DOM actors (or screen-space) and are already compositor-only transforms — not the cost. They move to
  canvas only if/when the actors do (issue 18), out of scope here.

- **Progressive migration.** Ship the toggle by moving the _proven cost first_ (the kelp), measure on the
  tablet, then fold in particles and the static bake only if the kelp step wins. Default `dom` throughout; the
  default-on decision and any DOM-decor removal is a separate gated step (mirrors ADR 0005's open consequence).

Relates to and builds on ADR 0005 (reuses the world-child-canvas placement, the `canvasDprCap`, the
toggle-scaffold + device-A/B discipline) and ADR 0006 (visually-neutral, no tiers).

### Refinement — what shipped (slices 04–06, 2026-06-19): a HYBRID, not a full bake

The "static vs animated split" above planned to bake **all** static parts (seabed, sand, vignette, **rays**)
into an offscreen cache and hide the DOM `aquarium-decor` entirely. Implementation refined this to a **hybrid**
that keeps two layers in the DOM, because the full bake was high-effort/high-risk for **zero** fps gain (the
slices are fps-neutral by the ADR's own admission — the value is unification + node removal):

- **On the canvas (animated, per-frame):** kelp blades (slice 04), plankton **motes** + **bubbles** (slice 05),
  and the **vignette** (slice 06 — a single elliptical gradient, trivially drawn each frame, so it sits on
  _top_ of the canvas layers as in the DOM order).
- **Kept in the DOM (deliberate):** the sandy **floor** (a static, GPU-composited CSS texture — near-free; a
  pixel-faithful canvas reproduction of its 4-tile speckle + 4-row dune crest + glow is large and parity-risky
  for no fps win) and the **light rays** (`mix-blend-mode: screen` against the DOM backdrop has **no clean
  canvas port** without baking the whole background onto the canvas — and their own `flat-rays`/`no-rays`
  probes already target them). The canvas is a sibling stacked _above_ the residual DOM decor, so the DOM order
  `floor < rays < [motes < kelp < bubbles < vignette]` is preserved exactly.

Net: the ~246 **high-count animated** DOM nodes (218 kelp + 16 motes + 12 bubbles) move to one canvas layer —
the actual node-removal/unification win — while the 2 cheap, blend-coupled static layers stay battle-tested
CSS. The offscreen static-bake machinery is therefore **not built** (no fps justification). Verified by desktop
smoke + eye A/B (parity holds); the device fps A/B (the go/no-go) is unchanged as the gating step.

## Considered and rejected

**A single shared canvas drawing decor + items in one pass.** Rejected: the decor backdrop is behind the
items + actors while the front kelp is in front of them, so the scene cannot collapse to one buffer while
actors are DOM. A shared canvas would also re-blit the static backdrop on every item redraw. The separate
decor-canvas layer **beneath** the item canvas keeps ADR 0005's "items canvas never repaints the backdrop"
invariant, lets the static backdrop cache redraw only on resize, and preserves stacking via DOM child order.

## Consequences

- A third render path exists behind a toggle while the A/B runs — but it is a temporary scaffold (default
  `dom`, untouched fallback), and the static/animated split keeps the per-frame work to the kelp + particles.
- The decor canvas backing store is world-sized (up to `worldSize × deviceDPR`), bounded by the shared DPR cap,
  within mobile texture limits — same envelope as the item canvas.
- Parity is verified at the pure-math boundary (sway/particle functions) by unit tests; the canvas 2D shell is
  verified by the on-device A/B playtest, like the item canvas.
- **Default-on, DOM kept as fallback (verdict, 2026-06-19).** The cumulative tablet A/B (slices 04–06) came back
  **objectively better** on the device, so `decorMode` now **defaults to `canvas`** for every player (the store
  default + the no-debug-store fallback in `scene.component`), consistent with ADR 0006's no-tiers rule (one path
  for all devices, not "canvas on weak / dom on strong"). The DOM backdrop is **kept as a thin fallback** behind
  the `?debug=perf` toggle, not removed — a reversible default flip, not a one-way rewrite. The item backend
  (`renderMode`, ADR 0005) is untouched: still DOM-default, pending its own A/B. Fully retiring the DOM decor path
  (deleting the kelp/motes/bubbles/vignette markup + animations from `aquarium-decor`) is a separate, irreversible
  step, deferred.
- **If it does not lift the floor:** the remaining suspects are the DOM player **GIF sprites** and the
  water-gradient / parallax fill-rate — which points at the full-WebGL render (phase-2 issue 18), the cardinal
  next lever beyond this ADR.
