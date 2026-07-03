import * as fc from 'fast-check';
import { TestBed } from '@angular/core/testing';
import type { EvolutionChainApiResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import {
  convertPokemonDetailApiDataToTamagotchiPokemon,
  isFirstStageInEvolutionChain,
} from '../api/pokemon/helpers/pokemon-tamagotchi-converter';
import { PokemonProfileIntegrationService } from './pokemon-profile-integration.service';
import { arbitraryLinearEvolutionChain } from '../fixtures/tamagotchi-arbitraries';

const PROPERTY_RUNS = 100;

function detailForSpecies(speciesName: string, id: number): PokemonDetailApiData {
  return {
    abilities: [],
    base_experience: 50,
    cries: { latest: '', legacy: '' },
    forms: [],
    game_indices: [],
    height: 7,
    held_items: [],
    id,
    is_default: true,
    location_area_encounters: '',
    moves: [],
    name: speciesName,
    order: id,
    past_abilities: [],
    past_stats: [],
    past_types: [],
    species: { name: speciesName, url: '' },
    sprites: {
      back_default: null,
      back_female: null,
      back_shiny: null,
      back_shiny_female: null,
      front_default: '/sprite.png',
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
        'official-artwork': { front_default: '/sprite-art.png', front_shiny: null },
      },
      versions: {},
    },
    stats: [],
    types: [],
    weight: 90,
  } as unknown as PokemonDetailApiData;
}

function evolutionResponseFromChain(
  chain: EvolutionChainApiResponse['chain'],
): EvolutionChainApiResponse {
  return {
    baby_trigger_item: null,
    chain,
    id: 1,
  };
}

describe('PokemonProfileIntegrationService', () => {
  describe('Property 5: валидация покемона первой стадии', () => {
    let integration: PokemonProfileIntegrationService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      integration = TestBed.inject(PokemonProfileIntegrationService);
    });

    // Feature: pokemon-tamagotchi, Property 5: First-Stage PokemonModel Validation
    describe('Happy Path', () => {
      it('должен классифицировать только корневой вид цепочки как первую стадию', () => {
        fc.assert(
          fc.property(arbitraryLinearEvolutionChain(), ({ chain, speciesIndex, stageCount }) => {
            const speciesName = `species-${speciesIndex}`;
            const expectedFirstStage = speciesIndex === 0;

            return (
              isFirstStageInEvolutionChain(speciesName, chain) === expectedFirstStage &&
              isFirstStageInEvolutionChain(`species-0`, chain) === true &&
              (stageCount === 1 ||
                isFirstStageInEvolutionChain(`species-${stageCount - 1}`, chain) === false)
            );
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен согласованно маппить флаг first-stage API-покемона с корнем цепочки эволюции', () => {
        fc.assert(
          fc.property(arbitraryLinearEvolutionChain(), ({ chain, speciesIndex }) => {
            const speciesName = `species-${speciesIndex}`;
            const detail = detailForSpecies(speciesName, speciesIndex + 1);
            const pokemon = convertPokemonDetailApiDataToTamagotchiPokemon(
              detail,
              evolutionResponseFromChain(chain),
            );

            return pokemon.isFirstStage === (speciesIndex === 0);
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });

    describe('Negative Cases', () => {
      it('должен принимать только покемонов первой стадии и отклонять эволюционировавшие формы', () => {
        fc.assert(
          fc.property(arbitraryLinearEvolutionChain(), ({ chain, speciesIndex }) => {
            const speciesName = `species-${speciesIndex}`;
            const pokemon = convertPokemonDetailApiDataToTamagotchiPokemon(
              detailForSpecies(speciesName, speciesIndex + 1),
              evolutionResponseFromChain(chain),
            );
            const validation = integration.validatePokemonSelection(pokemon);

            if (speciesIndex === 0) {
              return validation.valid === true && validation.pokemon?.isFirstStage === true;
            }

            return validation.valid === false && validation.error === 'evolvedPokemon';
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
