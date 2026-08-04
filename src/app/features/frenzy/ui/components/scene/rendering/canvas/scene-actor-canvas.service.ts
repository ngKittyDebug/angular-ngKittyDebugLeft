import { inject, Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { ItemType } from '@game/frenzy/types';

import {
  itemSpritePathFor,
  spritePathFor,
  spriteRenderFor,
} from '../../../../constants/pokemon-registry';
import type { SpriteRender } from '../../../../constants/pokemon-registry';
import { buriedClipPoints } from '../../../scene-item/buried-clip';
import { withinNormBounds } from '../../camera/camera-math';
import type { VisibleNormBounds } from '../../camera/camera-math';
import { BREATHE_MS, breatheScaleAt, swayDegAt, tumbleDegAt } from './item-canvas-animation';
import { evolvePulseAt, facingScaleX, npcAngerFilter, SAD_FILTER } from './player-canvas-animation';
import type { EvolvePulse } from './player-canvas-animation';
import {
  SHADOW_CORE_STOP,
  SHADOW_FADE_STOP,
  SHADOW_HEIGHT_RATIO,
  SHADOW_WIDTH_SCALE,
  shadowBreatheAt,
  shadowCoreFor,
} from './player-shadow';
import { PlayerSpriteSource } from './player-sprite-source';
import type { ItemWriteTally } from '../shared/actor-write-tally';
import type { RenderedItem, RenderedPlayer } from '../../scene-view-models';

// The hybrid-canvas backend for the scene ACTORS — the falling items (DebugSettingsStore.renderMode === 'canvas')
// AND, independently, the player sprites + their grounding shadows (playerSpritesMode === 'canvas'). Both draw on ONE
// shared canvas instead of a DOM node each, so their per-frame drift updates a single composited texture instead of
// repainting the backdrop / exploding the compositor-layer count. The rest of the HUD/chrome stays DOM; the bomb is
// drawn here too, but as a STATIC sprite — its DOM sensor-light chase is a sanctioned casualty of moving it onto the
// canvas (spec §9). The DOM counterpart that positions the still-DOM chrome is SceneActorRegistryService.
//
// The canvas is a child of `.scene__world`, sized to the world in CSS px, so the PARENT camera transform pans/zooms
// it for free — items are drawn in plain world px (no camera math here) and stay in lockstep with the DOM players
// (also in-world). Its own compositor layer (will-change in the SCSS) keeps the per-frame texture upload from
// dirtying the seabed/decor raster behind it.
//
// Behaviour-equivalent to the DOM renderer — tumble/breathe/sway, the wavy buried clip, the rock/rotten
// desaturation, the hover glow and the grounding shadow are all reproduced; the shared pure math
// (item-canvas-animation.ts, buried-clip.ts) keeps it from drifting from the DOM look. Not unit-tested (a thin
// shell over the canvas 2D API); the pure math it calls is. Verified by the on-device A/B.

// Items whose sprite is shown desaturated toward grey stone (mirrors `.scene__item-sprite--rock/--rotten` in
// scene-item.component.scss). Pre-baked through the filter once at load, so there is no per-frame filter cost.
const DESATURATED_TYPES: ReadonlySet<ItemType> = new Set<ItemType>(['rock', 'rotten']);
const DESATURATE_FILTER = 'grayscale(1) contrast(1.18) brightness(0.78)';
// Hover/captured highlight (mirrors the `:hover .scene__item-sprite` rule): brighten + a double glow. Applied to at
// most one item per frame (the pointer can hover only one), so the per-frame filter cost is negligible.
const HOVER_FILTER =
  'brightness(1.2) drop-shadow(0 0 5px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 11px rgba(120, 220, 255, 0.75))';
// Landed item sinks this fraction of its height into the sand before the buried clip trims the dipped part
// (matches `.scene__item--landed { transform: translateY(16%) }`).
const BURIED_SINK = 0.16;
// The bomb sprite renders 1.6× the item size (mirrors `.scene__item-sprite--bomb` in scene-item.component.scss).
const BOMB_SPRITE_SCALE = 1.6;
// The grounding shadow under a landed ITEM (mirrors the `.scene__item-shadow` radial gradient) — deliberately its
// own set of constants, NOT the player shadow's (player-shadow.ts tunes a different, larger shadow).
// Shadow ellipse width relative to the item size.
const ITEM_SHADOW_WIDTH_SCALE = 1.5;
// The shadow centre sits this fraction of the item size below the item centre (the sprite's foot).
const ITEM_SHADOW_FOOT_OFFSET = 0.42;
// Vertical squash of the ellipse (width:height ≈ 1.5 : 0.48 → a wide, short contact shadow).
const ITEM_SHADOW_SQUASH = 0.32;
// Gradient stop where the shadow colour starts fading to transparent.
const ITEM_SHADOW_FADE_STOP = 0.8;

// A frozen tumble frame captured when an item lands, so a rested item holds its last angle/scale (the DOM renderer
// bakes the live transform on landing; here we just stop advancing the phase).
interface FrozenSpin {
  angleDeg: number;
  scale: number;
}

@Injectable()
export class SceneActorCanvasService {
  // Live texture-source for the player sprites drawn here (the shared actors-canvas also paints players, behind the
  // rename — see drawPlayers). Hands the canvas the current animated GIF frame to blit.
  private readonly spriteSource = inject(PlayerSpriteSource);
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  // Effective backing-store pixel ratio (device ratio, optionally capped lower to cut rasterisation on weak GPUs).
  private pixelRatio = 1;
  // Theme-aware contact-shadow colour, read from the scene's `--aq-item-shadow` CSS var (refreshed on resize).
  private shadowColor = 'rgba(0, 0, 0, 0.35)';
  // Theme-aware grounding-shadow colour for PLAYER sprites (neutral base), read from `--scene-actor-shadow` (a soft
  // light disc on the dark abyss where the item shadow would vanish); refreshed on resize. The dominant-effect tint
  // overrides it per draw — see drawPlayerShadow.
  private actorShadowColor = 'rgba(0, 0, 0, 0.4)';
  // The item currently under the pointer (desktop hover), drawn with the highlight; null when none.
  private hoveredId: string | null = null;
  // Decoded (and, for the desaturated types, pre-filtered) sprites, keyed by item type; loaded on first sight.
  private readonly sprites = new Map<ItemType, CanvasImageSource>();
  private readonly requested = new Set<ItemType>();
  // Frozen tumble frame per landed item id; entries pruned when the item leaves the scene.
  private readonly frozen = new Map<string, FrozenSpin>();
  // Evolve-pulse start time (draw clock) per player id, stamped on the rising edge of `isEvolving` so the one-shot
  // 1.5s flash plays once per evolution; pruned when the effect ends or the player leaves (mirrors `frozen`).
  private readonly evolveStart = new Map<string, number>();
  // Last frame's draw accounting (the canvas-mode soft-cull split) for the `?debug=perf` census — the canvas
  // counterpart of the DOM registry's `writeTally`: in canvas mode the registry no longer positions any item (all
  // items, the bomb included, are drawn here), so the census reads this instead to show what the canvas drew vs culled.
  private drawableTotal = 0;
  private drawnItems = 0;
  private culledItems = 0;

  private readonly worldWidth = FRENZY.world.width;
  private readonly worldHeight = FRENZY.world.height;
  private readonly itemSize = FRENZY.physicalSizePx.item;

  // Bind the canvas element (once it exists) and read the theme shadow colour from it.
  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.readThemeVars(canvas);
  }

  // Size the backing store to the WORLD × the effective pixel ratio: `dprCap` 0 keeps the native device ratio,
  // 1 / 1.5 cap it lower (fewer pixels to rasterise — the fill-rate lever). The CSS size stays the world px the
  // parent camera transform scales.
  public resize(dprCap: 0 | 1 | 1.5): void {
    const canvas = this.canvas;

    if (canvas === null) {
      return;
    }

    // Read the theme shadow colour BEFORE the backing-store / CSS-size writes below: reading computed style AFTER
    // them forced a synchronous reflow at load (Performance trace, 2026-06-19 — `get scrollbars`/`readThemeVars`).
    // The colour is size-independent, so reading first is equivalent and keeps the resize a theme-flip pickup point.
    this.readThemeVars(canvas);

    const deviceRatio = Math.max(1, window.devicePixelRatio || 1);

    this.pixelRatio = dprCap === 0 ? deviceRatio : Math.min(deviceRatio, dprCap);
    canvas.width = Math.round(this.worldWidth * this.pixelRatio);
    canvas.height = Math.round(this.worldHeight * this.pixelRatio);
    canvas.style.width = `${this.worldWidth}px`;
    canvas.style.height = `${this.worldHeight}px`;
  }

  // The item under the pointer (desktop hover) — set by the scene on pointermove, drawn with the highlight.
  public setHovered(id: string | null): void {
    this.hoveredId = id;
  }

  // Wipe the canvas and drop frozen state — used when switching back to the DOM renderer so no stale frame lingers.
  public clear(): void {
    const context = this.context;
    const canvas = this.canvas;

    if (context !== null && canvas !== null) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    this.frozen.clear();
    this.evolveStart.clear();
  }

  // Draw one frame: clear, scale to the backing-store pixel ratio, then draw each visible item in depth
  // order (ascending y → lower items paint on top, matching the DOM sort). Positions are plain world px; the parent
  // camera transform places them on screen. `bounds` soft-culls off-screen items (skips their draw), like the DOM
  // writer; null means draw all (pre-first-frame).
  public draw(frame: readonly RenderedItem[], bounds: VisibleNormBounds | null, now: number): void {
    const context = this.context;
    const canvas = this.canvas;

    if (context === null || canvas === null) {
      return;
    }

    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.worldWidth, this.worldHeight);

    const drawable = [...frame].sort((first, second) => first.y - second.y);
    const live = new Set<string>();
    let drawn = 0;
    let culled = 0;

    for (const item of drawable) {
      live.add(item.id);

      if (bounds !== null && !withinNormBounds(item.x, item.y, bounds)) {
        culled += 1;
        continue; // soft-culled off-screen — same band the DOM writer skips
      }

      drawn += 1;

      const sprite = this.ensureSprite(item.type);

      if (sprite !== undefined) {
        this.drawItem(context, item, sprite, now);
      }
    }

    this.drawableTotal = drawable.length;
    this.drawnItems = drawn;
    this.culledItems = culled;

    for (const id of this.frozen.keys()) {
      if (!live.has(id)) {
        this.frozen.delete(id);
      }
    }
  }

  // The last frame's canvas item draw accounting — read by the `?debug=perf` census in canvas mode. Same shape as
  // the registry's `ItemWriteTally`: `written` = on-screen (drawn), `skipped` = culled off-screen, `total` = every
  // item in the frame (the bomb is drawn here too now, as a static sprite).
  public drawTally(): ItemWriteTally {
    return { total: this.drawableTotal, written: this.drawnItems, skipped: this.culledItems };
  }

  // Players-pass on the shared actors-canvas (DebugSettingsStore.playerSpritesMode === 'canvas'): draw each visible
  // player's grounding shadow + sprite ON TOP of the items, in depth order, replacing the per-player DOM `<img>` (the
  // rest of its chrome — hp/crown/name/auras/poke — stays DOM and is positioned in lockstep by the registry; only the
  // grounding shadow moved onto the canvas, since it must sit behind the sprite). The canvas is shared
  // with the items pass, so `clearFirst` is true only when the items renderer is in DOM mode and left it untouched
  // this frame (in canvas mode the items pass already cleared it, and players must paint over, not wipe, the items).
  public drawPlayers(
    players: readonly RenderedPlayer[],
    bounds: VisibleNormBounds | null,
    now: number,
    clearFirst: boolean,
  ): void {
    const context = this.context;

    if (context === null) {
      return;
    }

    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    if (clearFirst) {
      context.clearRect(0, 0, this.worldWidth, this.worldHeight);
    }

    const live = new Set<string>();
    // Depth order (ascending y) so a lower sprite paints over a higher one, matching the DOM player z-stacking.
    const drawable = [...players].sort((first, second) => first.y - second.y);

    for (const player of drawable) {
      live.add(player.id);

      if (bounds !== null && !withinNormBounds(player.x, player.y, bounds)) {
        continue; // soft-culled off-screen, like the items pass
      }

      this.drawPlayer(context, player, now);
    }

    // Drop evolve-pulse stamps for players that left the scene (mirrors the frozen-spin pruning).
    for (const id of this.evolveStart.keys()) {
      if (!live.has(id)) {
        this.evolveStart.delete(id);
      }
    }
  }

  private drawPlayer(context: CanvasRenderingContext2D, player: RenderedPlayer, now: number): void {
    const render = spriteRenderFor(player.appearance, player.stage);

    // Grounding contact shadow first, BEHIND the sprite — it must draw even while the sprite decodes, so the player
    // reads as planted on the seabed from the first frame (mirrors the DOM `.scene__shadow`, which the canvas mode
    // can no longer host as a z-index:-1 chrome layer).
    this.drawPlayerShadow(context, player, render, now);

    const sprite = this.spriteSource.getDrawable(
      spritePathFor(player.appearance, player.stage),
      now,
    );

    if (sprite === null) {
      return; // sprite still decoding — the shadow + DOM chrome already show; the frame lands within a frame or two
    }

    const centerX = player.x * this.worldWidth;
    const centerY = player.y * this.worldHeight;
    const evolve = this.evolvePulseFor(player, now);
    const filter = this.spriteFilterFor(player, evolve);

    context.save();

    if (player.isDisconnected) {
      context.globalAlpha = 0.5; // mirrors :host(.scene__player--disconnected) { opacity: 0.5 }
    }

    if (filter !== null) {
      context.filter = filter;
    }

    // Transform chain mirrors the DOM stack — host centring → facing flip → centring offset → evolve scale on the
    // img — so the body lands on the actor point and the offset mirrors with the flip exactly as in the SCSS.
    context.translate(centerX, centerY);
    context.scale(facingScaleX(player.facingRight), 1);
    context.translate(player.spriteOffsetX, player.spriteOffsetY);

    if (evolve !== null) {
      context.scale(evolve.scale, evolve.scale);
    }

    context.drawImage(sprite, -render.width / 2, -render.height / 2, render.width, render.height);
    context.restore();
  }

  // Soft contact-shadow ellipse at a player's feet, drawn BEHIND its sprite — the canvas port of the DOM
  // `.scene__shadow`. Neutral theme base (`actorShadowColor`), or the dominant-effect tint, which also breathes
  // (opacity + scale). Anchored on the BODY (centred on the actor point) at its feet: `centre.y + spriteOffsetY` —
  // the same point the sprite is drawn at — plus half the hitbox, so it can never drift from the sprite above it. The
  // flat ellipse (scale Y by 0.28) + the core-holds-then-fades gradient mirror the SCSS, no per-actor blur pass.
  private drawPlayerShadow(
    context: CanvasRenderingContext2D,
    player: RenderedPlayer,
    render: SpriteRender,
    now: number,
  ): void {
    const core = shadowCoreFor(player.shadowEffectClass);
    const breathe = core === null ? null : shadowBreatheAt(now);
    const fill = core ?? this.actorShadowColor;
    const radius = (render.width * SHADOW_WIDTH_SCALE) / 2;
    const centerX = player.x * this.worldWidth;
    const footY =
      player.y * this.worldHeight +
      player.spriteOffsetY +
      Number.parseFloat(player.hitboxHeight) / 2;
    const scale = breathe?.scale ?? 1;

    context.save();

    if (breathe !== null) {
      context.globalAlpha = breathe.opacity; // mirrors the DOM breathe animating element opacity (0.78↔1)
    }

    context.translate(centerX, footY);
    context.scale(scale, scale * SHADOW_HEIGHT_RATIO); // flat ellipse (width : height ≈ 1 : 0.28)

    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);

    gradient.addColorStop(0, fill);
    gradient.addColorStop(SHADOW_CORE_STOP, fill);
    gradient.addColorStop(SHADOW_FADE_STOP, 'transparent');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // The evolve pulse for a player this frame, or null. Stamped on the rising edge of `isEvolving` and driven off the
  // draw clock, so the 1.5s flash plays once per evolution without threading the evolve timestamp through. The stamp
  // is deliberately kept until `isEvolving` flips false (NOT cleared at the 1.5s mark): `evolvePulseAt` already
  // returns null past the window so the sprite goes static — exactly like the DOM's one-shot `1.5s ease-out`, which
  // also plays once while the class stays on. Clearing at 1.5s while still evolving would re-stamp next frame and
  // loop the pulse forever (a divergence from the DOM). A false→true edge re-stamps for a genuine re-evolution.
  private evolvePulseFor(player: RenderedPlayer, now: number): EvolvePulse | null {
    if (!player.isEvolving) {
      this.evolveStart.delete(player.id);

      return null;
    }

    let start = this.evolveStart.get(player.id);

    if (start === undefined) {
      start = now;
      this.evolveStart.set(player.id, now);
    }

    return evolvePulseAt(now - start);
  }

  // The canvas `filter` string for a player's sprite, mirroring the SCSS class precedence: the evolve animation's
  // filter wins while it plays, else the NPC anger tint, else the sad mood; a disconnected player adds grayscale on
  // top (its half-opacity rides globalAlpha). null = draw untinted.
  private spriteFilterFor(player: RenderedPlayer, evolve: EvolvePulse | null): string | null {
    let filter: string | null = null;

    if (evolve !== null) {
      filter = evolve.filter;
    } else if (player.isNpc) {
      filter = npcAngerFilter(player.npcAnger);
    } else if (player.isSad) {
      filter = SAD_FILTER;
    }

    if (player.isDisconnected) {
      filter = filter === null ? 'grayscale(1)' : `grayscale(1) ${filter}`;
    }

    return filter;
  }

  private drawItem(
    context: CanvasRenderingContext2D,
    item: RenderedItem,
    sprite: CanvasImageSource,
    now: number,
  ): void {
    const centerX = item.x * this.worldWidth;
    const centerY = item.y * this.worldHeight;
    const size = item.type === 'bomb' ? this.itemSize * BOMB_SPRITE_SCALE : this.itemSize;
    const half = size / 2;
    const spin = item.landed ? this.freezeFor(item, now) : this.liveSpin(item, now);

    // Soft contact shadow under a rested item (drawn behind, unrotated), peeking out below the buried sand line.
    if (item.landed) {
      this.drawShadow(context, centerX, centerY, size);
    }

    context.save();
    context.translate(centerX, centerY);

    if (item.landed) {
      // Sink, then clip the dipped part along the world-horizontal sand line — applied BEFORE the rotation so the
      // cut stays level regardless of the item's frozen tumble angle (as in the DOM renderer).
      context.translate(0, size * BURIED_SINK);
      this.clipBuried(context, item.id, size);
    }

    context.rotate((spin.angleDeg * Math.PI) / 180);
    context.scale(spin.scale, spin.scale);

    if (item.id === this.hoveredId) {
      context.filter = HOVER_FILTER;
    }

    context.drawImage(sprite, -half, -half, size, size);
    context.restore();
  }

  // Live tumble/sway + breathe for a still-falling item. Shield rocks (sway, no breathe); everything else tumbles.
  private liveSpin(item: RenderedItem, now: number): FrozenSpin {
    if (item.type === 'bomb') {
      // Static sea mine — only its DOM sensor lights animated (dropped on canvas), the body never tumbles/breathes.
      return { angleDeg: 0, scale: 1 };
    }

    if (item.type === 'shield') {
      return { angleDeg: swayDegAt(now / item.spinDurationMs), scale: 1 };
    }

    const degrees = tumbleDegAt(now / item.spinDurationMs);

    return {
      angleDeg: item.spinReverse ? -degrees : degrees,
      scale: breatheScaleAt(now / BREATHE_MS),
    };
  }

  // The tumble frame held since the item landed — captured once on the first landed frame, then reused.
  private freezeFor(item: RenderedItem, now: number): FrozenSpin {
    const existing = this.frozen.get(item.id);

    if (existing !== undefined) {
      return existing;
    }

    const frozen = this.liveSpin(item, now);

    this.frozen.set(item.id, frozen);

    return frozen;
  }

  private clipBuried(context: CanvasRenderingContext2D, id: string, size: number): void {
    const half = size / 2;
    const path = new Path2D();

    buriedClipPoints(id).forEach((point, index) => {
      const x = -half + (point.x / 100) * size;
      const y = -half + (point.y / 100) * size;

      if (index === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    });

    path.closePath();
    context.clip(path);
  }

  // Flat soft-edged ellipse at the item's foot — full theme colour at the core fading to transparent (mirrors the
  // `.scene__item-shadow` radial gradient), drawn as a vertically-squashed circle so it reads as a wide, short
  // contact shadow.
  private drawShadow(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
  ): void {
    const radius = (size * ITEM_SHADOW_WIDTH_SCALE) / 2;
    const footY = centerY + size * ITEM_SHADOW_FOOT_OFFSET;

    context.save();
    context.translate(centerX, footY);
    context.scale(1, ITEM_SHADOW_SQUASH);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);

    gradient.addColorStop(0, this.shadowColor);
    gradient.addColorStop(ITEM_SHADOW_FADE_STOP, 'transparent');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Decoded sprite for a type, kicking off a one-time load on first sight (returns undefined until ready — items
  // miss at most a few frames at startup). The desaturated types are pre-baked through their filter so the hot draw
  // path never sets `context.filter` for them.
  private ensureSprite(type: ItemType): CanvasImageSource | undefined {
    const cached = this.sprites.get(type);

    if (cached !== undefined) {
      return cached;
    }

    if (!this.requested.has(type)) {
      this.requested.add(type);

      const image = new Image();

      image.addEventListener('load', () => this.bakeSprite(type, image));
      image.src = itemSpritePathFor(type);
    }

    return undefined;
  }

  private bakeSprite(type: ItemType, image: HTMLImageElement): void {
    if (!DESATURATED_TYPES.has(type)) {
      this.sprites.set(type, image);

      return;
    }

    const offscreen = document.createElement('canvas');

    offscreen.width = image.naturalWidth;
    offscreen.height = image.naturalHeight;
    const context = offscreen.getContext('2d');

    if (context === null) {
      this.sprites.set(type, image);

      return;
    }

    context.filter = DESATURATE_FILTER;
    context.drawImage(image, 0, 0);
    this.sprites.set(type, offscreen);
  }

  private readThemeVars(element: HTMLElement): void {
    // One getComputedStyle read for both shadow vars (a second call would force another synchronous reflow).
    const style = getComputedStyle(element);
    const itemShadow = style.getPropertyValue('--aq-item-shadow').trim();
    const actorShadow = style.getPropertyValue('--scene-actor-shadow').trim();

    if (itemShadow !== '') {
      this.shadowColor = itemShadow;
    }

    if (actorShadow !== '') {
      this.actorShadowColor = actorShadow;
    }
  }
}
