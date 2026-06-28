import type { BattlePokemon, PokemonMove } from '@game/pokemon-battle/types';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';

export function mapToBattlePokemon(raw: PokemonDetailApiData): BattlePokemon {
  const stats = {
    hp: raw.stats.find((s) => s.stat.name === 'hp')?.base_stat ?? 50,
    attack: raw.stats.find((s) => s.stat.name === 'attack')?.base_stat ?? 50,
    defense: raw.stats.find((s) => s.stat.name === 'defense')?.base_stat ?? 50,
    speed: raw.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 50,
  };

  const types = raw.types.map((t) => t.type.name);

  // We map the sprites using standard front_default and back_default.
  // Gifs are preferred if available in raw.sprites.other.showdown, but front_default is guaranteed.
  const frontSprite =
    raw.sprites.other.showdown?.front_default ||
    raw.sprites.front_default ||
    'frenzy/pokemon/sprites/bulbasaur.gif';

  const backSprite =
    raw.sprites.other.showdown?.back_default || raw.sprites.back_default || frontSprite;

  const moves = getMappedMoves(raw);

  return {
    id: raw.id,
    name: raw.name,
    maxHp: stats.hp,
    hp: stats.hp,
    stats,
    types,
    sprites: {
      front: frontSprite,
      back: backSprite,
    },
    moves,
  };
}

export function getMappedMoves(raw: PokemonDetailApiData): PokemonMove[] {
  const pokemonTypes = raw.types.map((t) => t.type.name.toLowerCase());
  const primaryType = pokemonTypes[0] || 'normal';

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

  const moves: PokemonMove[] = [];

  // 1. Add tackle or a normal move
  moves.push(defaultNormalMove);

  // 2. Add type matching move
  const typeMatchingMove = raw.moves.find((m) => {
    const inferred = inferMove(m.move.name);

    return pokemonTypes.includes(inferred.type);
  });

  if (typeMatchingMove) {
    moves.push(inferMove(typeMatchingMove.move.name));
  } else if (raw.moves.length > 0) {
    moves.push(inferMove(raw.moves[0].move.name));
  } else {
    if (primaryType === 'fire') {
      moves.push({ name: 'ember', type: 'fire', power: 40 });
    } else if (primaryType === 'water') {
      moves.push({ name: 'water-gun', type: 'water', power: 40 });
    } else if (primaryType === 'grass') {
      moves.push({ name: 'vine-whip', type: 'grass', power: 45 });
    } else if (primaryType === 'poison') {
      moves.push({ name: 'poison-sting', type: 'poison', power: 30 });
    }
  }

  // Ensure unique moves
  const uniqueMoves: PokemonMove[] = [];
  const seenNames = new Set<string>();

  for (const mv of moves) {
    if (!seenNames.has(mv.name.toLowerCase())) {
      seenNames.add(mv.name.toLowerCase());
      uniqueMoves.push(mv);
    }
  }

  return uniqueMoves;
}
