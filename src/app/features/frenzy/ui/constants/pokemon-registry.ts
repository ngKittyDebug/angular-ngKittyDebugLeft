import type { ItemType, NpcKind, Stage } from '@game/frenzy/types';

import type { Line, SpriteArt } from '../../data/constants/pokemon-body';
import {
  resolveLine,
  scaleFor,
  STAGE_ART,
  STAGE_DISPLAY_HEIGHT,
} from '../../data/constants/pokemon-body';

// Re-exported so ui consumers keep importing `Line` from the registry next to the roster it indexes.
export type { Line };

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
  cactus: { sprite: 'cactus.png', dotColor: '#3fa34d', sandPuff: 0.4 },
};

// NPC appearances are rendered from a single static PNG scaled per evolution stage — deliberately NOT routed
// through the Pokémon `Line`/GIF machinery (no native/body rects, no growth bands) and NOT listed in
// `POKEMON_LINES`, so the picker never offers an NPC as a playable creature. One row per NPC appearance: the PNG
// served from `/frenzy/npc/` and the square render side per stage, matching the server body sizes in
// `shared-game/frenzy/definition/npcs/angry-bomb.ts` (64/88/112).
// Keyed by `NpcKind` (not a loose string) so a new NPC kind is a compile error here until it gets a sprite —
// mirrors how LINE_META/ITEM_ART are keyed by their exact unions.
const NPC_SPRITES: Record<NpcKind, { sprite: string; size: Record<Stage, number> }> = {
  angryBomb: { sprite: 'angry-bomb.svg', size: { 1: 64, 2: 88, 3: 112 } },
};

// True when the appearance id is a known NPC (rendered as a static PNG), not a playable Pokémon line. A type guard
// so callers can index `NPC_SPRITES` with the narrowed `NpcKind`.
export function isNpcAppearance(appearance: string): appearance is NpcKind {
  // Own-property check, not `in` - an untrusted appearance id must not match inherited names (constructor, etc.).
  return Object.hasOwn(NPC_SPRITES, appearance);
}

export function spritePathFor(appearance: string, stage: Stage = 1): string {
  if (isNpcAppearance(appearance)) {
    return `/frenzy/npc/${NPC_SPRITES[appearance].sprite}`;
  }

  const { sprite } = STAGE_ART[resolveLine(appearance)][stage];

  return `/frenzy/pokemon/sprites/${sprite}.gif`;
}

// Client-only render placement for a sprite stage: the full-art box (world px) plus the offset to translate it so
// the body centre lands on the actor's point. Never sent to the server (peers' values are looked up by appearance).
export interface SpriteRender {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
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

// Client render placement for an appearance + stage: full-art size and the offset to centre the body on the point.
// NPCs render as a centred square PNG (width = height = per-stage side, no offset) — the collidable body itself
// still comes from the server snapshot; this is only the render box.
export function spriteRenderFor(appearance: string, stage: Stage = 1): SpriteRender {
  if (isNpcAppearance(appearance)) {
    const side = NPC_SPRITES[appearance].size[stage];

    return { width: side, height: side, offsetX: 0, offsetY: 0 };
  }

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
