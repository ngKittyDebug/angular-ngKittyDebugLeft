import type { ItemType, Line, Stage } from '@game/frenzy/types';

// Magikarp has a single evolution (Gyarados), so stages 2 and 3 share it.
const STAGE_SPRITES: Record<Line, Record<Stage, string>> = {
  caterpie: { 1: 'caterpie', 2: 'metapod', 3: 'butterfree' },
  magikarp: { 1: 'magikarp', 2: 'gyarados', 3: 'gyarados' },
  pidgey: { 1: 'pidgey', 2: 'pidgeotto', 3: 'pidgeot' },
  bulbasaur: { 1: 'bulbasaur', 2: 'ivysaur', 3: 'venusaur' },
  charmander: { 1: 'charmander', 2: 'charmeleon', 3: 'charizard' },
  squirtle: { 1: 'squirtle', 2: 'wartortle', 3: 'blastoise' },
};

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
};

// On-screen sprite height (px) per evolution stage — the single knob for tuning Pokémon size.
// Width follows the source aspect ratio; bigger stages read as growth on evolution.
const STAGE_SPRITE_HEIGHT_PX: Record<Stage, number> = {
  1: 72,
  2: 96,
  3: 120,
};

export function spritePathFor(line: Line, stage: Stage = 1): string {
  const filename = STAGE_SPRITES[line][stage];

  return `/sprites/${filename}.gif`;
}

export function spriteHeightFor(stage: Stage = 1): string {
  return `${STAGE_SPRITE_HEIGHT_PX[stage]}px`;
}

export function itemSpritePathFor(type: ItemType): string {
  return `/sprites/${ITEM_SPRITES[type]}`;
}
