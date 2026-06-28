import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { PokemonBattleApiService } from './pokemon-battle-api.service';
import { mapToBattlePokemon } from './pokemon-mapper';
import type { BattlePokemon } from '@game/pokemon-battle/types';

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
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, api = inject(PokemonBattleApiService)) => ({
    loadPokemons: rxMethod<{ page: number; limit: number }>(
      pipe(
        tap(({ page, limit }) =>
          patchState(store, { isLoading: true, error: null, currentPage: page, limit }),
        ),
        switchMap(({ page, limit }) => {
          const offset = page * limit;

          return api.getPokemonList(limit, offset).pipe(
            tap((data) => {
              const mapped = data.results.map((raw) => mapToBattlePokemon(raw));

              patchState(store, {
                pokemonList: mapped,
                totalCount: data.total,
                isLoading: false,
              });
            }),
            catchError((error: unknown) => {
              const errorMessage =
                error instanceof Error ? error.message : 'Failed to load pokemons';

              patchState(store, {
                error: errorMessage,
                isLoading: false,
              });

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

    endBattle(): void {
      patchState(store, {
        battleStarted: false,
      });
    },
  })),
);
