# 6. Frenzy weak-device perf: no quality tiers — visually-neutral fixes only

Date: 2026-06-18

Status: Accepted

## Context

The Frenzy scene runs poorly on a weak tablet. On-device bisection (the `?debug=perf` per-layer toggles
from ADR 0005's debug store) proved the **decor** layer dominates the cost — toggling it off lifts the
FPS sharply, while the canvas item renderer, sprite-freeze and the actor-write guards did not. The exact
mechanism _within_ decor (the ~218 independently-swaying SVG kelp blades, the `mix-blend-mode: screen`
light rays, or the sheer texture of the world-sized backdrop layer) is **not yet proven** — we are adding
finer decor sub-probes to bisect it on the device before committing to a fix.

Choosing _how_ to fix it forks: degrade decor only on weak devices (a **quality tier** — feature-detect a
low-end device and drop / freeze / thin the decor there) versus keep **one** rendering for every device.

Per playtest, a desktop Chrome CPU-4× throttle **reproduces the tablet symptom faithfully** — the same low
FPS and the same drift jank. Since the symptom reproduces under a throttle that slows only the **main thread**
(not GPU rasterisation), the cost is at least partly main-thread (paint-record / style-recalc), not pure GPU
fill-rate. So a desktop Performance trace under 4× (now available via the user-scoped `chrome-devtools-mcp`)
is a valid probe for localising the mechanism; the only residual caveat is that a purely-GPU cost could hide
under CPU throttling — but the symptom does reproduce, so that is not the whole story.

## Decision

**No quality tiers.** Every perf fix to the scene must be **visually neutral**: it looks the same on every
device and only renders cheaper — e.g. baking static decor to one raster, restructuring compositor layers,
or replacing a blend mode with a perceptually-equivalent plain gradient. We do **not** ship a
device-detected "low" mode that visibly thins, freezes or removes scenery.

Precedents that are **not** tiers (and stay): the canvas DPR cap (ADR 0005) trades resolution the eye does
not resolve at that size; `prefers-reduced-motion` is a **user** setting, not a device guess.

## Considered and rejected

A weak-device quality tier. Rejected because it means two visual realities to maintain and reason about, a
device-detection heuristic that is always partly wrong, and a deliberately-degraded experience for exactly
the users on the worst hardware. A neutral fix is strictly dominant — no sacrifice anywhere, no detection,
one scene.

## Consequences / accepted risk

Some mechanisms have **no** visually-neutral fix. If the proven cost is the sheer count of independently
swaying kelp blades, the only levers are reducing the count (neutral **only** if the heavy blade overlap
hides the difference — must be confirmed by eye) or compositor-promoting each blade (risks blowing the weak
GPU's layer memory, possibly a net loss). If no neutral fix exists for the proven mechanism, **the floor may
stay low and we revisit this ADR** rather than silently adding a tier.

Where neutrality is in question (e.g. approximating the screen-blend rays with a flat gradient), the change
ships behind a `?debug=perf` A/B toggle and is promoted to always-on only after the eye confirms it on the
tablet — the same temporary-scaffold pattern as ADR 0005's render-mode toggle.
