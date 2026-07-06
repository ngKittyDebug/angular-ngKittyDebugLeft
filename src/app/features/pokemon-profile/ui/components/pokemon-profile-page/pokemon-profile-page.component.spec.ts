import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TamagotchiSelectionPokemon } from '@shared/models/tamagotchi-selection.model';
import { TAMAGOTCHI_SELECTION_PORT } from '@shared/constants/tamagotchi-selection.token';
import { PokemonTamagotchiSelectionComponent } from '@shared/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { PokemonProfilePageComponent } from './pokemon-profile-page.component';

const SELECTION_POKEMON: TamagotchiSelectionPokemon = {
  id: '25',
  isFirstStage: true,
  name: 'Pikachu',
  species: 'pikachu',
};

describe('PokemonProfilePageComponent', () => {
  let fixture: ComponentFixture<PokemonProfilePageComponent>;
  let selectionPort: {
    getSelectedPokemonReference: ReturnType<typeof vi.fn>;
    loadPokemonByName: ReturnType<typeof vi.fn>;
    saveSelectedPokemon: ReturnType<typeof vi.fn>;
    validatePokemonSelection: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    selectionPort = {
      getSelectedPokemonReference: vi.fn(() => null),
      loadPokemonByName: vi.fn(() => of(SELECTION_POKEMON)),
      saveSelectedPokemon: vi.fn(),
      validatePokemonSelection: vi.fn((pokemon: TamagotchiSelectionPokemon) => ({
        pokemon,
        valid: true,
      })),
    };

    await TestBed.configureTestingModule({
      imports: [
        PokemonProfilePageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              pokemonProfile: {
                tamagotchiSelection: {
                  alreadySelected: 'Selected for Tamagotchi',
                  evolvedPokemonError: 'Only first-stage Pokémon can join.',
                  loadFailedError: 'Could not prepare this Pokémon.',
                  openTamagotchi: 'Open Tamagotchi',
                  savedMessage: '{{name}} is ready!',
                  selectButton: 'Use in Tamagotchi',
                },
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: PokemonDataService,
          useValue: {
            createPokemonProfileData: () => ({
              profileData: signal({ name: 'Pikachu' }),
              profileDataError: signal(null),
              profileEvolution: signal(null),
              profileEvolutionError: signal(null),
              profileSpecies: signal(null),
              profileSpeciesError: signal(null),
            }),
          },
        },
        {
          provide: TAMAGOTCHI_SELECTION_PORT,
          useValue: selectionPort,
        },
      ],
    })
      .overrideComponent(PokemonProfilePageComponent, {
        set: {
          imports: [PokemonTamagotchiSelectionComponent],
          template: `
            <left-paw-pokemon-tamagotchi-selection
              [feedback]="selectionFeedback()"
              [isCurrentSelection]="isCurrentTamagotchiSelection()"
              [loading]="selectionLoading()"
              pokemonName="Pikachu"
              tamagotchiRoute="/tamagotchi"
              (selectRequested)="onTamagotchiSelectRequested()"
            />
          `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PokemonProfilePageComponent);
    fixture.componentRef.setInput('pokemonEndpoint', 'pikachu');
    fixture.detectChanges();
  });

  it('should mark current tamagotchi selection after save without page reload', () => {
    const component = fixture.componentInstance as PokemonProfilePageComponent & {
      isCurrentTamagotchiSelection: () => boolean;
      onTamagotchiSelectRequested: () => void;
    };

    expect(component.isCurrentTamagotchiSelection()).toBe(false);

    const buttonBefore = fixture.nativeElement.querySelector('button');

    expect(buttonBefore?.disabled).toBe(false);

    component.onTamagotchiSelectRequested();
    fixture.detectChanges();

    expect(selectionPort.saveSelectedPokemon).toHaveBeenCalledTimes(1);
    expect(selectionPort.saveSelectedPokemon).toHaveBeenCalledWith(SELECTION_POKEMON);
    expect(component.isCurrentTamagotchiSelection()).toBe(true);

    const buttonAfter = fixture.nativeElement.querySelector('button');

    expect(buttonAfter?.disabled).toBe(true);
    expect(buttonAfter?.textContent?.trim()).toBe('Selected for Tamagotchi');
  });
});
