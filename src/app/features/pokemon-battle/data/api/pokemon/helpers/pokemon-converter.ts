import type { BattlePokemon, PokemonMove } from '../../../models/battle.model';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

export function convertPokemonDetailApiDataToBattlePokemon(
  raw: PokemonDetailApiData,
): BattlePokemon {
  const stats = {
    hp: raw.stats.find((s) => s.stat.name === 'hp')?.base_stat ?? 50,
    attack: raw.stats.find((s) => s.stat.name === 'attack')?.base_stat ?? 50,
    defense: raw.stats.find((s) => s.stat.name === 'defense')?.base_stat ?? 50,
    speed: raw.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 50,
  };

  const typeList = raw.types.map((t) => t.type.name);

  // We map the sprites using standard front_default and back_default.
  // Gifs are preferred if available in raw.sprites.other.showdown, but front_default is guaranteed.
  const frontSprite =
    raw.sprites.other.showdown?.front_default ||
    raw.sprites.front_default ||
    'frenzy/pokemon/sprites/bulbasaur.gif';

  const backSprite =
    raw.sprites.other.showdown?.back_default || raw.sprites.back_default || frontSprite;

  const moveList = convertPokemonDetailApiDataToPokemonMoveList(raw);

  return {
    id: raw.id,
    name: raw.name,
    maxHp: stats.hp,
    hp: stats.hp,
    stats,
    types: typeList,
    sprites: {
      front: frontSprite,
      back: backSprite,
    },
    moves: moveList,
  };
}

export function convertPokemonDetailApiDataToPokemonMoveList(
  raw: PokemonDetailApiData,
): PokemonMove[] {
  const pokemonTypeList = raw.types.map((t) => t.type.name.toLowerCase());
  const primaryType = pokemonTypeList[0] || 'normal';

  // Move dictionary mapping common move names to type and power
  const moveDict: Record<string, { type: string; power: number }> = {
    tackle: { type: 'normal', power: 40 },
    scratch: { type: 'normal', power: 40 },
    pound: { type: 'normal', power: 40 },
    growl: { type: 'normal', power: 40 },
    ember: { type: 'fire', power: 40 },
    flamethrower: { type: 'fire', power: 90 },
    'fire-spin': { type: 'fire', power: 35 },
    'vine-whip': { type: 'grass', power: 45 },
    'razor-leaf': { type: 'grass', power: 55 },
    'mega-drain': { type: 'grass', power: 40 },
    'water-gun': { type: 'water', power: 40 },
    surf: { type: 'water', power: 90 },
    bubble: { type: 'water', power: 40 },
    'poison-sting': { type: 'poison', power: 30 },
    sludge: { type: 'poison', power: 65 },
    acid: { type: 'poison', power: 40 },
  };

  const defaultNormalMove: PokemonMove = { name: 'tackle', type: 'normal', power: 40 };

  const inferMove = (name: string): PokemonMove => {
    const nameLower = name.toLowerCase();

    if (moveDict[nameLower]) {
      return { name, ...moveDict[nameLower] };
    }

    let type = 'normal';

    if (nameLower.includes('fire') || nameLower.includes('flame') || nameLower.includes('ember')) {
      type = 'fire';
    } else if (
      nameLower.includes('water') ||
      nameLower.includes('hydro') ||
      nameLower.includes('bubble') ||
      nameLower.includes('surf')
    ) {
      type = 'water';
    } else if (
      nameLower.includes('grass') ||
      nameLower.includes('leaf') ||
      nameLower.includes('vine') ||
      nameLower.includes('seed') ||
      nameLower.includes('drain')
    ) {
      type = 'grass';
    } else if (
      nameLower.includes('poison') ||
      nameLower.includes('acid') ||
      nameLower.includes('sludge') ||
      nameLower.includes('toxic')
    ) {
      type = 'poison';
    }

    return { name, type, power: 40 };
  };

  const moveList: PokemonMove[] = [];

  // 1. Add tackle or a normal move
  moveList.push(defaultNormalMove);

  // 2. Add type matching move
  const typeMatchingMove = raw.moves.find((m) => {
    const inferred = inferMove(m.move.name);

    return pokemonTypeList.includes(inferred.type);
  });

  if (typeMatchingMove) {
    moveList.push(inferMove(typeMatchingMove.move.name));
  } else if (raw.moves.length > 0) {
    moveList.push(inferMove(raw.moves[0].move.name));
  } else {
    if (primaryType === 'fire') {
      moveList.push({ name: 'ember', type: 'fire', power: 40 });
    } else if (primaryType === 'water') {
      moveList.push({ name: 'water-gun', type: 'water', power: 40 });
    } else if (primaryType === 'grass') {
      moveList.push({ name: 'vine-whip', type: 'grass', power: 45 });
    } else if (primaryType === 'poison') {
      moveList.push({ name: 'poison-sting', type: 'poison', power: 30 });
    }
  }

  // Ensure unique moveList
  const uniqueMoveList: PokemonMove[] = [];
  const seenNames = new Set<string>();

  for (const mv of moveList) {
    if (!seenNames.has(mv.name.toLowerCase())) {
      seenNames.add(mv.name.toLowerCase());
      uniqueMoveList.push(mv);
    }
  }

  return uniqueMoveList;
}
