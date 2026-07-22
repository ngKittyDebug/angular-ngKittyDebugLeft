import type { PlayerBody, Stage, StageBody } from '@game/frenzy/types';

// Sprite geometry + wire-body derivation. This lives in the DATA layer because the server body hitbox
// (`PlayerBody`, sent to the server on join) is derived from these measured rectangles; the sprite name rides
// in the same row so the per-stage art doesn't spread across layers.

// The Pokémon roster is client-owned: the server only relays an opaque `appearance` id (`Player.appearance`)
// and never enumerates these. `Line` is the set of ids this client knows how to render.
export type Line = 'bulbasaur' | 'caterpie' | 'charmander' | 'magikarp' | 'pidgey' | 'squirtle';

// Fallback for an appearance id this client doesn't recognise (older/newer roster, tampered join) — render it
// as the first line rather than break. Keeps the client tolerant of the server's opaque relay.
const FALLBACK_LINE: Line = 'caterpie';

export function resolveLine(appearance: string): Line {
  return appearance in STAGE_ART ? (appearance as Line) : FALLBACK_LINE;
}

// On-screen sprite height per stage (world px) — the growth bands. Render width follows each sprite's native
// aspect; the body hitbox and render offset scale from the same band. Bigger stages read as growth.
export const STAGE_DISPLAY_HEIGHT: Record<Stage, number> = { 1: 72, 2: 96, 3: 120 };

// Shared per-stage motion profile (normalized units/sec) + HP gate to ENTER the stage. Speeds dip a touch with
// size so growth reads as heft; gates split the 0→1500 hp ceiling into even thirds (stage 1 baseline 0), so the
// two evolutions land at the third-marks of the status bar and stage 3 keeps a 1000→1500 headroom. Same per line.
const STAGE_MOTION: Record<Stage, Pick<StageBody, 'speed' | 'maxSpeed' | 'hp'>> = {
  1: { speed: 0.032, maxSpeed: 0.075, hp: 0 },
  2: { speed: 0.028, maxSpeed: 0.065, hp: 500 },
  3: { speed: 0.024, maxSpeed: 0.055, hp: 1000 },
};

// Per sprite: native GIF canvas `[width, height]` (measured) and the collidable BODY rectangle `[x, y, w, h]`
// within that canvas, in native px. The body is the torso you actually collide with — for compact creatures it's
// the whole opaque silhouette; for winged/long ones (butterfree, the Pidgey line, Charizard) it's just the core,
// so wings/tails don't inflate the hitbox. Everything the game needs derives from these two rectangles:
//   render size  = native scaled to the stage's display height (sprite drawn full, wings and all)
//   hitbox (→ server, `StageBody.width/height`) = body scaled to world px, centred on the actor's point
//   render offset = (body centre − art centre) scaled, so the BODY lands on the point while the art sits around it
// Author/tune a body rect by eye against the `?debug` overlay (green = body hitbox, grey = full art box).
export interface SpriteArt {
  // The GIF basename (no extension) under /frenzy/pokemon/sprites — the per-stage evolution sprite for this line.
  sprite: string;
  native: readonly [number, number];
  body: readonly [number, number, number, number];
}

export const STAGE_ART: Record<Line, Record<Stage, SpriteArt>> = {
  caterpie: {
    1: { sprite: 'caterpie', native: [46, 45], body: [3, 2, 30, 43] },
    2: { sprite: 'metapod', native: [42, 54], body: [1, 0, 41, 54] },
    3: { sprite: 'butterfree', native: [90, 85], body: [34, 24, 24, 54] }, // torso only, wings excluded
  },
  magikarp: {
    // Magikarp has a single evolution (Gyarados), so stages 2 and 3 share its sprite and body.
    1: { sprite: 'magikarp', native: [58, 60], body: [1, 15, 54, 45] },
    2: { sprite: 'gyarados', native: [115, 99], body: [6, 5, 103, 88] }, // serpentine, whole body
    3: { sprite: 'gyarados', native: [115, 99], body: [6, 5, 103, 88] },
  },
  pidgey: {
    1: { sprite: 'pidgey', native: [36, 49], body: [0, 0, 36, 49] },
    2: { sprite: 'pidgeotto', native: [115, 86], body: [40, 30, 35, 48] }, // torso, wings excluded
    3: { sprite: 'pidgeot', native: [124, 124], body: [48, 40, 36, 64] }, // torso, wings excluded
  },
  bulbasaur: {
    1: { sprite: 'bulbasaur', native: [45, 49], body: [1, 1, 43, 48] },
    2: { sprite: 'ivysaur', native: [84, 66], body: [1, 0, 79, 66] },
    3: { sprite: 'venusaur', native: [106, 77], body: [1, 0, 104, 77] },
  },
  charmander: {
    1: { sprite: 'charmander', native: [48, 57], body: [0, 1, 44, 56] },
    2: { sprite: 'charmeleon', native: [60, 70], body: [2, 2, 51, 68] },
    3: { sprite: 'charizard', native: [133, 140], body: [28, 44, 68, 90] }, // head+chest+torso, wings & tail excluded
  },
  squirtle: {
    1: { sprite: 'squirtle', native: [53, 54], body: [0, 0, 44, 54] },
    2: { sprite: 'wartortle', native: [56, 73], body: [0, 0, 56, 73] },
    3: { sprite: 'blastoise', native: [88, 83], body: [1, 1, 87, 82] },
  },
};

export function scaleFor(art: SpriteArt, stage: Stage): number {
  return STAGE_DISPLAY_HEIGHT[stage] / art.native[1];
}

// Body hitbox (world px) for one stage — scaled from the native body rect, paired with the motion profile.
function hitboxFor(art: SpriteArt, stage: Stage): StageBody {
  const scale = scaleFor(art, stage);

  return {
    width: Math.round(art.body[2] * scale),
    height: Math.round(art.body[3] * scale),
    ...STAGE_MOTION[stage],
  };
}

// Body hitbox descriptor sent to the server on join (`Player.body`): per-stage hitbox dims + motion. Unknown ids
// resolve to the fallback line (mirrors `spritePathFor`). The server centres width/height on the actor's point.
export function bodyForAppearance(appearance: string): PlayerBody {
  const art = STAGE_ART[resolveLine(appearance)];

  return { 1: hitboxFor(art[1], 1), 2: hitboxFor(art[2], 2), 3: hitboxFor(art[3], 3) };
}
