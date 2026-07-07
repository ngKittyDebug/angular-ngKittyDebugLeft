import { inject, Service } from '@angular/core';
import type { BattlePokemon } from '../models/battle.model';
import { PokemonBattleStore } from '../store/pokemon-battle.store';
import { CHARMANDER_FIXTURE, IVYSAUR_FIXTURE } from '../fixtures/pokemon.fixture';

@Service({ autoProvided: false })
export class PokemonTeamSelectionFacade {
  private readonly pokemonBattleStore = inject(PokemonBattleStore);

  // Expose store signals
  public readonly pokemonList = this.pokemonBattleStore.pokemonList;
  public readonly selectedTeam = this.pokemonBattleStore.selectedTeam;
  public readonly isLoading = this.pokemonBattleStore.isLoading;
  public readonly error = this.pokemonBattleStore.error;
  public readonly currentPage = this.pokemonBattleStore.currentPage;
  public readonly totalCount = this.pokemonBattleStore.totalCount;
  public readonly limit = this.pokemonBattleStore.limit;

  constructor() {
    this.pokemonBattleStore.loadPokemons({ page: 0, limit: 10 });
  }

  public onSelectPokemon(pokemon: BattlePokemon): void {
    this.pokemonBattleStore.selectPokemonForTeam(pokemon);
  }

  public onStartBattleClick(): void {
    const selected = this.pokemonBattleStore.selectedTeam();

    if (selected.length !== 2) {
      return;
    }

    const available = this.pokemonBattleStore
      .pokemonList()
      .filter((p) => !selected.some((s) => s.id === p.id));

    const opponents: BattlePokemon[] = [];

    if (available.length >= 2) {
      const shuffled = [...available].sort(() => 0.5 - Math.random());

      opponents.push(shuffled[0], shuffled[1]);
    } else {
      opponents.push(structuredClone(CHARMANDER_FIXTURE), structuredClone(IVYSAUR_FIXTURE));
    }

    this.pokemonBattleStore.startBattle(opponents);
  }

  public onPrevPage(): void {
    const current = this.pokemonBattleStore.currentPage();

    if (current > 0) {
      this.pokemonBattleStore.loadPokemons({ page: current - 1, limit: 10 });
    }
  }

  public onNextPage(): void {
    const current = this.pokemonBattleStore.currentPage();
    const total = this.pokemonBattleStore.totalCount();
    const limit = this.pokemonBattleStore.limit();

    if ((current + 1) * limit < total) {
      this.pokemonBattleStore.loadPokemons({ page: current + 1, limit: 10 });
    }
  }
}
