# ngKittyDebug

An Angular Pokémon catalog app whose headline feature is **Frenzy** — a realtime,
server-authoritative multiplayer feeding game. This glossary fixes the ubiquitous language
of the parts of the product we have reasoned about together; it grows as terms are resolved,
not all at once.

## Language

### Frenzy scene — floating messages

**Floating message**:
A transient text bubble that pops in, rises a fixed distance, and fades out above the scene.
Every one is short-lived; none persist or are dismissable. In conversation we call these
«всплывающие сообщения» (всплывашки); the code's loose "quip(s)" denotes the exact same thing —
not a separate flavour subtype.
_Avoid_: quip, toast, notification, popup

**Owned float**:
A floating message anchored to a _live_ player sprite — it carries no scene coordinates and
rides along with the sprite's drift, sitting above its head. The common case (eat deltas, own
mood, a rival appearing).

**Orphan float**:
A floating message whose owning player has already vanished, so it is stamped at the player's
last-known position in the scene overlay instead of riding a sprite. The only case is `died`.

**Tone**:
The emotional classification of a floating message — `positive`, `negative`, `neutral`, or
`warning` — which drives its colour and prominence, decoupled from the wording.
_Avoid_: status, severity, kind

### Frenzy scene — effects & nameplate

**Aura**:
The pulsing decoration drawn around a Pokémon's sprite while a timed effect is active. Most are soap-bubbles of
one family differing only by tint — shield is bluish, pooping is brown (both the shared single-tint bubble skin),
egg/laying is a bespoke iridescent rainbow bubble — but an aura need **not** be a bubble: spikiness (cactus) is a
bespoke rotating crown of thorns (a spiky green ring, no glass). `wellFed` has **no** aura — it reads from its
badge plus the grounding-shadow tint. Purely decorative scenery on the sprite.
_Avoid_: buff icon, badge, ring.

**Grounding shadow**:
The isometric ellipse "contact shadow" drawn under **every** sprite — own, others, and the NPC — to seat
it on the seabed. Neutral-dark by default and recoloured to the sprite's current effect tint; theme-aware
(legible over both the bright shallows and the dark abyss). Not an own-player marker — everyone has one.
_Avoid_: drop shadow, self shadow.

**Buff/Debuff badge**:
A small effect-icon shown over a sprite (top-left corner) and in the own-player status card while
the effect is active — a presence indicator, distinct from the Aura. `pooping` is a debuff; the
others are buffs. Carries no countdown in the current iteration.
_Avoid_: aura, status.

**Nameplate**:
The over-the-head cluster on a sprite — the horizontal HP bar (plus the leader crown and rising
floating messages). The player name stays _below_ the sprite, not in the nameplate.
_Avoid_: label, tag.

### Frenzy scene — backdrop layers

The non-actor scenery behind the Pokémon. Four distinct layers we keep needing to tell apart — "the
background" is too coarse, because they have different depths, motion and (it turns out) cost.

**Decor (aquarium decor)**:
The aquarium backdrop as one bundle: the sandy seabed floor, the swaying light rays, the drifting
plankton motes, the **far** kelp/coral forest rooted in the sand _behind_ the Pokémon, the rising
bubbles, and the edge vignette. Locked 1:1 to the world — the camera pans it with everything else.
Purely decorative, never interactive. The single biggest scenery bundle.
_Avoid_: background (too broad), water, kelp (that is the separate near layer).

**Kelp (foreground/midground fronds)**:
The tall seaweed the Pokémon nestles _between_ — a near tier rendered in **front** of the actors plus a
mid tier — separate from the far forest that lives inside Decor. The foreground tier is the one layer
that parallaxes (pans a touch faster than the world for a depth cue).
_Avoid_: plants, weeds, decor.

**Parallax specks**:
Faint drifting particle layers in open water that shift only while the camera actually scrolls — a
travel-direction cue, not a constant swarm.
_Avoid_: motes (those are inside Decor), bubbles.

**Water gradient**:
The flat base colour wash of the whole scene, beneath every other layer. Always present (not one of the
toggleable layers).
_Avoid_: background, abyss.

### Frenzy HUD

**HUD panel**:
A collapsible overlay anchored to a corner of the scene that surfaces session info without entering
the world — the leaderboard, the minimap and the item legend. Each remembers its own collapsed
state across sessions (persisted per-panel under its own key). The own-player status card is a HUD
element too but is **not** collapsible. A HUD panel is a viewport overlay, never a world actor.
_Avoid_: widget, sidebar, toolbar.

**Persisted collapse**:
The remembered open/collapsed state of a HUD panel, seeded from a per-panel storage key (falling back
to a responsive default) and written back when the panel toggles. It is **local** panel chrome — owned
by the panel itself behind a shared deep seam — not session or game state, so it never rises into the
orchestration facade.
_Avoid_: collapse flag, toggle state.

### Frenzy debug tooling

The developer-only overlays surfaced under the `?debug=perf` gate. Distinct from the HUD — a real player
never instantiates them. We keep needing to tell the two panels apart, so they are pinned here.

**Perf metric**:
One measured quantity about render health (the FPS family, jank, jitter, scene-loop time, the actor census,
the write/skip and restructure counters, own-sprite gap and staleness). Each is independently activated; an
inactive one shows a dimmed «—» in the readout and is left out of the perf-log sample.
_Avoid_: stat, counter, reading.

**Perf readout**:
The corner overlay that lists every perf metric live. Each row carries the toggle that activates its own
metric and a metric-info affordance — so the readout is both the display and the per-metric control surface.
Dressed in the same theme-aware HUD-panel chrome as the leaderboard/minimap/legend.
_Avoid_: stats panel, fps panel, metrics panel.

**Metric info**:
The per-metric explanation a developer opens from a readout row — what the metric tracks, why it matters,
and how to read it. A click affordance (touch-first, no hover), not the live value.
_Avoid_: tooltip, help text, description.

**Debug configurator**:
The sibling overlay holding the render levers (the DOM/canvas backend per actor class, the DPR cap, the
frame-pacing cap, sprite freeze, per-layer hides, and the decor probes). It does **not** carry perf-metric
toggles — those live on their rows in the readout.
_Avoid_: config panel, settings panel.
