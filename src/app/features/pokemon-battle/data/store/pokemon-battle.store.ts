import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { PokemonBattleApiService } from '../api/pokemon/services/pokemon-battle-api.service';
import { convertPokemonDetailApiDataToBattlePokemon } from '../api/pokemon/helpers/pokemon-converter';
import type { BattlePokemon } from '../models/battle.model';

export interface PokemonBattleStoreState {
  pokemonList: BattlePokemon[];
  totalCount: number;
  currentPage: number;
  limit: number;
  isLoading: boolean;
  error: string | null;
  selectedTeam: BattlePokemon[];
  opponentTeam: BattlePokemon[];
  battleStarted: boolean;
}

const initialState: PokemonBattleStoreState = {
  pokemonList: [],
  totalCount: 0,
  currentPage: 0,
  limit: 10,
  isLoading: false,
  error: null,
  selectedTeam: [],
  opponentTeam: [],
  battleStarted: false,
};

export const PokemonBattleStore = signalStore(
  withState(initialState),
  withMethods((store, api = inject(PokemonBattleApiService)) => ({
    loadPokemonList: rxMethod<{ page: number; limit: number }>(
      pipe(
        tap(({ page, limit }) =>
          patchState(store, { isLoading: true, error: null, currentPage: page, limit }),
        ),
        switchMap(({ page, limit }) => {
          const offset = page * limit;

          return api.getPokemonList(limit, offset).pipe(
            tap((data) => {
              const mapped = data.pokemonList.map((raw) =>
                convertPokemonDetailApiDataToBattlePokemon(raw),
              );

              patchState(store, {
                pokemonList: mapped,
                totalCount: data.totalCount,
                isLoading: false,
              });
            }),
            catchError((error: unknown) => {
              patchState(store, {
                error: 'loadFailed',
                isLoading: false,
              });

              if (error instanceof Error) {
                console.error(error.message);
              }

              return EMPTY;
            }),
          );
        }),
      ),
    ),

    selectPokemonForTeam(pokemon: BattlePokemon): void {
      const currentTeam = store.selectedTeam();

      if (currentTeam.some((p) => p.id === pokemon.id)) {
        // Already selected, unselect it
        patchState(store, {
          selectedTeam: currentTeam.filter((p) => p.id !== pokemon.id),
        });
      } else if (currentTeam.length < 2) {
        // Select it
        patchState(store, {
          selectedTeam: [...currentTeam, pokemon],
        });
      }
    },

    clearSelectedTeam(): void {
      patchState(store, {
        selectedTeam: [],
        opponentTeam: [],
        battleStarted: false,
      });
    },

    startBattle(opponents: BattlePokemon[]): void {
      patchState(store, {
        opponentTeam: opponents,
        battleStarted: true,
      });
    },
  })),
);
