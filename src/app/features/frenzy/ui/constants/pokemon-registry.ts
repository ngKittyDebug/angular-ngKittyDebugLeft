import { FRENZY } from '@game/frenzy/config';
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
};

export function spritePathFor(appearance: string, stage: Stage = 1): string {
  const filename = STAGE_SPRITES[resolveLine(appearance)][stage];

  return `/sprites/${filename}.gif`;
}

// On-screen sprite height (px) per evolution stage — sourced from the shared physical-size contract so render
// size and the server's size-aware bounds (`FRENZY.physicalSizePx`) stay in lockstep. Width follows the source
// aspect ratio; bigger stages read as growth on evolution.
export function spriteHeightFor(stage: Stage = 1): string {
  return `${FRENZY.physicalSizePx.player[stage]}px`;
}

export function itemSpritePathFor(type: ItemType): string {
  return `/sprites/${ITEM_SPRITES[type]}`;
}
