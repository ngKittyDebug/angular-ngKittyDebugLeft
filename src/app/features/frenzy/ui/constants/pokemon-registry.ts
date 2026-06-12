import type { ItemType, PlayerBody, Stage, StageBody } from '@game/frenzy/types';

// The Pokémon roster is client-owned: the server only relays an opaque `appearance` id (`Player.appearance`)
// and never enumerates these. `Line` is the set of ids this client knows how to render.
export type Line = 'bulbasaur' | 'caterpie' | 'charmander' | 'magikarp' | 'pidgey' | 'squirtle';

export interface PokemonLine {
  id: Line;
  label: string;
}

// Per-line picker metadata, keyed by `Line` so a NEW line must get an entry — a missing one is a compile error,
// not a line that silently never shows in the picker. `order` is the on-screen position. Labels live here with the
// sprites, so all per-line presentation is in one place; the server knows nothing about them.
const LINE_META: Record<Line, { label: string; order: number }> = {
  caterpie: { label: 'Caterpie', order: 0 },
  magikarp: { label: 'Magikarp', order: 1 },
  pidgey: { label: 'Pidgey', order: 2 },
  bulbasaur: { label: 'Bulbasaur', order: 3 },
  charmander: { label: 'Charmander', order: 4 },
  squirtle: { label: 'Squirtle', order: 5 },
};

// Picker options in on-screen order, derived from `LINE_META` (the completeness-guarded source). Consumers iterate
// this; adding a line to `LINE_META` is the only edit needed for it to appear here.
export const POKEMON_LINES: readonly PokemonLine[] = (Object.keys(LINE_META) as Line[])
  .sort((a, b) => LINE_META[a].order - LINE_META[b].order)
  .map((id) => ({ id, label: LINE_META[id].label }));

// Fallback for an appearance id this client doesn't recognise (older/newer roster, tampered join) — render it
// as the first line rather than break. Keeps the client tolerant of the server's opaque relay.
const FALLBACK_LINE: Line = 'caterpie';

function resolveLine(appearance: string): Line {
  return appearance in STAGE_ART ? (appearance as Line) : FALLBACK_LINE;
}

// Resolve an appearance id to a known Line, or null when it isn't one this client renders (stale/garbage stored
// value). Unlike `resolveLine` (which falls back to a default so rendering never breaks), this reports "unknown"
// so callers can choose NOT to act on it — the picker pre-selects nothing, respawn falls back to the picker.
export function knownLine(appearance: string): Line | null {
  return POKEMON_LINES.some((option) => option.id === appearance) ? (appearance as Line) : null;
}

// Everything render-side about a falling item, one row per type — so adding an item is a single edit and the three
// facets can't drift out of sync. `sprite`: the file under /frenzy/items (mostly Microsoft Fluent Emoji 3D
// downscaled to 120px PNG; a few hand-picked SVG where the Fluent glyph didn't read — rock = Fluent 3D boulder,
// brick = Twemoji, shield & bomb = custom SVG of a spiked sea mine; see CLAUDE.md "Frenzy item art pipeline").
// `dotColor`: the blip hue shared by the minimap dots and the legend swatch (status tokens where one fits the
// item's meaning, else a fixed hue legible on both scene gradients). `sandPuff`: landing-cloud intensity (pure
// render data, no contract "weight") — heavier debris (rock/brick/bomb) throws up more sand, light food barely any.
interface ItemArt {
  sprite: string;
  dotColor: string;
  sandPuff: number;
}

const ITEM_ART: Record<ItemType, ItemArt> = {
  food: { sprite: 'food.png', dotColor: 'var(--tui-status-positive)', sandPuff: 0.3 },
  rotten: { sprite: 'rotten.png', dotColor: '#8a6d3b', sandPuff: 0.5 },
  rock: { sprite: 'rock.png', dotColor: '#9aa5b1', sandPuff: 1 },
  brick: { sprite: 'brick.svg', dotColor: '#c1694f', sandPuff: 1.1 },
  rareCandy: { sprite: 'rare-candy.png', dotColor: '#ff6fa5', sandPuff: 0.35 },
  bomb: { sprite: 'bomb.svg', dotColor: 'var(--tui-status-negative)', sandPuff: 1.3 },
  goldenBerry: { sprite: 'golden-berry.png', dotColor: '#f5c518', sandPuff: 0.35 },
  crumb: { sprite: 'crumb.png', dotColor: '#9be15d', sandPuff: 0.25 },
  mushroom: { sprite: 'mushroom.png', dotColor: '#9b59b6', sandPuff: 0.4 },
  vitamin: { sprite: 'vitamin.png', dotColor: 'var(--tui-status-info)', sandPuff: 0.4 },
  shield: { sprite: 'shield.svg', dotColor: '#22d3ee', sandPuff: 0.5 },
  easterEgg: { sprite: 'easter-egg.png', dotColor: '#f0932b', sandPuff: 0.45 },
  poop: { sprite: 'poop.png', dotColor: '#7a5230', sandPuff: 0.45 },
};

export function spritePathFor(appearance: string, stage: Stage = 1): string {
  const { sprite } = STAGE_ART[resolveLine(appearance)][stage];

  return `/frenzy/pokemon/sprites/${sprite}.gif`;
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
  // The GIF basename (no extension) under /frenzy/pokemon/sprites — the per-stage evolution sprite for this line.
  sprite: string;
  native: readonly [number, number];
  body: readonly [number, number, number, number];
}

const STAGE_ART: Record<Line, Record<Stage, SpriteArt>> = {
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
  return `/frenzy/items/${ITEM_ART[type].sprite}`;
}

// Blip colour per item type, projected from `ITEM_ART` so the minimap dots and the legend swatch read the exact same
// hue from a single source. Kept as a `Record` export so existing call-sites (minimap, item-legend) are untouched.
export const ITEM_DOT_COLOR: Record<ItemType, string> = Object.fromEntries(
  (Object.keys(ITEM_ART) as ItemType[]).map((type) => [type, ITEM_ART[type].dotColor]),
) as Record<ItemType, string>;

// The bomb gets the biggest puff — a blast against the seabed throws up the most sand; it only ever puffs when it
// detonates on the floor (the puff is rising-edge on `landed`, so a bomb still in the air never puffs).
export function sandPuffWeightFor(type: ItemType): number {
  return ITEM_ART[type].sandPuff;
}
