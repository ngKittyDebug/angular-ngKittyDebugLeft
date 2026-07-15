import { describe, expect, it } from 'vitest';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import {
  EVOLUTION_REQUIREMENTS,
  EVOLUTION_REQUIREMENTS_STAGE_2,
} from '../../../constants/evolution-criteria.constants';
import { buildLinearEvolutionChain } from '../../../fixtures/tamagotchi-arbitraries';
import {
  buildNextEvolutionStep,
  convertPokemonDetailApiDataToTamagotchiPokemon,
} from './pokemon-tamagotchi-converter';

const SHOWDOWN_SPRITE = '/sprites/showdown.gif';
const ARTWORK_SPRITE = '/sprites/artwork.png';
const PIXEL_SPRITE = '/sprites/pixel.png';
const POKEMON_SPRITE_FALLBACK_URL = '/images/svg/pokeball.svg';

function detailWithSprites(): PokemonDetailApiData {
  return {
    abilities: [],
    base_experience: 50,
    cries: { latest: '', legacy: '' },
    forms: [],
    game_indices: [],
    height: 7,
    held_items: [],
    id: 25,
    is_default: true,
    location_area_encounters: '',
    moves: [],
    name: 'pikachu',
    order: 25,
    past_abilities: [],
    past_stats: [],
    past_types: [],
    species: { name: 'pikachu', url: '' },
    sprites: {
      back_default: null,
      back_female: null,
      back_shiny: null,
      back_shiny_female: null,
      front_default: PIXEL_SPRITE,
      front_female: null,
      front_shiny: null,
      front_shiny_female: null,
      other: {
        dream_world: { front_default: null, front_female: null },
        home: {
          front_default: null,
          front_female: null,
          front_shiny: null,
          front_shiny_female: null,
        },
        'official-artwork': { front_default: ARTWORK_SPRITE, front_shiny: null },
        showdown: {
          back_default: null,
          back_female: null,
          back_shiny: null,
          back_shiny_female: null,
          front_default: SHOWDOWN_SPRITE,
          front_female: null,
          front_shiny: null,
          front_shiny_female: null,
        },
      },
      versions: {},
    },
    stats: [],
    types: [],
    weight: 60,
  } as unknown as PokemonDetailApiData;
}

function detailWithoutSprites(): PokemonDetailApiData {
  const detail = detailWithSprites();

  return {
    ...detail,
    sprites: {
      ...detail.sprites,
      back_default: null,
      front_default: null,
      front_shiny: null,
      other: {
        ...detail.sprites.other,
        'official-artwork': { front_default: null, front_shiny: null },
        showdown: {
          ...detail.sprites.other.showdown,
          front_default: null,
          front_shiny: null,
        },
      },
    },
  };
}

describe('pokemonTamagotchiConverter', () => {
  describe('convertPokemonDetailApiDataToTamagotchiPokemon', () => {
    it('должен использовать showdown-спрайт как основной, как в цепочке эволюции', () => {
      const chain = buildLinearEvolutionChain(1);
      const pokemon = convertPokemonDetailApiDataToTamagotchiPokemon(detailWithSprites(), {
        baby_trigger_item: null,
        chain,
        id: 1,
      });

      expect(pokemon.spriteUrls.normal).toBe(SHOWDOWN_SPRITE);
      expect(pokemon.spriteVariations.default.normal).toBe(SHOWDOWN_SPRITE);
      expect(pokemon.spriteVariations.retro.normal).toBe(PIXEL_SPRITE);
    });

    it('должен использовать fallback-спрайт, если API не вернул изображения', () => {
      const chain = buildLinearEvolutionChain(1);
      const pokemon = convertPokemonDetailApiDataToTamagotchiPokemon(detailWithoutSprites(), {
        baby_trigger_item: null,
        chain,
        id: 1,
      });

      expect(pokemon.spriteUrls.normal).toBe(POKEMON_SPRITE_FALLBACK_URL);
    });
  });

  describe('buildNextEvolutionStep', () => {
    it('должен строить цепочку следующих стадий из API-узла', () => {
      const chain = buildLinearEvolutionChain(3);

      const nextStep = buildNextEvolutionStep(chain);

      expect(nextStep).toEqual({
        pokemonId: 'species-1',
        requirements: EVOLUTION_REQUIREMENTS,
        childNextEvolution: {
          pokemonId: 'species-2',
          requirements: EVOLUTION_REQUIREMENTS_STAGE_2,
          childNextEvolution: undefined,
        },
      });
    });
  });
});
