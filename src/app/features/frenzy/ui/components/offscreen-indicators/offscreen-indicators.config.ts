// Client-only render tuning for the off-screen player indicators. NOT part of the `@game/frenzy` contract — these
// never touch the server, they only shape how the HUD overlay looks/behaves. Pick final values by playtest.
export const OFFSCREEN_INDICATORS = {
  // How far inside the viewport edge (px) an arrow rides, so the badge sits fully on-screen instead of half-clipped.
  edgeMarginPx: 30,
  // Two off-screen players whose edge points fall within this gap (px, measured ALONG the shared edge) collapse
  // into one count-badge — the Google-Maps-marker behaviour. Roughly a badge width, so neighbours that would visually
  // overlap merge instead.
  clusterDistancePx: 72,
  // Hard ceiling on NAMED (single) arrows. Past it, the densest singles merge into count-badges first, so a crowded
  // map never sprouts a wall of name labels (the mobile clutter case). Spread-out singles keep their names.
  maxNamedArrows: 4,
  // Structural recompute rate (Hz): how often membership/name-vs-count is re-derived and pushed to the signal (the
  // only Angular work). Position is written every frame separately, so this can stay low without visible lag.
  structureHz: 8,
} as const;
