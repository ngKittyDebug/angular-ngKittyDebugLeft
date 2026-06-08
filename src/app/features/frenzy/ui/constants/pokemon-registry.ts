import type { ItemType, Stage } from '@game/frenzy/types';

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

// Filenames include the extension since item art is mixed: pixel berries/rock are PNG, vector items (bomb, the new food trio) are SVG placeholders.
const ITEM_SPRITES: Record<ItemType, string> = {
  food: 'oran-berry.png',
  rotten: 'pecha-berry.png',
  rock: 'hard-stone.png',
  rareCandy: 'rare-candy.png',
  bomb: 'bomb.svg',
  goldenBerry: 'sitrus-berry.svg',
  crumb: 'berry-crumb.svg',
  mushroom: 'tiny-mushroom.svg',
  vitamin: 'vitamin.svg',
};

// On-screen sprite height (px) per evolution stage — the single knob for tuning Pokémon size.
// Width follows the source aspect ratio; bigger stages read as growth on evolution.
const STAGE_SPRITE_HEIGHT_PX: Record<Stage, number> = {
  1: 72,
  2: 96,
  3: 120,
};

export function spritePathFor(appearance: string, stage: Stage = 1): string {
  const filename = STAGE_SPRITES[resolveLine(appearance)][stage];

  return `/sprites/${filename}.gif`;
}

export function spriteHeightFor(stage: Stage = 1): string {
  return `${STAGE_SPRITE_HEIGHT_PX[stage]}px`;
}

export function itemSpritePathFor(type: ItemType): string {
  return `/sprites/${ITEM_SPRITES[type]}`;
}
