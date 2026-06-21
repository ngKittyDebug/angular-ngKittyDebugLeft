import { Injectable } from '@angular/core';

import { FRENZY } from '@game/frenzy/config';

import { KELP_BLADES } from '../../../../utils/kelp-blades';
import { buildKelpField, kelpFieldCount } from '../../../../utils/kelp-field';
import type { VisibleNormBounds } from '../../camera/camera-math';
import { bubbleRiseAt, moteDriftAt } from './decor-particle-animation';
import { plantSwayDegAt } from './kelp-canvas-animation';

// The hybrid-canvas DECOR backend (DebugSettingsStore.decorMode === 'canvas', ADR 0007): draws the ANIMATED backdrop
// layers — drifting plankton motes, the swaying kelp (the scene's proven dominant cost, ~218 SVG blades), the rising
// bubbles and the edge vignette — on ONE canvas instead of one swaying/drifting DOM node each. The per-frame work
// becomes a handful of cheap path/gradient fills on a single composited layer instead of a style-recalc + repaint
// across ~246 DOM nodes (see .scratch/frenzy-decor-perf/findings.md).
//
// Deliberately HYBRID (ADR 0007): the sandy floor and the screen-blended light rays STAY in the DOM `AquariumDecor
// Component`. The floor is a static, near-free CSS texture (a pixel-faithful canvas bake would be high effort/risk
// for zero fps gain); the rays use `mix-blend-mode: screen` against the DOM backdrop, which has no clean canvas port
// without baking the whole background onto the canvas (their separate `flat-rays`/`no-rays` probes already target
// them). The canvas is a sibling stacked ABOVE the residual DOM decor, so the DOM order floor < rays < [motes < kelp
// < bubbles < vignette] is preserved exactly: floor/rays render below, the canvas layers above.
//
// The canvas is a child of `.scene__world`, sized to the world in CSS px, so the PARENT camera transform pans/zooms
// it for free — everything is drawn in plain world px (no camera math here) in lockstep with the items and players.
// Its own compositor layer (will-change in the SCSS) keeps the redraw off the residual DOM backdrop behind it.
// Non-interactive — decor takes no taps, so there is no hit-test (simpler than the item canvas).
//
// Behaviour-equivalent to the DOM backdrop: the blade field is the shared `buildKelpField` (one source of truth with
// the DOM component), and the sway / drift / rise are the ported pure `plantSwayDegAt` / `moteDriftAt` / `bubbleRiseAt`
// (only a sparse 1-in-3 blade sways — the shipped near-neutral DOM trade). The thin canvas shell here is not unit-
// tested; the pure math it calls is. Verified by the on-device A/B.

const MOTE_COUNT = 16;
const BUBBLE_COUNT = 12;
const TAU = Math.PI * 2;
// Transparent stop shared by the mote halo fade-out and the vignette inner hole (transparent black, exactly as the
// CSS `rgba(0,0,0,0)` / `transparent` keywords interpolate).
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
// The bubble's baked-in glass look (theme-independent, mirrors `.aq__bubble`'s radial-gradient white stops): a bright
// off-centre highlight fading through the themed body tint to a faint rim.
const BUBBLE_HIGHLIGHT = 'rgba(255, 255, 255, 0.95)';
const BUBBLE_RIM = 'rgba(255, 255, 255, 0.05)';
// Coral blades render slightly faded (mirrors `.aq__blade--coral { opacity: 0.92 }`).
const CORAL_OPACITY = 0.92;
// Still (non-swaying) blades hold a gentle half-lean (mirrors `.aq__plant { transform: rotate(var(--rot) * 0.5) }`).
const STILL_LEAN_FACTOR = 0.5;
// The vignette ellipse (mirrors `radial-gradient(120% 90% at 50% 38%, transparent 52%, --aq-vignette 100%)`): centre,
// horizontal/vertical radii as fractions of the world, and the transparent-hole stop.
const VIGNETTE_CENTRE_X = 0.5;
const VIGNETTE_CENTRE_Y = 0.38;
const VIGNETTE_RADIUS_X = 1.2;
const VIGNETTE_RADIUS_Y = 0.9;
const VIGNETTE_HOLE_STOP = 0.52;
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

// A plankton mote's fixed draw model in world px: its rested centre + halo radius, its drift vector and opacity peak,
// and its alternate-cycle timing. `gradient` is the cached halo gradient (built at the local origin, placed by a
// per-frame translate), resolved on attach/resize like the blade colours so it is not re-created every frame.
interface DecorMote {
  centerX: number;
  centerY: number;
  radius: number;
  normX: number;
  dx: number;
  dy: number;
  peak: number;
  cycleMs: number;
  delayMs: number;
  gradient: CanvasGradient | null;
}

// A bubble's fixed draw model in world px: its column centre (X) + base radius, its horizontal wobble amplitude, and
// its linear rise timing. Its Y is derived per-frame from the risen fraction. `gradient` is the cached glass gradient
// (built at the local origin and base radius, then placed + scaled per frame), resolved on attach/resize.
interface DecorBubble {
  centerX: number;
  radius: number;
  normX: number;
  drift: number;
  cycleMs: number;
  delayMs: number;
  gradient: CanvasGradient | null;
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
  // Theme-resolved particle/vignette colours + the light-theme mote enlargement, refreshed on attach/resize.
  private planktonColor = TRANSPARENT;
  private glowColor = TRANSPARENT;
  private bubbleColor = TRANSPARENT;
  private vignetteColor = TRANSPARENT;
  private moteScale = 1;
  // The cached static edge-vignette gradient (rebuilt with the theme on attach/resize), so the hot draw path reuses
  // it instead of allocating a fresh radial gradient every frame.
  private vignetteGradient: CanvasGradient | null = null;

  private readonly worldWidth = FRENZY.world.width;
  private readonly worldHeight = FRENZY.world.height;
  // The fixed draw models (world-derived geometry); only the colours refresh from the theme on attach/resize. Blades
  // are painter-sorted far→near so the canvas stacking matches the DOM z-index.
  private readonly blades: DecorBlade[] = this.buildBlades();
  private readonly motes: DecorMote[] = this.buildMotes();
  private readonly bubbles: DecorBubble[] = this.buildBubbles();

  // Bind the canvas element (once it exists), build the blade paths and resolve the theme colours from it.
  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.buildPaths();
    this.resolveColors(canvas);
  }

  // Size the backing store to the WORLD × the effective pixel ratio: `dprCap` 0 keeps the native device ratio, 1 / 1.5
  // cap it lower (the fill-rate lever). The CSS size stays the world px the parent camera transform scales. Re-reads
  // the theme colours (a resize is also the cheap moment a theme flip is picked up — same as the item canvas's shadow).
  public resize(dprCap: 0 | 1 | 1.5): void {
    const canvas = this.canvas;

    if (canvas === null) {
      return;
    }

    // Resolve the theme colours BEFORE the backing-store / CSS-size writes below: reading computed style (via the
    // probe spans) AFTER them forced a synchronous reflow at load (Performance trace, 2026-06-19). Colours are
    // size-independent, so reading first is equivalent and keeps the resize a theme-flip pickup point.
    this.resolveColors(canvas);

    const deviceRatio = Math.max(1, window.devicePixelRatio || 1);

    this.pixelRatio = dprCap === 0 ? deviceRatio : Math.min(deviceRatio, dprCap);
    canvas.width = Math.round(this.worldWidth * this.pixelRatio);
    canvas.height = Math.round(this.worldHeight * this.pixelRatio);
    canvas.style.width = `${this.worldWidth}px`;
    canvas.style.height = `${this.worldHeight}px`;
  }

  // Draw one frame, back→front, matching the DOM decor order: plankton motes, kelp blades, bubbles, then the static
  // edge vignette on top. Positions are plain world px; the parent camera transform places them on screen. `bounds`
  // soft-culls particles/blades whose column is off-screen (skips their draw); the vignette always covers the world.
  // `skipPlants` is the canvas-mode counterpart of the DOM `noPlants` decor probe: it drops the ~218-blade fill loop
  // so an on-device A/B can attribute how much of the canvas draw cost is the blades (the DOM probe only gates the DOM
  // backdrop, which is display:none in canvas mode — so without this the canvas blade cost cannot be isolated).
  public draw(bounds: VisibleNormBounds | null, now: number, skipPlants = false): void {
    const context = this.context;

    if (context === null) {
      return;
    }

    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.worldWidth, this.worldHeight);

    for (const mote of this.motes) {
      if (this.culled(mote.normX, bounds)) {
        continue;
      }

      const state = moteDriftAt((now + mote.delayMs) / mote.cycleMs, mote.dx, mote.dy, mote.peak);

      this.drawMote(context, mote, state);
    }

    if (!skipPlants) {
      for (const blade of this.blades) {
        // Cull on the X column only (a tall blade rooted off the bottom can still poke into view, so never Y-cull it).
        if (this.culled(blade.normX, bounds)) {
          continue;
        }

        const rotationDeg = blade.animated
          ? plantSwayDegAt((now + blade.delayMs) / blade.cycleMs, blade.rotationDeg)
          : blade.rotationDeg * STILL_LEAN_FACTOR;

        this.drawBlade(context, blade, rotationDeg);
      }
    }

    for (const bubble of this.bubbles) {
      if (this.culled(bubble.normX, bounds)) {
        continue;
      }

      const state = bubbleRiseAt((now + bubble.delayMs) / bubble.cycleMs, bubble.drift);

      this.drawBubble(context, bubble, state);
    }

    this.drawVignette(context);
  }

  // True when a column at `normX` lies outside the (cull-margined) visible bounds, so its element can skip its draw.
  private culled(normX: number, bounds: VisibleNormBounds | null): boolean {
    return bounds !== null && (normX < bounds.minX || normX > bounds.maxX);
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

  // Draw one plankton mote: a soft glow disc (the baked radial-gradient halo) at its drifted position and opacity.
  private drawMote(
    context: CanvasRenderingContext2D,
    mote: DecorMote,
    state: { offsetX: number; offsetY: number; opacity: number },
  ): void {
    if (mote.gradient === null) {
      return;
    }

    context.save();
    context.translate(mote.centerX + state.offsetX, mote.centerY + state.offsetY);
    context.globalAlpha = state.opacity;
    context.fillStyle = mote.gradient;
    context.beginPath();
    context.arc(0, 0, mote.radius * this.moteScale, 0, TAU);
    context.fill();
    context.restore();
  }

  // Draw one bubble: a glass sphere with an off-centre highlight, scaled + faded per its rise state. Its centre Y is
  // the risen fraction read back into world px (the DOM `bottom` %), its base radius scaled by the rise.
  private drawBubble(
    context: CanvasRenderingContext2D,
    bubble: DecorBubble,
    state: { offsetX: number; bottomFraction: number; scale: number; opacity: number },
  ): void {
    if (bubble.gradient === null) {
      return;
    }

    const cx = bubble.centerX + state.offsetX;
    const cy = this.worldHeight * (1 - state.bottomFraction) - bubble.radius;

    // The cached gradient + the unit circle are built at the base radius; the per-frame scale grows both together, so
    // the highlight offset and rim stops track the rise exactly as the live build did (-0.36, -0.44 × radius).
    context.save();
    context.translate(cx, cy);
    context.scale(state.scale, state.scale);
    context.globalAlpha = state.opacity;
    context.fillStyle = bubble.gradient;
    context.beginPath();
    context.arc(0, 0, bubble.radius, 0, TAU);
    context.fill();
    context.restore();
  }

  // Draw the static edge vignette on top of the backdrop: an elliptical radial gradient (transparent hole → themed
  // darkening at the rim). Drawn in a Y-squashed space so the circular canvas gradient reads as the CSS ellipse.
  private drawVignette(context: CanvasRenderingContext2D): void {
    if (this.vignetteGradient === null) {
      return;
    }

    const cx = this.worldWidth * VIGNETTE_CENTRE_X;
    const cy = this.worldHeight * VIGNETTE_CENTRE_Y;
    const aspect = (this.worldHeight * VIGNETTE_RADIUS_Y) / (this.worldWidth * VIGNETTE_RADIUS_X);

    context.save();
    context.translate(cx, cy);
    context.scale(1, aspect);
    context.fillStyle = this.vignetteGradient;
    context.fillRect(-cx, -cy / aspect, this.worldWidth, this.worldHeight / aspect);
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

  // Build the 16 plankton motes from the same per-index `:nth-child` formulas as `.aq__mote` (box = core + halo room),
  // so the canvas field matches the DOM scatter, drift and timing.
  private buildMotes(): DecorMote[] {
    return Array.from({ length: MOTE_COUNT }, (_, index) => {
      const i = index + 1;
      const box = 1.5 + (i % 3) + 10;
      const centerX = (((i * 37) % 100) / 100) * this.worldWidth + box / 2;

      return {
        centerX,
        centerY: (((i * 53) % 100) / 100) * this.worldHeight + box / 2,
        radius: box / 2,
        normX: centerX / this.worldWidth,
        dx: ((i % 7) - 3) * 8,
        dy: -((i % 5) * 7),
        peak: 0.4 + (i % 6) * 0.1,
        // `ease-in-out alternate` → a there-and-back cycle of 2 × the per-mote duration; negative CSS delay → +offset.
        cycleMs: 2 * (10 + (i % 12)) * 1000,
        delayMs: i * 0.7 * 1000,
        gradient: null,
      };
    });
  }

  // Build the 12 bubbles from the same per-index `:nth-child` formulas as `.aq__bubble`, so the canvas columns match
  // the DOM scatter, wobble amplitude and timing.
  private buildBubbles(): DecorBubble[] {
    return Array.from({ length: BUBBLE_COUNT }, (_, index) => {
      const i = index + 1;
      const size = 5 + ((i * 7) % 12);
      const centerX = (((i * 61) % 97) / 100) * this.worldWidth + size / 2;

      return {
        centerX,
        radius: size / 2,
        normX: centerX / this.worldWidth,
        drift: ((i % 5) - 2) * 9,
        // `linear` non-alternate rise loops over the per-bubble duration; negative CSS delay → +offset.
        cycleMs: (6 + (i % 8)) * 1000,
        delayMs: i * 0.83 * 1000,
        gradient: null,
      };
    });
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

  // Resolve every theme colour from the live cascade: the per-shape blade tints (depth-dimming folded in), the mote
  // glow/plankton + bubble + vignette fills (kept as full rgba strings for their alpha), and the light-theme mote
  // enlargement. Done only on attach/resize, off the hot path.
  private resolveColors(scope: HTMLElement): void {
    const base = PLANT_COLOR_VARS.map((name) => parseColorChannels(readCssColor(scope, name)));

    for (const blade of this.blades) {
      const [red, green, blue] = base[blade.shape];
      const factor = blade.brightness;

      // `color-mix(in srgb, base f%, #000)` is exactly `base × f` per channel — the DOM equivalent of `kelpTint`.
      blade.color = `rgb(${Math.round(red * factor)}, ${Math.round(green * factor)}, ${Math.round(blue * factor)})`;
    }

    this.planktonColor = readCssColor(scope, '--aq-plankton');
    this.glowColor = readCssColor(scope, '--aq-glow');
    this.bubbleColor = readCssColor(scope, '--aq-bubble');
    this.vignetteColor = readCssColor(scope, '--aq-vignette');
    this.moteScale = readCssNumber(scope, '--aq-mote-scale', 1);
    this.buildGradients();
  }

  // Build the particle/vignette gradients once per theme (attach/resize), at the LOCAL origin so the hot draw path
  // can place each with a cheap translate (+ scale for bubbles) instead of allocating a fresh radial gradient every
  // frame. Gradient coordinates are interpreted under the CTM at PAINT time, so a local-origin gradient placed by a
  // per-frame translate is pixel-identical to one created at the particle's world position.
  private buildGradients(): void {
    const context = this.context;

    if (context === null) {
      return;
    }

    const vignette = context.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      this.worldWidth * VIGNETTE_RADIUS_X,
    );

    vignette.addColorStop(0, TRANSPARENT);
    vignette.addColorStop(VIGNETTE_HOLE_STOP, TRANSPARENT);
    vignette.addColorStop(1, this.vignetteColor);
    this.vignetteGradient = vignette;

    for (const mote of this.motes) {
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, mote.radius * this.moteScale);

      gradient.addColorStop(0, this.planktonColor);
      gradient.addColorStop(0.3, this.planktonColor);
      gradient.addColorStop(0.6, this.glowColor);
      gradient.addColorStop(1, TRANSPARENT);
      mote.gradient = gradient;
    }

    for (const bubble of this.bubbles) {
      // Highlight at -36%,-44% of the radius (mirrors the live build) at the BASE radius — the per-frame scale grows it.
      const gradient = context.createRadialGradient(
        -bubble.radius * 0.36,
        -bubble.radius * 0.44,
        0,
        0,
        0,
        bubble.radius,
      );

      gradient.addColorStop(0, BUBBLE_HIGHLIGHT);
      gradient.addColorStop(0.45, this.bubbleColor);
      gradient.addColorStop(0.72, BUBBLE_RIM);
      gradient.addColorStop(1, BUBBLE_RIM);
      bubble.gradient = gradient;
    }
  }
}

// Resolve a CSS custom property to a concrete `rgb(...)` / `rgba(...)` string in the element's cascade: a throwaway
// probe inherits the theme var and getComputedStyle normalizes it. Done only on attach/resize, off the hot path.
function readCssColor(scope: HTMLElement, variableName: string): string {
  const probe = document.createElement('span');

  probe.style.color = `var(${variableName})`;
  probe.style.position = 'absolute';
  probe.style.opacity = '0';
  probe.style.pointerEvents = 'none';
  scope.appendChild(probe);

  const computed = getComputedStyle(probe).color;

  probe.remove();

  return computed || TRANSPARENT;
}

// Pull the first three integers out of a computed `rgb(...)` / `rgba(...)` string; black on anything unparseable.
function parseColorChannels(value: string): [number, number, number] {
  const parts = value.match(/\d+(?:\.\d+)?/g);

  if (parts === null || parts.length < 3) {
    return [0, 0, 0];
  }

  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

// Read a plain numeric custom property (e.g. `--aq-mote-scale: 1.8`) from the cascade; the fallback on an empty/NaN.
function readCssNumber(scope: HTMLElement, variableName: string, fallback: number): number {
  const raw = Number.parseFloat(getComputedStyle(scope).getPropertyValue(variableName));

  return Number.isFinite(raw) ? raw : fallback;
}
