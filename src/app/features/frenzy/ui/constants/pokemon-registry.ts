import type { ItemType, PlayerBody, Stage, StageBody } from '@game/frenzy/types';

// The Pokémon roster is client-owned: the server only relays an opaque `appearance` id (`Player.appearance`)
// and never enumerates these. `Line` is the set of ids this client knows how to render.
export type Line = 'bulbasaur' | 'caterpie' | 'charmander' | 'magikarp' | 'pidgey' | 'squirtle';

export interface PokemonLine {
  id: Line;
  label: string;
}

// Per-line display metadata for the picker (order is the on-screen order). Labels live here, with the sprites,
// so all per-line presentation is in one place — the server knows nothing about them.
export const POKEMON_LINES: readonly PokemonLine[] = [
  { id: 'caterpie', label: 'Caterpie' },
  { id: 'magikarp', label: 'Magikarp' },
  { id: 'pidgey', label: 'Pidgey' },
  { id: 'bulbasaur', label: 'Bulbasaur' },
  { id: 'charmander', label: 'Charmander' },
  { id: 'squirtle', label: 'Squirtle' },
];

// Magikarp has a single evolution (Gyarados), so stages 2 and 3 share it.
const STAGE_SPRITES: Record<Line, Record<Stage, string>> = {
  caterpie: { 1: 'caterpie', 2: 'metapod', 3: 'butterfree' },
  magikarp: { 1: 'magikarp', 2: 'gyarados', 3: 'gyarados' },
  pidgey: { 1: 'pidgey', 2: 'pidgeotto', 3: 'pidgeot' },
  bulbasaur: { 1: 'bulbasaur', 2: 'ivysaur', 3: 'venusaur' },
  charmander: { 1: 'charmander', 2: 'charmeleon', 3: 'charizard' },
  squirtle: { 1: 'squirtle', 2: 'wartortle', 3: 'blastoise' },
};

// Fallback for an appearance id this client doesn't recognise (older/newer roster, tampered join) — render it
// as the first line rather than break. Keeps the client tolerant of the server's opaque relay.
const FALLBACK_LINE: Line = 'caterpie';

function resolveLine(appearance: string): Line {
  return appearance in STAGE_SPRITES ? (appearance as Line) : FALLBACK_LINE;
}

// Resolve an appearance id to a known Line, or null when it isn't one this client renders (stale/garbage stored
// value). Unlike `resolveLine` (which falls back to a default so rendering never breaks), this reports "unknown"
// so callers can choose NOT to act on it — the picker pre-selects nothing, respawn falls back to the picker.
export function knownLine(appearance: string): Line | null {
  return POKEMON_LINES.some((option) => option.id === appearance) ? (appearance as Line) : null;
}

// Item art is mostly Microsoft Fluent Emoji (3D), downscaled to 120px PNG. A few are hand-picked SVG where the
// Fluent glyph didn't read (rock — Fluent 3D boulder; brick — Twemoji; shield & bomb — custom SVG, since no
// Unicode/Fluent glyph reads as a spiked sea mine). See CLAUDE.md ("Frenzy item art pipeline").
const ITEM_SPRITES: Record<ItemType, string> = {
  food: 'food.png',
  rotten: 'rotten.png',
  rock: 'rock.png',
  brick: 'brick.svg',
  rareCandy: 'rare-candy.png',
  bomb: 'bomb.svg',
  goldenBerry: 'golden-berry.png',
  crumb: 'crumb.png',
  mushroom: 'mushroom.png',
  vitamin: 'vitamin.png',
  shield: 'shield.svg',
  easterEgg: 'easter-egg.png',
  poop: 'poop.png',
};

export function spritePathFor(appearance: string, stage: Stage = 1): string {
  const filename = STAGE_SPRITES[resolveLine(appearance)][stage];

  return `/frenzy/pokemon/sprites/${filename}.gif`;
}

// On-screen sprite height per stage (world px) — the growth bands. Render width follows each sprite's native
// aspect; the body hitbox and render offset scale from the same band. Bigger stages read as growth.
const STAGE_DISPLAY_HEIGHT: Record<Stage, number> = { 1: 72, 2: 96, 3: 120 };

// Shared per-stage motion profile (normalized units/sec) + HP gate to ENTER the stage. Speeds dip a touch with
// size so growth reads as heft; gates mirror the old global 200/500 (stage 1 baseline 0). Same for every line.
const STAGE_MOTION: Record<Stage, Pick<StageBody, 'speed' | 'maxSpeed' | 'hp'>> = {
  1: { speed: 0.032, maxSpeed: 0.075, hp: 0 },
  2: { speed: 0.028, maxSpeed: 0.065, hp: 200 },
  3: { speed: 0.024, maxSpeed: 0.055, hp: 500 },
};

// Per sprite: native GIF canvas `[width, height]` (measured) and the collidable BODY rectangle `[x, y, w, h]`
// within that canvas, in native px. The body is the torso you actually collide with — for compact creatures it's
// the whole opaque silhouette; for winged/long ones (butterfree, the Pidgey line, Charizard) it's just the core,
// so wings/tails don't inflate the hitbox. Everything the game needs derives from these two rectangles:
//   render size  = native scaled to the stage's display height (sprite drawn full, wings and all)
//   hitbox (→ server, `StageBody.width/height`) = body scaled to world px, centred on the actor's point
//   render offset = (body centre − art centre) scaled, so the BODY lands on the point while the art sits around it
// Author/tune a body rect by eye against the `?debug` overlay (green = body hitbox, grey = full art box).
interface SpriteArt {
  native: readonly [number, number];
  body: readonly [number, number, number, number];
}

const STAGE_ART: Record<Line, Record<Stage, SpriteArt>> = {
  caterpie: {
    1: { native: [46, 45], body: [3, 2, 30, 43] },
    2: { native: [42, 54], body: [1, 0, 41, 54] },
    3: { native: [90, 85], body: [34, 24, 24, 54] }, // butterfree — torso only, wings excluded
  },
  magikarp: {
    1: { native: [58, 60], body: [1, 15, 54, 45] },
    2: { native: [115, 99], body: [6, 5, 103, 88] }, // gyarados — serpentine, whole body
    3: { native: [115, 99], body: [6, 5, 103, 88] },
  },
  pidgey: {
    1: { native: [36, 49], body: [0, 0, 36, 49] },
    2: { native: [115, 86], body: [40, 30, 35, 48] }, // pidgeotto — torso, wings excluded
    3: { native: [124, 124], body: [48, 40, 36, 64] }, // pidgeot — torso, wings excluded
  },
  bulbasaur: {
    1: { native: [45, 49], body: [1, 1, 43, 48] },
    2: { native: [84, 66], body: [1, 0, 79, 66] },
    3: { native: [106, 77], body: [1, 0, 104, 77] },
  },
  charmander: {
    1: { native: [48, 57], body: [0, 1, 44, 56] },
    2: { native: [60, 70], body: [2, 2, 51, 68] },
    3: { native: [133, 140], body: [44, 52, 52, 82] }, // charizard — torso, wings excluded
  },
  squirtle: {
    1: { native: [53, 54], body: [0, 0, 44, 54] },
    2: { native: [56, 73], body: [0, 0, 56, 73] },
    3: { native: [88, 83], body: [1, 1, 87, 82] },
  },
};

// Client-only render placement for a sprite stage: the full-art box (world px) plus the offset to translate it so
// the body centre lands on the actor's point. Never sent to the server (peers' values are looked up by appearance).
export interface SpriteRender {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

function scaleFor(art: SpriteArt, stage: Stage): number {
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

// Full-art render box + offset (world px) for one stage. Offset = (body centre − art centre) × scale, so drawing
// the art translated by −offset places the body centre on the actor's point (the art overhangs around it).
function renderFor(art: SpriteArt, stage: Stage): SpriteRender {
  const [nativeWidth, nativeHeight] = art.native;
  const [bodyX, bodyY, bodyWidth, bodyHeight] = art.body;
  const scale = scaleFor(art, stage);

  return {
    width: Math.round(nativeWidth * scale),
    height: STAGE_DISPLAY_HEIGHT[stage],
    offsetX: Math.round((bodyX + bodyWidth / 2 - nativeWidth / 2) * scale),
    offsetY: Math.round((bodyY + bodyHeight / 2 - nativeHeight / 2) * scale),
  };
}

// Body hitbox descriptor sent to the server on join (`Player.body`): per-stage hitbox dims + motion. Unknown ids
// resolve to the fallback line (mirrors `spritePathFor`). The server centres width/height on the actor's point.
export function bodyForAppearance(appearance: string): PlayerBody {
  const art = STAGE_ART[resolveLine(appearance)];

  return { 1: hitboxFor(art[1], 1), 2: hitboxFor(art[2], 2), 3: hitboxFor(art[3], 3) };
}

// Client render placement for an appearance + stage: full-art size and the offset to centre the body on the point.
export function spriteRenderFor(appearance: string, stage: Stage = 1): SpriteRender {
  return renderFor(STAGE_ART[resolveLine(appearance)][stage], stage);
}

export function itemSpritePathFor(type: ItemType): string {
  return `/frenzy/items/${ITEM_SPRITES[type]}`;
}

// Sand-puff intensity per item type — pure render data (no contract "weight" exists), keyed like ITEM_SPRITES.
// Heavier debris (rock/brick) kicks up a bigger, opaquer cloud on landing; light food/crumbs barely disturb the
// sand. The bomb gets the biggest puff — a blast against the seabed throws up the most sand; it only ever puffs
// when it detonates on the floor (the puff is rising-edge on `landed`, so a bomb still in the air never puffs).
const SAND_PUFF_WEIGHT: Record<ItemType, number> = {
  food: 0.3,
  rotten: 0.5,
  rock: 1,
  brick: 1.1,
  rareCandy: 0.35,
  bomb: 1.3,
  goldenBerry: 0.35,
  crumb: 0.25,
  mushroom: 0.4,
  vitamin: 0.4,
  shield: 0.5,
  easterEgg: 0.45,
  poop: 0.45,
};

export function sandPuffWeightFor(type: ItemType): number {
  return SAND_PUFF_WEIGHT[type];
}
