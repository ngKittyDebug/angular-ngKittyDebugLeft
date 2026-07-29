# Frenzy — Architecture Reference

Deep-dive reference for the `/frenzy` realtime game (Angular client + PartyKit server).
Read this before touching `shared-game/`, `partykit-server/`, or `src/app/features/frenzy/`.

## Shared contract — `@game/*` → `shared-game/`

`shared-game/` is the **contract** (types/config) shared by the client and `partykit-server/`.
The server-authoritative engine does NOT live here — it lives in `partykit-server/src/engine/`
(generic, bound to a game via `createEngine` in `parties/<game>/game.ts`). Per-activity layout:
import as `@game/frenzy/*` (files in `shared-game/frenzy/`).

**Tuning config is `@game/frenzy/config` (NOT `constants`):** the flat `FRENZY` object is a
derived read-model — `config.ts` ASSEMBLES it from the definition in `shared-game/frenzy/definition/`:

- One slice per entity: `definition/items/<item>.ts` holds ALL of an item's tuning — physics,
  verb descriptors (`interactions`), spawn weights with pool membership, and the `enabled` flag.
- `definition/effects/<effect>.ts` — modifiers / emission / `exclusiveGroup`.
- `definition/npcs/angry-bomb.ts` — NPC descriptor + kind-specific tuning.
- Per-concern partials: `world`, `loop`, `hp`, `player`, `collision`, `player-collision`,
  `score`, `floats`, `spawn`; aggregator `definition/index.ts` (`FRENZY_DEFINITION`, spawn-pool
  assembly; **pool key order is rng-load-bearing**, the egg pool is pinned explicitly).
- `hp` = pokemon health: `startingHp` / `maxHp` / `decayPerTick` / `decayIntervalMs` /
  `lowHpWarningThreshold` — stage thresholds travel per-player in `Player.body` (see
  "Theme-agnostic server" below). `floats` = `floatPriority`.

**Type unions:** `ItemType` / `PlayerEffectKind` are derived in `frenzy/types.ts` from the
ENABLED roster slices only (`EnabledKey` in `shared-game/engine/definition.ts` filters `keyof`
by the `enabled` literal; a slice with `enabled: false` — e.g. the dormant barbed-wire demo —
stays out of the public unions until the flag is flipped). `NpcKind` is a plain `keyof`.
Generic type aliases come from `shared-game/engine/types.ts` — imports don't change.

Retune an entity → edit its slice; `FRENZY.xxx` stays stable from the outside (safety nets:
`definition-contract.spec.ts` + the golden master in `partykit-server`).

**Feature flags** — a per-entity `enabled` field in the entity's slice. For items it projects
into `FRENZY.features.items[type]` (helper `isItemEnabled(type)` in `config.ts`); the NPC flag
is read by the server directly from `NpcDefinition.enabled` and is not projected into `FRENZY`.
One boolean per entity gates ALL of its spawn paths (see `pickItemType` below) AND the client's
compile-time surface (via the union filtering above; see the cookbook).

**Don't invent new path aliases.** Sharing code between Angular and `partykit-server/` →
extend `shared-game/` under `@game/*` (new activity → its own `shared-game/<game>/` subfolder;
cross-game shared code → `shared-game/common/` when it actually appears). Inside Angular →
extend `@core/*`, `@features/*`, `@shared/*`.

## Theme-agnostic server (principle + roadmap)

**Principle:** the `shared-game/frenzy/` contract and the `partykit-server/` engine must NOT
enumerate theme entities (the pokemon roster, "evolve at 200/500"). Everything actor-specific —
appearance, physical size, speed, stage thresholds — arrives from the client on `join` as opaque
values; the server only stores them on `Player` and applies them. Implemented today:

- `Player.appearance` — an opaque lowercase slug (1–32 chars, and never an
  `Object.prototype` member). The client resolves it to a `Line`/sprite with an
  unknown-fallback in `ui/constants/pokemon-registry.ts`.
- `Player.body: PlayerBody` (per-stage `{ width, height, speed, maxSpeed, hp }`) — size,
  cruise/cap speed and the stage HP gates travel on `join`; `calculateStage(hp, body)` reads the
  player's gates (there is no `FRENZY.thresholds` anymore). AABB collision
  (`tick/collision-target.ts`) and size-aware bounds (`tick/move-players.ts`) read `body`.
  Client-side table: `STAGE_BODY` in `pokemon-registry.ts`; shape validation in
  `parse-client-message.ts`; policy/bounds → reason code in `validate-join.ts`
  (→ `ServerMessage` `joinRejected`).

**Remaining couplings (largest to smallest):**

- `ItemType` union — item behaviour is data-driven (verb descriptors in slices +
  `engine/verbs/`); the generic engine is extracted with `createEngine(game)`. The union stays
  derivable from the definition roster — client compile-time exhaustiveness is a feature, not
  a coupling.
- `PlayerEffectKind` — themed effects (shield/wellFed/laying/pooping); leave with the items.
- HP economy and the "aquarium/floor" — physics is neutral, only the naming is themed; touch
  when a second theme (another site/skin in its own party room) actually appears.

## PartyKit workspace (`partykit-server/`)

Separate `package.json` (partykit, vitest, typescript). **Multi-party:** each activity = a named
party in `partykit.json` + a folder `partykit-server/src/parties/<game>/`:

- `index.ts` — thin `Party.Server` adapter: transport + lifecycle, stores `players`/`items` as
  arrays, calls only the BOUND engine. Also owns the session/abuse guards (#323/#324): a
  per-connection `identify`/`join` rate budget, the join cap (→ `roomFull`), the identify
  re-key guard and orphan-session eviction — a session never outlives its player.
- `game.ts` — composition root: `createEngine(definition, npcRegistry)`; exports `frenzyEngine`,
  `FRENZY_NPC_REGISTRY`, `frenzyNpcHooks` (for specs).
- `slices/<kind>/` — NPC runtime code (see below).
- `parse-client-message.ts` (typed guard on the `onMessage` boundary), `validate-join.ts`,
  `serialize-server-message.ts`; adapter concerns `check-click-rate`, `mark-disconnected`,
  `restore-connected`.
- `__tests__/` — includes the themed orchestrator specs (`apply-tick.spec`) and the golden
  master; they test the BOUND game, which is why they live here and not in the engine.

Currently one party: `frenzy` (Feeding Frenzy); the client connects with `party: '<game>'`
(endpoint `/parties/<game>/<roomId>`). If you change the entry path in `partykit.json`, restart
`partykit dev` — the config is not hot-reloaded. Server `console.log` is gated behind
`room.env.DEBUG` (`true`/`'true'`/`'1'`) — silent in prod.

## Engine — clean architecture (stick to this when extending)

The engine is **generic and game-agnostic**, in `partykit-server/src/engine/` (`core/` —
orchestrator + passes, `core/tick/` — tick passes, `verbs/`, `npc/` — `NpcRuntime` registry,
`create-engine.ts`; generic engine specs in `src/engine/__tests__/`, with NO imports from
`parties/`). Every pass is a **pure generic function** over `<TItemId, TEffectId, TNpcId>`:
tuning arrives as the `game: GameDefinition` PARAMETER (first argument) — no module-scope
`FRENZY` imports inside the engine (sanctioned exceptions: `crownIdOf` / `steerVelocity` from
`@game/frenzy/`, generic by signature).

**`createEngine(game, npcRegistry?)`** binds the engine to a game and returns `Engine`
(`applyTick` / `applyClick` / `applyEmissions` / `applySteer` / `createPlayer` / `spawnItem`);
derived structures (emitter list, hooks from the NPC registry) are memoised there once — do not
rebuild them per tick. Composition root is `parties/frenzy/game.ts`; the adapter `index.ts`
calls only the bound `frenzyEngine.*`. Extract logic into small named functions with JSDoc.

- **`core/apply-tick.ts` is a thin orchestrator** threading `working` state through the passes
  in `core/tick/` (+ NPC passes via the `npc.move` / `npc.applyBlasts` / `npc.coolAnger` seam —
  `NpcHooks` from `npc/types.ts`, assembled from the per-kind registry `npcHooksFromRegistry`;
  the frenzy implementation is the `parties/frenzy/slices/angry-bomb/` slice). Pass order:
  `prune-effects` → `move-items` (+ survivors/expired split in the orchestrator) →
  `move-players` (humans) / `npc.move` (NPCs, hunting food along the floor) →
  `separate-players` (+ `apply-bumps`/`apply-impulses`, only with player-collision enabled) →
  `arm-emitted-items` (drop owner-immunity from scattered emissions) → `resolve-collisions` →
  `resolve-landings` → NPC blast / cool-anger + `apply-scores` (kills; the HP-leader crown is
  removed BEFORE the tick) → (decay ticks only) `apply-decay-step`. Shared pass helpers:
  `tick/collision-target.ts` (`findCollisionTarget`) and `tick/detonated.ts` (`DetonatedEvent`
  builder; radius comes from `ItemInteraction.explodes.radius`). Change pass order deliberately —
  snapshot invariants depend on it.
- **`verbs/` is a CLOSED set of verb primitives, one file per verb** (`eat`, `gamble`,
  `grant-effect`, `nudge`, `explode`; blast math in `compute-blast.ts`, shared with NPCs).
  Item behaviour is DATA: verb descriptors in the item's definition slice
  (`interactions.onClick/onCollide/onLand` → `CoreInteractionSpec`) dispatched by
  `resolve-interaction.ts` into resolvers (which also redirect the bomb's click budget to its
  explode spec). `index.ts` re-exports `resolveInteraction` and the types (`ItemInteraction` /
  `HpDelta` / `EffectGrant` / `PlayerImpulse` from `types.ts`), so importers write
  `from './verbs'`. `toInventory` is a reserved seam without a resolver (it throws); `none`
  means the trigger is ignored. **A new item requires NO engine changes** — see the cookbook.
  A new mechanic outside the vocabulary is a deliberate extension: new verb file +
  `CoreInteractionSpec` variant + dispatch branch.
- **`core/` helpers** (next to the orchestrator): `apply-click.ts` (click dispatches to
  `grantEffectResult` / `detonateClickResult` / `nudgeResult` / `eatResult`),
  `apply-hp-deltas.ts` (`applyHpDeltas` → `HpDeltaResult`: `groupByPlayer` + `netAmount` with
  `damageTaken` multipliers + `resolvePlayerHp`), plus `apply-effect`, `apply-steer`,
  `apply-emissions` (+ `buildEmitters`), `apply-bumps`, `apply-impulses` (per-impulse
  `maxFactor` cap), `apply-scores`, `faint-cause`, `calculate-stage`, `create-player`,
  `spawn-item`, `pick-item-type`, `effect-modifiers` — same "one pure pass function per file"
  style. Adapter concerns (`check-click-rate`, `mark-disconnected` / `restore-connected`) are
  NOT engine — they live in `parties/frenzy/`.
- **NPC runtime lives in the game's slice** `parties/frenzy/slices/<kind>/` (currently one —
  `angry-bomb`: per-NPC `move-npc` / `cool-anger`, state-level `npc-blast`, `create-npc`
  factory, poke math in `anger`; `runtime.ts` assembles them into an `NpcRuntime`). The engine
  (`src/engine/npc/types.ts`) has only the generic seam: the `NpcRuntime` interface, the
  `NpcRegistry` (`Partial<Record<NpcKind, NpcRuntime>>`) and the `npcHooksFromRegistry` adapter
  (dispatch by `npc.npcKind`; an unregistered kind is inert). The registry is registered in the
  composition root (`game.ts`); spawn/anger scheduling in the adapter reads data directly from
  the definition slice `shared-game/frenzy/definition/npcs/angry-bomb.ts` (descriptor +
  anger/strongBlast/seek list + the `enabled` gate). An NPC is a `Player` with the `isNPC`
  marker, not a separate snapshot entity.
- **Feature flags — single gating point in `pickItemType`** (`core/pick-item-type.ts`, generic:
  rng + `isEnabled` predicate + pool weights — all parameters required, no themed defaults; the
  engine passes `game.items[type].enabled`). This gates BOTH spawn paths (the regular
  `engine.spawnItem()` drop and emissions in `apply-emissions.ts`) with one flag; NPC spawn is
  gated by its `NpcDefinition.enabled` in the adapter the same way. Invariant: ≥1 item enabled.
  **The second, compile-time half of the flag:** the public unions `ItemType` /
  `PlayerEffectKind` are derived from ENABLED slices only (`EnabledKey` filters by the `enabled`
  literal; for effects `enabled?` is a purely type-level gate — effects have no runtime spawn
  path). A dormant (`enabled: false`) slice sits in the roster and in the pool, but its literal
  is absent from the unions → client exhaustive Records don't demand art/i18n; flipping the flag
  breaks compilation exactly where things must be filled in. The real compile gate for flag
  bundles is the explicit type args `<ItemType, PlayerEffectKind, NpcKind>` at the binding
  boundary in `game.ts` (and wherever a generic call result with `FRENZY_DEFINITION` is assigned
  to narrowed types — `npc-blast.ts`, golden-master / separate-players specs); a call without
  explicit args infers the full roster `keyof` — harmless while the result is never assigned to
  something narrow (`apply-tick.spec` lives like that), but don't rely on the gate there.

## Client data layer (`features/frenzy/data/`)

- **`store/` — NgRx SignalStore** (not bare signals — this IS the feature's main state):
  `frenzy.store.ts` holds server state + `myId` / fainted info / `roomFull`, exposes computed
  (`connectionStatus`, `leaderboard`, `me`, `presenceCount`, `disconnectedCount`) and methods
  (`connect` / `disconnect` / `click` / `steer` / `join` / `dismissFainted`);
  `frenzy-stats.store.ts` accumulates session stats (`maxHp`, `maxStage`, `eatenByType`,
  lifespan). The pure server-message reducer is extracted to `store/apply-server-message.ts`
  (+ spec).
- **`logic/` — pure functions** for pokemon mood: `pokemon-mood.ts` (`getMood(hp, stage)` →
  `'starving' | 'hungry' | 'content' | 'happy'`), `is-sad.ts`.
- **`services/`** splits into two subsystems: `effects/` (floating messages and FX, below) and
  `sound/` (a separate audio subsystem — `audio-engine.service.ts` + per-effect services +
  `sound-settings.service.ts`). Don't confuse them: `effects/` and `sound/` coexist.

## Scene elements (falling / floating)

- **`user-select: none`** on all falling/floating game elements (items, floating text, status
  messages) — they are clicked/dragged, not selected. Already set on `.scene` and
  `.scene__item`; the `left-paw-floating-text` component sets it on `:host`.
- **Positioning by normalised `x,y` (0..1) goes through the `[leftPawScenePosition]="{ x, y }"`
  directive** (`ui/directives/scene-position.directive.ts`), NOT inline `[style.left.%]` /
  `[style.top.%]`. The directive writes only `left`/`top`; centering and animation stay in CSS
  (`transform: translate(...)`). Applied to falling items, bubble-burst, blast and the
  orphan floating text (below). For wide boxes (floating text) add
  `[scenePositionClampX]="true"` — clamps `x` by measured width so text near the scene edges
  fits instead of being clipped by `overflow: hidden`.
- **Floating text is reusable:** `left-paw-floating-text` is presentational (the translation
  arrives as a ready string via the `text` input; the key lives in the model and resolves in
  the scene template). All messages are transient — they rise and fade (the
  `floating-text-rise` animation; fading is uniform: after a quick pop-in the opacity steps
  evenly to 0 over the whole rise). Visibility duration is per-message via the `durationMs`
  input (host binding for `animation-duration` + the same removal timer in `TransientList`).
  Optional Taiga icon — the `icon` input (`@tui.*`).
- **Two classes of floating messages (`FloatingMessagesStore`, model `floating-message.ts`):**
  - **`OwnedFloat` (attached to a live sprite)** — carries `ownerId`, NO coordinates. Rendered
    INSIDE that player's `.scene__player` container (`.scene__player-float`:
    `position:absolute; bottom:100%; left:50%`) → sits above the head and drifts with the
    sprite. The scene groups them via `floatsByOwner` (computed:
    `Map<ownerId, OwnedFloat[]>`). Includes: eat (`+5`/`−N`, attached to the EATER, not the
    item — the eaten item's container is already gone), own-pokemon statuses
    (sad/happy/dying/poke/evolved), someone appearing (`appeared`), bomb damage to survivors.
    If the sprite disappears, the float goes with it (a bomb fatality shows `died` instead).
  - **`OrphanFloat` (player already gone)** — the only case: `died`. No sprite → stamped at the
    last-known `x,y` (from `PresenceTracker.lastKnownPlayers`) and rendered in the scene
    overlay via the directive + `scenePositionClampX`.
- **Producers** — the effects family (`data/services/effects/`, one `*-effect.service.ts` per
  producer): `EatEffect`, `SelfMoodEffect` (signal-driven off `me()`: sad/happy/dying
  transitions; + the `pokeSelf` easter egg), `ReactiveMoodEffect`, `EvolutionEffect`,
  `PresenceTracker` (appeared from `snapshot.players` diff, died from `fainted`),
  `DetonationEffect`, `BumpEffect`, `HitBurstEffect`, `ShieldBlockEffect`, `IntroQuipsEffect`,
  `NpcQuipEffect`, `EmissionSoundEffect`, `PlayerEffectsTracker`. Queue/lifetime helpers:
  `transient-list.ts`, `owner-release-queue.ts`. All push into `FloatingMessagesStore`
  (`pushOwned*` / `pushOrphan*`); `FrenzyEffectsService` is a thin orchestrator that fans
  `messages$` out to handlers and re-exposes `ownedFloats` / `orphanFloats`. A new producer =
  a new file in `effects/` following the same template — don't bloat existing ones.
