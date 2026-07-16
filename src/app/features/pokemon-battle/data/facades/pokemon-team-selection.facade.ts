import { computed, inject, Service } from '@angular/core';
import type { BattlePokemon } from '../models/battle.model';
import { PokemonBattleStore } from '../store/pokemon-battle.store';
import { DEFAULT_OPPONENT_TEAM } from '../constants/default-opponents';
import { POKEMON_PAGE_LIMIT, TEAM_SIZE } from '../constants/pokemon-battle.constants';

@Service({ autoProvided: false })
export class PokemonTeamSelectionFacade {
  private readonly pokemonBattleStore = inject(PokemonBattleStore);

  public readonly TEAM_SIZE = TEAM_SIZE;

  // Expose store signals
  public readonly pokemonList = this.pokemonBattleStore.pokemonList;
  public readonly selectedTeam = this.pokemonBattleStore.selectedTeam;
  public readonly isLoading = this.pokemonBattleStore.isLoading;
  public readonly error = this.pokemonBattleStore.error;
  public readonly currentPage = this.pokemonBattleStore.currentPage;
  public readonly totalCount = this.pokemonBattleStore.totalCount;
  public readonly limit = this.pokemonBattleStore.limit;

  public readonly selectedIds = computed(() => new Set(this.selectedTeam().map((p) => p.id)));
  public readonly isTeamLimitReached = computed(() => this.selectedTeam().length >= TEAM_SIZE);
  public readonly isTeamComplete = computed(() => this.selectedTeam().length === TEAM_SIZE);
  public readonly hasNextPage = computed(
    () => (this.currentPage() + 1) * this.limit() < this.totalCount(),
  );
  public readonly pageCount = computed(() => Math.ceil(this.totalCount() / this.limit()));

  constructor() {
    if (this.pokemonBattleStore.pokemonList().length === 0) {
      this.pokemonBattleStore.loadPokemonList({ page: 0, limit: POKEMON_PAGE_LIMIT });
    }
  }

  public retry(): void {
    this.pokemonBattleStore.loadPokemonList({
      page: this.currentPage(),
      limit: POKEMON_PAGE_LIMIT,
    });
  }

  public selectPokemon(pokemon: BattlePokemon): void {
    this.pokemonBattleStore.selectPokemonForTeam(pokemon);
  }

  public startBattle(): void {
    const selected = this.pokemonBattleStore.selectedTeam();

    if (selected.length !== TEAM_SIZE) {
      return;
    }

    const available = this.pokemonBattleStore
      .pokemonList()
      .filter((p) => !selected.some((s) => s.id === p.id));

    const opponents: BattlePokemon[] = [];

    if (available.length >= TEAM_SIZE) {
      const shuffled = [...available].sort(() => 0.5 - Math.random());

      opponents.push(shuffled[0], shuffled[1]);
    } else {
      opponents.push(...structuredClone(DEFAULT_OPPONENT_TEAM));
    }

    this.pokemonBattleStore.startBattle(opponents);
  }

  public prevPage(): void {
    const current = this.pokemonBattleStore.currentPage();

    if (current > 0) {
      this.pokemonBattleStore.loadPokemonList({ page: current - 1, limit: POKEMON_PAGE_LIMIT });
    }
  }

  public nextPage(): void {
    const current = this.pokemonBattleStore.currentPage();
    const total = this.pokemonBattleStore.totalCount();
    const limit = this.pokemonBattleStore.limit();

    if ((current + 1) * limit < total) {
      this.pokemonBattleStore.loadPokemonList({ page: current + 1, limit: POKEMON_PAGE_LIMIT });
    }
  }

  public setPage(page: number): void {
    const total = this.pokemonBattleStore.totalCount();
    const limit = this.pokemonBattleStore.limit();

    if (page * limit < total && page >= 0) {
      this.pokemonBattleStore.loadPokemonList({ page, limit: POKEMON_PAGE_LIMIT });
    }
  }
}
