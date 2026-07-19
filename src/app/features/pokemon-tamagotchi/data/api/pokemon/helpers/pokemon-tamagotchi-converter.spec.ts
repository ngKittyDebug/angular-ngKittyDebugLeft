import { describe, expect, it } from 'vitest';
import type { EvolutionChainItemApiData } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { POKEMON_EVOLUTION_CHAIN_FIXTURE } from '@shared/fixtures/eevee-evolution-chain.fixture';
import {
  EVOLUTION_REQUIREMENTS,
  EVOLUTION_REQUIREMENTS_STAGE_2,
} from '../../../constants/evolution-criteria.constants';
import { buildLinearEvolutionChain } from '../../../fixtures/tamagotchi-arbitraries';
import { createPokemonDetailFixture } from '../../../fixtures/pokemon-detail.fixture';
import {
  buildNextEvolutionStep,
  convertPokemonDetailApiDataToTamagotchiPokemon,
  isFirstStageInEvolutionChain,
} from './pokemon-tamagotchi-converter';

const SHOWDOWN_SPRITE = '/sprites/showdown.gif';
const ARTWORK_SPRITE = '/sprites/artwork.png';
const PIXEL_SPRITE = '/sprites/pixel.png';
const POKEMON_SPRITE_FALLBACK_URL = '/images/svg/pokeball.svg';

function detailForSpecies(speciesName: string, id: number): PokemonDetailApiData {
  return createPokemonDetailFixture({
    artworkSprite: ARTWORK_SPRITE,
    frontDefault: PIXEL_SPRITE,
    id,
    name: speciesName,
    showdownSprite: SHOWDOWN_SPRITE,
    weight: 60,
  });
}

function detailWithSprites(): PokemonDetailApiData {
  return detailForSpecies('pikachu', 25);
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

function buildBabyLinearChain(): EvolutionChainItemApiData {
  return {
    evolution_details: [],
    evolves_to: [
      {
        evolution_details: [],
        evolves_to: [
          {
            evolution_details: [],
            evolves_to: [],
            is_baby: false,
            species: { name: 'raichu', url: '' },
          },
        ],
        is_baby: false,
        species: { name: 'pikachu', url: '' },
      },
    ],
    is_baby: true,
    species: { name: 'pichu', url: '' },
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

    it('должен согласовывать requirements следующей стадии с currentStage', () => {
      const chain = buildLinearEvolutionChain(3);
      const midStage = convertPokemonDetailApiDataToTamagotchiPokemon(
        detailForSpecies('species-1', 2),
        { baby_trigger_item: null, chain, id: 1 },
      );

      expect(midStage.evolutionChain.currentStage).toBe(2);
      expect(midStage.evolutionChain.nextEvolution?.pokemonId).toBe('species-2');
      expect(midStage.evolutionChain.nextEvolution?.requirements).toEqual(
        EVOLUTION_REQUIREMENTS_STAGE_2,
      );
    });

    it('должен брать только первую ветвь evolves_to для nextEvolution', () => {
      const pokemon = convertPokemonDetailApiDataToTamagotchiPokemon(
        detailForSpecies('eevee', 133),
        POKEMON_EVOLUTION_CHAIN_FIXTURE,
      );

      expect(pokemon.evolutionChain.nextEvolution?.pokemonId).toBe('vaporeon');
      expect(pokemon.evolutionChain.nextEvolution?.pokemonId).not.toBe('jolteon');
    });

    it('должен считать первой стадией первого non-baby на primary-пути', () => {
      const chain = buildBabyLinearChain();
      const response = { baby_trigger_item: null, chain, id: 1 };

      const pichu = convertPokemonDetailApiDataToTamagotchiPokemon(
        detailForSpecies('pichu', 172),
        response,
      );
      const pikachu = convertPokemonDetailApiDataToTamagotchiPokemon(
        detailForSpecies('pikachu', 25),
        response,
      );
      const raichu = convertPokemonDetailApiDataToTamagotchiPokemon(
        detailForSpecies('raichu', 26),
        response,
      );

      expect(pichu.isFirstStage).toBe(false);
      expect(pikachu.isFirstStage).toBe(true);
      expect(raichu.isFirstStage).toBe(false);
      expect(isFirstStageInEvolutionChain('pichu', chain)).toBe(false);
      expect(isFirstStageInEvolutionChain('pikachu', chain)).toBe(true);
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

    it('должен игнорировать остальные ветви evolves_to кроме первой', () => {
      const branched: EvolutionChainItemApiData = {
        evolution_details: [],
        evolves_to: [
          {
            evolution_details: [],
            evolves_to: [],
            is_baby: false,
            species: { name: 'vaporeon', url: '' },
          },
          {
            evolution_details: [],
            evolves_to: [],
            is_baby: false,
            species: { name: 'jolteon', url: '' },
          },
        ],
        is_baby: false,
        species: { name: 'eevee', url: '' },
      };

      const nextStep = buildNextEvolutionStep(branched);

      expect(nextStep?.pokemonId).toBe('vaporeon');
    });
  });
});
