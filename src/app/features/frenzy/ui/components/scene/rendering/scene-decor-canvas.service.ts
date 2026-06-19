import { Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { KELP_BLADES } from '../../../utils/kelp-blades';
import { buildKelpField, kelpFieldCount } from '../../../utils/kelp-field';
import type { VisibleNormBounds } from '../camera/camera-math';
import { plantSwayDegAt } from './kelp-canvas-animation';

// The hybrid-canvas DECOR backend (DebugSettingsStore.decorMode === 'canvas', ADR 0007): draws the backdrop kelp on
// ONE canvas instead of one swaying SVG node each, so the per-frame sway is a handful of cheap path fills on a single
// composited layer instead of a style-recalc + repaint across ~218 DOM blades (the scene's proven dominant cost — see
// .scratch/frenzy-decor-perf/findings.md). Only the kelp moves here in this slice; the rest of aquarium-decor (floor,
// rays, motes, bubbles, vignette) stays DOM until slices 05/06.
//
// The canvas is a child of `.scene__world`, sized to the world in CSS px and stacked UNDER the item canvas, so the
// PARENT camera transform pans/zooms it for free — blades are drawn in plain world px (no camera math here) in lockstep
// with the items and players. Its own compositor layer (will-change in the SCSS) keeps the redraw off the residual DOM
// backdrop behind it. Non-interactive — decor takes no taps, so there is no hit-test (simpler than the item canvas).
//
// Behaviour-equivalent to the DOM backdrop: the blade field is the shared `buildKelpField` (one source of truth with
// the DOM `AquariumDecorComponent`), the sway is the ported `plantSwayDegAt`, and only a sparse 1-in-3 blade sways
// (the shipped near-neutral DOM trade). Not unit-tested (a thin shell over the canvas 2D API); the pure math it calls
// is. Verified by the on-device A/B.

// Coral blades render slightly faded (mirrors `.aq__blade--coral { opacity: 0.92 }`).
const CORAL_OPACITY = 0.92;
// Still (non-swaying) blades hold a gentle half-lean (mirrors `.aq__plant { transform: rotate(var(--rot) * 0.5) }`).
const STILL_LEAN_FACTOR = 0.5;
// The kelp tint vars (resolved per theme), cycled by blade shape like `KELP_COLORS` in kelp-blades.ts.
const PLANT_COLOR_VARS = ['--aq-plant-a', '--aq-plant-b', '--aq-plant-c'] as const;

// A blade's static draw model in world px: the pivot (its rooted bottom-centre, the rotation origin), the box it
// fills, its shape's path index, and its sway timing. `color` is resolved from the theme on attach/resize.
interface DecorBlade {
  shape: number;
  coral: boolean;
  pivotX: number;
  bottomY: number;
  width: number;
  height: number;
  normX: number;
  rotationDeg: number;
  brightness: number;
  zIndex: number;
  animated: boolean;
  cycleMs: number;
  delayMs: number;
  color: string;
}

// A blade silhouette as a reusable Path2D plus its source viewBox extents, so the draw can scale it to any blade box.
interface BladePath {
  path: Path2D;
  viewWidth: number;
  viewHeight: number;
}

@Injectable()
export class SceneDecorCanvasService {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  // Effective backing-store pixel ratio (device ratio, optionally capped lower to cut rasterisation on weak GPUs).
  private pixelRatio = 1;
  // The blade silhouettes (one Path2D per shape), built once on first attach.
  private paths: BladePath[] = [];

  private readonly worldWidth = FRENZY.world.width;
  private readonly worldHeight = FRENZY.world.height;
  // The blade draw models, painter-sorted far→near so the canvas stacking matches the DOM z-index. Geometry is fixed
  // (world-derived); only `color` is refreshed from the theme on attach/resize.
  private readonly blades: DecorBlade[] = this.buildBlades();

  // Bind the canvas element (once it exists), build the blade paths and resolve the theme tints from it.
  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.buildPaths();
    this.resolveColors(canvas);
  }

  // Size the backing store to the WORLD × the effective pixel ratio: `dprCap` 0 keeps the native device ratio, 1 / 1.5
  // cap it lower (the fill-rate lever). The CSS size stays the world px the parent camera transform scales. Re-reads
  // the theme tints (a resize is also the cheap moment a theme flip is picked up — same as the item canvas's shadow).
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
    this.resolveColors(canvas);
  }

  // Draw one frame: clear, scale to the backing-store pixel ratio, then draw each on-screen blade in painter order
  // (already far→near). Positions are plain world px; the parent camera transform places them on screen. `bounds`
  // soft-culls blades whose column is off-screen (skips their draw), like the item writer; null draws all.
  public draw(bounds: VisibleNormBounds | null, now: number): void {
    const context = this.context;

    if (context === null) {
      return;
    }

    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.worldWidth, this.worldHeight);

    for (const blade of this.blades) {
      // Cull on the X column only (a tall blade rooted off the bottom can still poke into view, so never Y-cull it).
      // The bounds already carry the camera's cull margin, like the item writer.
      if (bounds !== null && (blade.normX < bounds.minX || blade.normX > bounds.maxX)) {
        continue;
      }

      const rotationDeg = blade.animated
        ? plantSwayDegAt((now + blade.delayMs) / blade.cycleMs, blade.rotationDeg)
        : blade.rotationDeg * STILL_LEAN_FACTOR;

      this.drawBlade(context, blade, rotationDeg);
    }
  }

  // Draw one blade: rotate about its rooted bottom-centre, then stretch its silhouette path to the blade box (the
  // viewBox maps to width × height, matching the DOM `<svg preserveAspectRatio="none">`).
  private drawBlade(
    context: CanvasRenderingContext2D,
    blade: DecorBlade,
    rotationDeg: number,
  ): void {
    const silhouette = this.paths[blade.shape];

    if (silhouette === undefined) {
      return;
    }

    context.save();
    context.translate(blade.pivotX, blade.bottomY);
    context.rotate((rotationDeg * Math.PI) / 180);
    context.translate(-blade.width / 2, -blade.height);
    context.scale(blade.width / silhouette.viewWidth, blade.height / silhouette.viewHeight);
    context.fillStyle = blade.color;

    if (blade.coral) {
      context.globalAlpha = CORAL_OPACITY;
    }

    context.fill(silhouette.path);
    context.restore();
  }

  // Build the fixed blade geometry from the shared field — same forest as the DOM backdrop (count derived from the
  // world width), painter-sorted far→near so the canvas stacking matches the DOM z-index.
  private buildBlades(): DecorBlade[] {
    const blades = buildKelpField(kelpFieldCount(this.worldWidth)).map((blade) => {
      const pivotX = (blade.left / 100) * this.worldWidth + blade.width / 2;

      return {
        shape: blade.shape,
        coral: KELP_BLADES[blade.shape].coral,
        pivotX,
        // Box bottom = the rooted line `--root`% up from the world bottom — the rotation pivot.
        bottomY: this.worldHeight * (1 - blade.root / 100),
        width: blade.width,
        height: blade.height,
        normX: pivotX / this.worldWidth,
        rotationDeg: blade.rotation,
        brightness: blade.brightness,
        zIndex: blade.zIndex,
        // Only a sparse 1-in-3 blade sways (the shipped DOM `:nth-child(3n)` trade); the field index is 0-based.
        animated: (blade.index + 1) % 3 === 0,
        cycleMs: 2 * blade.durationSeconds * 1000,
        // CSS `animation-delay` is negative (`-(i*0.6)s`) → a positive phase offset into the timeline.
        delayMs: -blade.delaySeconds * 1000,
        color: 'rgb(0, 0, 0)',
      };
    });

    return blades.sort((first, second) => first.zIndex - second.zIndex);
  }

  // Build the three blade silhouettes once: a Path2D per shape plus its viewBox extents (all 60×160 today, but read
  // from the source so a future blade with another viewBox still scales correctly).
  private buildPaths(): void {
    if (this.paths.length > 0) {
      return;
    }

    this.paths = KELP_BLADES.map((blade) => {
      const [, , viewWidth, viewHeight] = blade.viewBox.split(' ').map(Number);

      return { path: new Path2D(blade.path), viewWidth, viewHeight };
    });
  }

  // Resolve the per-shape plant tints from the live theme and fold each blade's depth-dimming factor into its colour
  // (`color-mix(in srgb, base f%, #000)` is exactly `base × f` per channel) — the DOM equivalent of `kelpTint`.
  private resolveColors(scope: HTMLElement): void {
    const base = PLANT_COLOR_VARS.map((name) => readCssColorChannels(scope, name));

    for (const blade of this.blades) {
      const [red, green, blue] = base[blade.shape];
      const factor = blade.brightness;

      blade.color = `rgb(${Math.round(red * factor)}, ${Math.round(green * factor)}, ${Math.round(blue * factor)})`;
    }
  }
}

// Resolve a CSS custom property to concrete [r, g, b] channels in the element's cascade: a throwaway probe inherits
// the theme var and getComputedStyle normalizes it to `rgb(...)`. Done only on attach/resize, so the layout read is
// off the hot path.
function readCssColorChannels(scope: HTMLElement, variableName: string): [number, number, number] {
  const probe = document.createElement('span');

  probe.style.color = `var(${variableName})`;
  probe.style.position = 'absolute';
  probe.style.opacity = '0';
  probe.style.pointerEvents = 'none';
  scope.appendChild(probe);

  const computed = getComputedStyle(probe).color;

  probe.remove();

  return parseColorChannels(computed);
}

// Pull the first three integers out of a computed `rgb(...)` / `rgba(...)` string; black on anything unparseable.
function parseColorChannels(value: string): [number, number, number] {
  const parts = value.match(/\d+(?:\.\d+)?/g);

  if (parts === null || parts.length < 3) {
    return [0, 0, 0];
  }

  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}
