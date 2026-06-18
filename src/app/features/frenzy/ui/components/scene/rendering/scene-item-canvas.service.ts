import { Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';
import type { ItemType } from '@game/frenzy/types';

import { itemSpritePathFor } from '../../../constants/pokemon-registry';
import { buriedClipPoints } from '../../scene-item/buried-clip';
import { withinNormBounds } from '../camera/camera-math';
import type { VisibleNormBounds } from '../camera/camera-math';
import { BREATHE_MS, breatheScaleAt, swayDegAt, tumbleDegAt } from './item-canvas-animation';
import type { ItemWriteTally } from './scene-actor-registry.service';
import type { RenderedItem } from '../scene-view-models';

// The hybrid-canvas backend (DebugSettingsStore.renderMode === 'canvas'): draws the falling items on ONE canvas
// instead of one DOM node each, so their per-frame drift updates a single composited texture instead of repainting
// the backdrop / exploding the compositor-layer count. The bomb, players, NPCs and HUD stay DOM (the bomb keeps its
// animated SVG sensor lights; players are few).
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

// A frozen tumble frame captured when an item lands, so a rested item holds its last angle/scale (the DOM renderer
// bakes the live transform on landing; here we just stop advancing the phase).
interface FrozenSpin {
  angleDeg: number;
  scale: number;
}

@Injectable()
export class SceneItemCanvasService {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  // Effective backing-store pixel ratio (device ratio, optionally capped lower to cut rasterisation on weak GPUs).
  private pixelRatio = 1;
  // Theme-aware contact-shadow colour, read from the scene's `--aq-item-shadow` CSS var (refreshed on resize).
  private shadowColor = 'rgba(0, 0, 0, 0.35)';
  // The item currently under the pointer (desktop hover), drawn with the highlight; null when none.
  private hoveredId: string | null = null;
  // Decoded (and, for the desaturated types, pre-filtered) sprites, keyed by item type; loaded on first sight.
  private readonly sprites = new Map<ItemType, CanvasImageSource>();
  private readonly requested = new Set<ItemType>();
  // Frozen tumble frame per landed item id; entries pruned when the item leaves the scene.
  private readonly frozen = new Map<string, FrozenSpin>();
  // Last frame's draw accounting (the canvas-mode soft-cull split) for the `?debug=perf` census — the canvas
  // counterpart of the DOM registry's `writeTally`: in canvas mode the registry only positions the bomb, so the
  // census reads this instead to show what the canvas actually drew vs culled.
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

    const deviceRatio = Math.max(1, window.devicePixelRatio || 1);

    this.pixelRatio = dprCap === 0 ? deviceRatio : Math.min(deviceRatio, dprCap);
    canvas.width = Math.round(this.worldWidth * this.pixelRatio);
    canvas.height = Math.round(this.worldHeight * this.pixelRatio);
    canvas.style.width = `${this.worldWidth}px`;
    canvas.style.height = `${this.worldHeight}px`;
    this.readThemeVars(canvas);
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
  }

  // Draw one frame: clear, scale to the backing-store pixel ratio, then draw each visible non-bomb item in depth
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

    const drawable = frame
      .filter((item) => item.type !== 'bomb')
      .sort((first, second) => first.y - second.y);
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
  // non-bomb item in the frame (the bomb stays a DOM node counted by the registry; one instance, negligible).
  public drawTally(): ItemWriteTally {
    return { total: this.drawableTotal, written: this.drawnItems, skipped: this.culledItems };
  }

  private drawItem(
    context: CanvasRenderingContext2D,
    item: RenderedItem,
    sprite: CanvasImageSource,
    now: number,
  ): void {
    const centerX = item.x * this.worldWidth;
    const centerY = item.y * this.worldHeight;
    const size = this.itemSize;
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
    const radius = (size * 1.5) / 2;
    const footY = centerY + size * 0.42;

    context.save();
    context.translate(centerX, footY);
    context.scale(1, 0.32); // width:height ≈ 1.5 : 0.48 → flat ellipse
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);

    gradient.addColorStop(0, this.shadowColor);
    gradient.addColorStop(0.8, 'transparent');
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
    const shadow = getComputedStyle(element).getPropertyValue('--aq-item-shadow').trim();

    if (shadow !== '') {
      this.shadowColor = shadow;
    }
  }
}
