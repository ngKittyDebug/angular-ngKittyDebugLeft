import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import { catchError, finalize, map, of } from 'rxjs';
import { convertEvolutionChainToNodeModel } from '@features/pokemon-profile/data/helpers/convert-evolution-chain';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { EvolutionChainItemComponent } from './evolution-chain-item/evolution-chain-item.component';
import { PokemonProfileInfoComponent } from './pokemon-profile-info/pokemon-profile-info.component';
import { PokemonProfileStatsComponent } from './pokemon-profile-stats/pokemon-profile-stats.component';
import { PokemonProfileSpeciesBreedingComponent } from './pokemon-profile-species-breeding/pokemon-profile-species-breeding.component';
import { GAMES_PATH } from '@features/games/games.routes';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';
import type { TamagotchiSelectionFeedback } from '@shared/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';

@Component({
  selector: 'left-paw-pokemon-profile-page',
  imports: [
    EvolutionChainItemComponent,
    PokemonProfileInfoComponent,
    PokemonProfileSpeciesBreedingComponent,
    PokemonProfileStatsComponent,
    TranslocoDirective,
    TuiCard,
    TuiProgress,
  ],
  templateUrl: './pokemon-profile-page.component.html',
  styleUrl: './pokemon-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfilePageComponent {
  private readonly profileService = inject(PokemonDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectionPort = inject(TAMAGOTCHI_SELECTION_PORT);
  public readonly pokemonEndpoint = input.required<string>();

  protected readonly pokemonProfile = this.profileService.createPokemonProfileData(() =>
    this.pokemonEndpoint().toLowerCase(),
  );

  protected readonly pokemonEvolutionChain = computed(() => {
    const data = this.pokemonProfile.profileEvolution()?.chain;

    return data ? convertEvolutionChainToNodeModel(data) : null;
  });

  protected readonly tamagotchiRoute = `/${GAMES_PATH}/${TAMAGOTCHI_PATH}`;
  protected readonly selectionFeedback = signal<TamagotchiSelectionFeedback>(null);
  protected readonly selectionLoading = signal(false);
  protected readonly selectedPokemonName = signal<string | null>(
    this.selectionPort.getSelectedPokemonReference()?.name ?? null,
  );

  protected readonly isCurrentTamagotchiSelection = computed(() => {
    const selected = this.selectedPokemonName();
    const currentName = this.pokemonProfile.profileData()?.name;

    if (!selected || !currentName) {
      return false;
    }

    return selected.toLowerCase() === currentName.toLowerCase();
  });

  protected onTamagotchiSelectRequested(): void {
    const pokemonName = this.pokemonProfile.profileData()?.name;

    if (!pokemonName || this.selectionLoading()) {
      return;
    }

    this.selectionLoading.set(true);
    this.selectionFeedback.set(null);

    this.selectionPort
      .loadPokemonByName(pokemonName)
      .pipe(
        map((pokemon) => this.selectionPort.validatePokemonSelection(pokemon)),
        catchError(() => of({ error: 'loadFailed' as const, valid: false as const })),
        finalize(() => this.selectionLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((validation) => {
        if (validation.valid && validation.pokemon) {
          this.selectionPort.saveSelectedPokemon(validation.pokemon);
          this.selectedPokemonName.set(validation.pokemon.name);
          this.selectionFeedback.set('saved');

          return;
        }

        this.selectionFeedback.set(
          validation.error === 'evolvedPokemon' ? 'evolvedPokemon' : 'loadFailed',
        );
      });
  }
}

/* 

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiProgress } from '@taiga-ui/kit';
import { TuiCard } from '@taiga-ui/layout';
import { catchError, finalize, map, of } from 'rxjs';
import { convertEvolutionChainToNodeModel } from '@features/pokemon-profile/data/helpers/convert-evolution-chain';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { EvolutionChainItemComponent } from './evolution-chain-item/evolution-chain-item.component';
import { PokemonProfileInfoComponent } from './pokemon-profile-info/pokemon-profile-info.component';
import { PokemonProfileStatsComponent } from './pokemon-profile-stats/pokemon-profile-stats.component';
import { PokemonProfileSpeciesBreedingComponent } from './pokemon-profile-species-breeding/pokemon-profile-species-breeding.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { convertEvolutionChainToNodeModel } from '@features/pokemon-profile/data/helpers/convert-evolution-chain';
import { TAMAGOTCHI_PATH } from '@shared/constants/tamagotchi-routes';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';
import {
  PokemonTamagotchiSelectionComponent,
  type TamagotchiSelectionFeedback,
} from '@shared/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';

@Component({
  selector: 'left-paw-pokemon-profile-page',
  imports: [
    PokemonTamagotchiSelectionComponent,
    TuiProgress,
    TuiCard,
    EvolutionChainItemComponent,
    PokemonProfileInfoComponent,
    PokemonProfileStatsComponent,
    PokemonProfileSpeciesBreedingComponent,
    PokemonProfileStatsComponent,
    TranslocoDirective,
    TuiCard,
    TuiProgress,
  ],
  templateUrl: './pokemon-profile-page.component.html',
  styleUrl: './pokemon-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonProfilePageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectionPort = inject(TAMAGOTCHI_SELECTION_PORT);
  private readonly profileService = inject(PokemonDataService);

  public readonly pokemonEndpoint = input.required<string>();

    return data ? convertEvolutionChainToNodeModel(data) : null;
  });

  protected readonly tamagotchiRoute = `/${TAMAGOTCHI_PATH}`;
  protected readonly selectionFeedback = signal<TamagotchiSelectionFeedback>(null);
  protected readonly selectionLoading = signal(false);
  protected readonly selectedPokemonName = signal<string | null>(
    this.selectionPort.getSelectedPokemonReference()?.name ?? null,
  );

  protected readonly isCurrentTamagotchiSelection = computed(() => {
    const selected = this.selectedPokemonName();
    const currentName = this.pokemonProfile.profileData()?.name;

    if (!selected || !currentName) {
      return false;
    }

    return selected.toLowerCase() === currentName.toLowerCase();
  });

  protected onTamagotchiSelectRequested(): void {
    const pokemonName = this.pokemonProfile.profileData()?.name;

    if (!pokemonName || this.selectionLoading()) {
      return;
    }

    this.selectionLoading.set(true);
    this.selectionFeedback.set(null);

    this.selectionPort
      .loadPokemonByName(pokemonName)
      .pipe(
        map((pokemon) => this.selectionPort.validatePokemonSelection(pokemon)),
        catchError(() => of({ error: 'loadFailed' as const, valid: false as const })),
        finalize(() => this.selectionLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((validation) => {
        if (validation.valid && validation.pokemon) {
          this.selectionPort.saveSelectedPokemon(validation.pokemon);
          this.selectedPokemonName.set(validation.pokemon.name);
          this.selectionFeedback.set('saved');

          return;
        }

        this.selectionFeedback.set(
          validation.error === 'evolvedPokemon' ? 'evolvedPokemon' : 'loadFailed',
        );
      });
  }
}





*/
