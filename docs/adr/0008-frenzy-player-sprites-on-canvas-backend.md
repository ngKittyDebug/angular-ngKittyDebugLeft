# 8. Frenzy player sprites on the canvas backend: the shared actors-canvas

Date: 2026-06-21

Status: Accepted

## Context

ADR 0005 added a toggleable hybrid-canvas **item** backend (a world-sized `<canvas>` child of `.scene__world`,
camera-transformed for free, gated by a persisted `?debug=perf` toggle). ADR 0007 extended the same pattern to the
animated **decor** backdrop. Both moved N independently-animating DOM nodes onto a single composited texture to cut
per-node style-recalc + the compositor-layer explosion that pins the FPS floor on a weak tablet.

Issue 02 (the "canvas actors" workstream, branch `perf/frenzy-tablet-phase2`) carried this to the **actors**: Ф0 drew
the items on the canvas, then Ф2 drew the **player sprites** on the _same_ shared canvas (renamed `SceneActorCanvasService`
— it now draws both items and players, the canvas counterpart of `SceneActorRegistryService`), behind a second
`?debug=perf` toggle `playerSpritesMode` (default `dom`). The rest of each player's chrome (hp/crown/name/auras/poke)
stays DOM and is positioned in lockstep by the registry.

Two parity gaps surfaced and had to be closed before the mode could be anything but a debug experiment (ADR 0006 —
visual neutrality, no quality tiers):

1. **Frozen GIF.** A hidden off-screen `<img>` does not advance its GIF under `drawImage` — Chrome freezes an
   off-screen GIF on frame 0 (proven on-device 2026-06-21; an in-viewport `<img>` froze too under an honest
   clear+draw). So a canvas sprite showed a static first frame, violating ADR 0006.
2. **Grounding shadow.** The DOM `.scene__shadow` is a `z-index:-1` chrome layer; that ordering only holds within the
   player's own DOM stack. Once the sprite moves to the canvas (a layer _below_ the DOM chrome), the DOM shadow paints
   _over_ the canvas sprite (smearing across the body). An interim hid it, losing the grounding cue.

The tablet A/B verdict on the actors-canvas: **no measurable FPS gain** (the dominant tablet cost is the DECOR layer —
see ADR 0007 / the localized bottleneck), but **control felt subjectively better** (fewer DOM nodes per actor → less
style-recalc contention on the input path).

## Decision

Keep the canvas player-sprites mode, **behind the `?debug=perf` `playerSpritesMode` toggle (default `dom`)** — DOM
stays the default render path and the fallback. Do _not_ promote it to default: it does not move the tablet FPS floor,
so shipping a more-complex render path to every player would trade complexity for only a subjective input-feel win.

Close both parity gaps so the mode is visually neutral (ready to flip to default later if an on-device case appears):

- **Animation** — decode each sprite GIF to frames once via WebCodecs `ImageDecoder`, cache the per-frame `ImageBitmap`s,
  and pick the frame by free-running wall-clock (`frameIndexAt`, a pure unit-tested timeline). Static frames animate
  regardless of whether the source is painted. Decode failure / unsupported codec → permanent null, the player keeps
  its DOM chrome (graceful, never retried). Bitmaps are released with the scene's injection scope.
- **Shadow** — draw the grounding shadow ON the actors-canvas, _behind_ the sprite, with the same theme base
  (`--scene-actor-shadow`), dominant-effect tint, and breathe (a pure `player-shadow` port of the SCSS). The DOM copy is
  suppressed in canvas mode to avoid doubling. Anchored at `centre.y + spriteOffsetY + hitboxHeight/2` — the same visual
  point the canvas sprite is drawn at plus half the body — so it can never drift from the sprite above it.

## Consequences

- **Visual neutrality (ADR 0006) held both ways.** Canvas players animate (decoder) and keep their grounding shadow
  (canvas port). Parity is enforced by the pure-function ports + unit tests (`sprite-frame-timeline`, `player-shadow`),
  the same bar ADR 0005/0007 held the items/decor to.
- **Opt-in, not default.** The mode stays a `?debug=perf` experiment because it doesn't raise the tablet FPS floor. The
  decision is revisitable: if an on-device case shows the input-feel win is worth it, flipping the default needs only the
  toggle default + an on-device neutrality eye-confirm (winged-sprite shadow offset, animation cadence).
- **Cost.** A one-time WebCodecs decode per sprite line (~6 MB of `ImageBitmap`s worst-case across all lines seen) and a
  shared canvas that now draws both actor kinds. No per-frame `context.filter`/allocation regressions (filters baked or
  reused; the shadow gradient is per-draw like the item shadow).
- **Naming.** `SceneItemCanvasService` → `SceneActorCanvasService` (+ the `actorCanvas` field / `#actorCanvas` ref), since
  it is no longer item-only.
- **Out of scope.** This does NOT address the dominant tablet cost (DECOR — issue 03, device-gated) and is not the
  full-WebGL unified-scene step. DOM remains the shipped renderer for real players.
