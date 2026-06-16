import type { ParamMap } from '@angular/router';

// Per-category `?debug` overlay toggles. Each gates one piece of the scene's debug draw independently, so a
// session can focus on just the boxes, just the items, or just the speed readout without the others cluttering.
export interface DebugFlags {
  // Yellow art bounds + green body hitbox drawn around every Pokémon (the AABB source vs the sprite silhouette).
  pokemonBorders: boolean;
  // Yellow bounds drawn around every falling/landed item.
  itemBorders: boolean;
  // Per-Pokémon drift-speed readout pill.
  speed: boolean;
  // Screen-space perf readout panel: FPS, own-sprite prediction-gap (px) and authoritative-snapshot staleness (ms)
  // — for diagnosing framerate and the steering rubber-band on low-end devices.
  perf: boolean;
}

// Public slug ⇆ flag map. Slugs are the kebab-case category names a user types in the URL; the keys they flip
// are the `DebugFlags` fields. Keep this the single source of truth for both directions (parse + docs).
const FLAG_BY_SLUG: Readonly<Record<string, keyof DebugFlags>> = {
  'pokemon-borders': 'pokemonBorders',
  'item-borders': 'itemBorders',
  speed: 'speed',
  perf: 'perf',
};

const NONE: DebugFlags = {
  pokemonBorders: false,
  itemBorders: false,
  speed: false,
  perf: false,
};

function all(): DebugFlags {
  return { pokemonBorders: true, itemBorders: true, speed: true, perf: true };
}

/**
 * Parse the `?debug` query param into per-category toggles:
 *  - param absent              → everything off (no overlay)
 *  - `?debug` (no value)       → everything on (the "show all" shorthand)
 *  - `?debug=pokemon-borders`  → only that category; combine via comma (`?debug=pokemon-borders,speed`) or by
 *                                repeating the param (`?debug=pokemon-borders&debug=speed`)
 * Unknown slugs are ignored. Whitespace around slugs is tolerated.
 */
export function parseDebugFlags(parameters: ParamMap): DebugFlags {
  if (!parameters.has('debug')) {
    return { ...NONE };
  }

  const slugs = parameters
    .getAll('debug')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  // Bare `?debug` (empty value) is the "show all" shorthand.
  if (slugs.length === 0) {
    return all();
  }

  const flags = { ...NONE };

  for (const slug of slugs) {
    const flag = FLAG_BY_SLUG[slug];

    if (flag) {
      flags[flag] = true;
    }
  }

  return flags;
}
