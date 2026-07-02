# Frenzy Cookbook — adding an item / effect / NPC / verb

Companion to [frenzy-architecture.md](./frenzy-architecture.md). The live template is the
dormant **barbed-wire** demo slice (`definition/items/barbed-wire.ts` +
`definition/effects/barbed-wire.ts`, specs in
`partykit-server/src/parties/frenzy/slices/barbed-wire/__tests__/`): an item + effect
("double outgoing bump damage for 10s") with ZERO engine changes. Enabling it = flipping two
`enabled` flags; from there the compiler walks you through the checklist.

## Item

1. Definition slice `shared-game/frenzy/definition/items/<item>.ts` (`enabled`, physics, a
   mandatory `spawn.world` weight + optional curated pools, verb descriptors
   `onClick` / `onCollide` / `onLand`).
2. A line in the aggregator `definition/items/index.ts` — APPEND AT THE TAIL ONLY (key order is
   rng-load-bearing).
3. With `enabled: true` the client won't compile until you fill in: `ITEM_ART` (art pipeline
   steps 1–4 below), `ITEM_GROUP` + legend i18n (step 5), `emptyCounts()` in
   `frenzy-stats.store.ts` (+ literal `Record<ItemType, …>` objects in specs, e.g.
   `fainted-modal.component.spec` — the compiler will point at them).
4. Purely dictionary-driven behaviour → contract snapshots are enough; a non-trivial
   combination → a spec in `parties/frenzy/slices/<item>/__tests__/` (template: barbed-wire).

## Effect

1. Slice `definition/effects/<effect>.ts` (modifiers `decayPaused` / `damageTaken` /
   `damageDealt`, `emission`, `exclusiveGroup`; `enabled?: false` while dormant).
2. A line in `definition/effects/index.ts` (order matters only for emitters: the FIRST active
   one wins).
3. The grant — an item's `grantEffect` descriptor or `spawnEffects.onJoin`.
4. On enabling, the client will fail tsc in `EFFECT_AURA_CLASS`, `STATUS_FOR_EFFECT`,
   `soundForEffect`.

**Flag bundling:** enable an item but forget its effect → `game.ts` won't compile (the grant
spec doesn't fit the narrowed union).

## NPC

1. Definition `definition/npcs/<kind>.ts` (`NpcDefinition` + kind-specific tuning; `enabled`
   is the runtime gate in the adapter).
2. A line in `FRENZY_NPCS` (`definition/index.ts`).
3. Runtime in `parties/frenzy/slices/<kind>/` (`NpcRuntime`: `move` / `applyBlasts` /
   `coolAnger`) + registration in `FRENZY_NPC_REGISTRY` (`game.ts`).
4. Client: a sprite in `NPC_SPRITES`.

## Verb (extending the CLOSED vocabulary — a deliberate decision, not the default)

A file `engine/verbs/<verb>.ts` + a `CoreInteractionSpec` variant
(`shared-game/engine/definition.ts`) + a dispatch branch in `resolve-interaction.ts` + a
generic spec in `engine/__tests__/`. Needed only when a mechanic cannot be expressed with the
existing verbs / effect modifiers.

## Item art pipeline (sprites for falling items)

**Single coherent source: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji),
3D style (glossy renders), MIT license** (attribution not required). One set for all items →
visual unity of the scene. Don't pick random images from different sources and don't dash off
quick SVGs — take a Fluent glyph.

1. **Pick a glyph** matching the item's meaning (food/boost/hazard). Raw 3D-PNG path:
   `https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/<Name>/3D/<snake_name>_3d.png`
   (folder is Capitalized with spaces, e.g. `assets/Red apple/3D/red_apple_3d.png`; space in
   URL → `%20`). Verify with `curl -sfL` (200).
2. **Adapt:** resize to **120px** (2× the 60px scene box — `FRENZY.physicalSizePx.item`,
   retina sharpness). The environment has no webp encoder (`cwebp`/`sharp`/imagemagick absent,
   `sips` won't write webp), so use **PNG via `sips -Z 120 in.png --out out.png`** — comes out
   ~8–16 KB/file, near-webp weight. If a converter (`cwebp`/`sharp`) appears — prefer **WebP**
   (same 120px), it's lighter.
3. **Place** into `public/frenzy/items/<kebab-name>.png` (kebab-case like the other assets;
   name = the type key: `rare-candy.png`, `golden-berry.png`, `easter-egg.png`). Pokemon
   sprites live separately — `public/frenzy/pokemon/sprites/<line>.gif`. Paths are built in
   `pokemon-registry.ts`: `itemSpritePathFor` → `/frenzy/items/…`, `spritePathFor` →
   `/frenzy/pokemon/sprites/…`.
4. **Register** with one entry in `ITEM_ART` (`Record<ItemType, { sprite; dotColor; sandPuff }>`
   in `ui/constants/pokemon-registry.ts`) — `<type>: { sprite: '<kebab-name>.png',
dotColor: '…', sandPuff: <0..1.3> }`. Single source per item: the sprite, the
   minimap/legend dot colour (`ITEM_DOT_COLOR` is projected from it) and the sand-puff
   intensity (`sandPuffWeightFor` reads it) — three facets in one line, they can't drift.
   Rendering (`<img>` in `scene.component.html` via the `itemSprite` pipe) and smoothing in
   `scene.component.scss` (bilinear, no `image-rendering: pixelated` — correct for smooth
   renders) need no changes.
5. **Add to the HUD legend** (`ui/components/item-legend/`): an entry in `ITEM_GROUP` (a
   `Record<ItemType, …>` — omitting a new type is a compile error, by design) + a name in i18n
   `frenzy.legend.items.<type>` (en/ru). The dot colour is already set by `dotColor` in
   `ITEM_ART` (step 4). **The legend must list ALL falling items — never leave a new type
   without a group/name.**
6. **Delete** the old asset when replacing one, and `grep` that nothing outside the registry
   references its filename.

**Current mapping:** food→🍎, rotten→🦴, rareCandy→🍬, goldenBerry→🍊 (Tangerine), mushroom→🍄,
vitamin→💊, crumb→🍪, easterEgg→🥚, poop→💩, rock→🪨 — PNG (default — Fluent 3D). Exceptions
(SVG, picked/drawn separately): bomb→💣 `bomb.svg` (sea-mine redesign), brick→🧱 — Twemoji
(vector), shield→🛡️ — custom SVG. The angry-bomb NPC is separate machinery: `angry-bomb.svg` in
`public/frenzy/npc/`, an entry in `NPC_SPRITES` (keyed by `NpcKind`), NOT in `ITEM_ART` and not
in `POKEMON_LINES` (the picker must not offer NPCs). So the set is NOT strictly single-source:
the default is Fluent, but when a glyph doesn't read for the item's meaning (like the rock),
take a clear vector alternative (Twemoji/OpenMoji) or keep the existing custom SVG.
