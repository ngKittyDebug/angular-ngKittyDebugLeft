// Pure camera math for the scene's pan/zoom. Free of Angular and the DOM so it can be unit-tested directly;
// SceneCameraService owns the per-frame state and writes the results to the world layer via Renderer2.

// Camera smoothing: fraction of the remaining distance the camera covers toward its target each frame.
// Low enough to glide, high enough to keep up with the slow drift.
export const CAMERA_LERP = 0.12;

// Dead-zone band as a fraction of the viewport: the focus roams freely inside [low, high] without moving the
// camera; only when it crosses an edge does the camera scroll to hold it at that edge. Calmer than always
// centring — the camera stays still while the Pokémon drifts within the central band, which also removes the
// constant micro-scroll that beat against pixel rounding. Narrower band → the camera starts following sooner
// (the Pokémon reaches the edge with less drift).
//
// The band is PER-AXIS: horizontal is the middle ~third, vertical is TIGHTER still. The world has little
// vertical slack (CAMERA_VERTICAL_FILL renders it only ~25% taller than the viewport), so following the Pokémon
// up/down earlier keeps it comfortably framed instead of letting it ride near the top/bottom edge.
export const CAMERA_DEAD_ZONE_X_LOW = 0.35;
export const CAMERA_DEAD_ZONE_X_HIGH = 0.65;
export const CAMERA_DEAD_ZONE_Y_LOW = 0.42;
export const CAMERA_DEAD_ZONE_Y_HIGH = 0.58;

// Responsive zoom: the world layer is scaled so small screens see MORE of the world (smaller on-screen sprites)
// instead of a tiny zoomed-in slice, and large screens render a touch below native size. The server stays in
// world px — this only changes how much world the camera window shows, making the visible world fraction more
// uniform across screens. These three are render-only tunables (no contract impact); pick final values by
// playtest.
export const CAMERA_REFERENCE_WIDTH = 1700;
export const CAMERA_MIN_SCALE = 0.55;
export const CAMERA_MAX_SCALE = 0.85;

// Foreground parallax: faint tiled particle layers in front of the world, shifted by the CAMERA offset — so they
// only drift while the viewport actually scrolls (the dead-zone holds the camera still during small meanders),
// giving a subtle direction cue during travel rather than a constant swarm. The factor is each layer's speed
// relative to the camera; kept gentle so it never lurches opposite the motion. Render-only tunables.
export const PARALLAX_NEAR = 0.6;
export const PARALLAX_MID = 0.35;
// Tile period (px) of each parallax layer's repeating speck pattern — MUST match the `background-size` of
// `.scene__parallax-inner--near/mid` in scene.component.scss. The camera wraps its translate to this period
// (see `wrapParallaxPhase`), so the inner sheet only needs a one-tile oversize to never expose an edge.
export const PARALLAX_TILE_NEAR = 200;
export const PARALLAX_TILE_MID = 125;
// Foreground kelp layer: it's the CLOSEST thing to the camera, so it pans clearly FASTER than the world (>1) for
// a felt depth cue while the camera scrolls. Applied as a horizontal translate factor on the camera offset (see
// SceneCameraService). This is the ONLY layer that parallaxes — the backdrop and midground kelp are in-world
// (locked 1:1 to the camera so the Pokémon can hide in them), so the depth feel rides entirely on this factor;
// keep it well above 1 (1.02 was imperceptible).
export const PARALLAX_FRONT = 1.22;
// The foreground layer is sized to the scaled world width × this margin: with PARALLAX_FRONT panning it faster
// than the world, the margin guarantees its blades still span the viewport at the extremes of the scroll (so no
// gap opens at an edge). Must be ≥ PARALLAX_FRONT; see the coverage note in SceneCameraService.
export const FOREGROUND_WIDTH_FACTOR = 1.4;

// Vertical over-zoom: how much taller than the viewport the scaled world is rendered, so there's slack for the
// camera to actually scroll DOWN and follow the Pokémon (without it the height-cover term made the world fill the
// viewport exactly on most aspect ratios, pinning the floor to the bottom edge with zero vertical travel). 1.25 =
// 25% taller → the camera can hold the Pokémon off the bottom edge through its descent. Render-only tunable.
export const CAMERA_VERTICAL_FILL = 1.25;

// `comfort` is the width-driven zoom-out (`clamp(vw / REFERENCE, MIN, MAX)`); `cover` is the floor that keeps the
// scaled world filling the viewport on BOTH axes (so there's never a letterbox band), with the height term scaled
// by `CAMERA_VERTICAL_FILL` to leave vertical scroll room for following the Pokémon down. Cover wins when the
// window is large or awkwardly-shaped relative to the world (sprites grow a touch); otherwise comfort applies.
export function cameraScale(
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number,
): number {
  const comfort = Math.min(
    CAMERA_MAX_SCALE,
    Math.max(CAMERA_MIN_SCALE, viewportWidth / CAMERA_REFERENCE_WIDTH),
  );
  const cover = Math.max(
    viewportWidth / worldWidth,
    (viewportHeight / worldHeight) * CAMERA_VERTICAL_FILL,
  );

  return Math.max(comfort, cover);
}

// Clamp a one-axis camera offset (px) so the window never reveals past a world edge; when the world is smaller
// than the viewport it's centred (letterbox margins) instead.
export function clampCameraAxis(offset: number, viewport: number, world: number): number {
  if (world <= viewport) {
    return (viewport - world) / 2;
  }

  return Math.min(0, Math.max(viewport - world, offset));
}

// One-axis camera offset (px) that centres the normalized `focus` (0..1). Used for the opening snap so the view
// starts centred on the Pokémon rather than at a world corner.
export function centerCameraAxis(focus: number, viewport: number, world: number): number {
  return clampCameraAxis(viewport / 2 - focus * world, viewport, world);
}

// Wrap a parallax translate offset (px) to one tile period, yielding a value in (-tile, 0]: the layer's pattern
// repeats every `tile` px, so jumping by a whole period is invisible, and the bounded output lets the inner
// sheet stay a single tile larger than its clipping wrapper instead of covering the camera's full travel range.
export function wrapParallaxPhase(offset: number, tile: number): number {
  return ((offset % tile) - tile) % tile;
}

// The normalized (0..1) world rectangle currently inside the camera viewport (+ margin), used to soft-cull
// off-screen actors' per-frame position writes.
export interface VisibleNormBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Screen-px margin band added around the visible viewport before culling: an actor inside the margin (but past
// the true edge) is still position-updated, so it's already current by the time the camera scrolls it into view —
// no pop-in. Generous, since the only cost of keeping an actor is one style write.
export const CULL_MARGIN_PX = 160;

// Inverse camera projection: the normalized world rect visible this frame (+ margin). A world point `f` maps to
// screen px `f * worldPx * scale + cam`; invert against the [0, viewport] visible span. Returns null when the
// projection is degenerate (pre-first-frame), signalling callers to cull nothing.
export function visibleNormBounds(
  camX: number,
  camY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number,
): VisibleNormBounds | null {
  const screenWorldWidth = worldWidth * scale;
  const screenWorldHeight = worldHeight * scale;

  if (screenWorldWidth <= 0 || screenWorldHeight <= 0) {
    return null;
  }

  const marginX = CULL_MARGIN_PX / screenWorldWidth;
  const marginY = CULL_MARGIN_PX / screenWorldHeight;

  return {
    minX: -camX / screenWorldWidth - marginX,
    maxX: (viewportWidth - camX) / screenWorldWidth + marginX,
    minY: -camY / screenWorldHeight - marginY,
    maxY: (viewportHeight - camY) / screenWorldHeight + marginY,
  };
}

// Whether a normalized actor position falls within the visible (+ margin) world rect.
export function withinNormBounds(x: number, y: number, bounds: VisibleNormBounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

// One-axis dead-zone target (px): keep the current offset while the focus stays inside the band [lowFraction,
// highFraction] (fractions of the viewport); once it crosses a band edge, return the offset that pins it back to
// that edge. Always clamped to the world bounds. The band is passed in so each axis can use its own width.
export function deadZoneCameraAxis(
  currentOffset: number,
  focus: number,
  viewport: number,
  world: number,
  lowFraction: number,
  highFraction: number,
): number {
  if (world <= viewport) {
    return (viewport - world) / 2;
  }

  const screen = focus * world + currentOffset;
  const low = viewport * lowFraction;
  const high = viewport * highFraction;
  let offset = currentOffset;

  if (screen < low) {
    offset = low - focus * world;
  } else if (screen > high) {
    offset = high - focus * world;
  }

  return clampCameraAxis(offset, viewport, world);
}
