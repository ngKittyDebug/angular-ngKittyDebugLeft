import * as fc from 'fast-check';
import type { EvolutionChainApiResponse } from '@shared/models/pokemon-evolution-chain-api-data-interface';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import {
  convertPokemonDetailApiDataToTamagotchiPokemon,
  isFirstStageInEvolutionChain,
} from '../api/pokemon/helpers/pokemon-tamagotchi-converter';
import { createPokemonDetailFixture } from '../fixtures/pokemon-detail.fixture';
import { arbitraryLinearEvolutionChain } from '../fixtures/tamagotchi-arbitraries';
import { validateTamagotchiPokemonSelection } from './validate-tamagotchi-pokemon-selection.helper';

const PROPERTY_RUNS = 100;

function detailForSpecies(speciesName: string, id: number): PokemonDetailApiData {
  return createPokemonDetailFixture({ id, name: speciesName });
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

describe('validate-tamagotchi-pokemon-selection.helper', () => {
  describe('Property 5: валидация покемона первой стадии', () => {
    // Feature: pokemon-tamagotchi, Property 5: First-Stage PokemonModel Validation
    describe('Happy Path', () => {
      it('должен классифицировать только первый non-baby вид primary-пути как первую стадию', () => {
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

      it('должен согласованно маппить флаг first-stage с первым non-baby в цепочке', () => {
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
            const validation = validateTamagotchiPokemonSelection(pokemon);

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
