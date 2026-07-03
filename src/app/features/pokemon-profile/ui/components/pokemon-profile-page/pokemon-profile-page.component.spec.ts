import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_POKEMON } from '@features/pokemon-tamagotchi/data/fixtures/tamagotchi-arbitraries';
import { PokemonProfileIntegrationService } from '@features/pokemon-tamagotchi/data/services/pokemon-profile-integration.service';
import { PokemonTamagotchiSelectionComponent } from '@shared/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';
import { PokemonDataService } from '@shared/services/pokemon-data.service';
import { PokemonProfilePageComponent } from './pokemon-profile-page.component';

describe('PokemonProfilePageComponent', () => {
  let fixture: ComponentFixture<PokemonProfilePageComponent>;
  let integration: {
    getSelectedPokemonReference: ReturnType<typeof vi.fn>;
    loadPokemonByName: ReturnType<typeof vi.fn>;
    saveSelectedPokemon: ReturnType<typeof vi.fn>;
    validatePokemonSelection: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    integration = {
      getSelectedPokemonReference: vi.fn(() => null),
      loadPokemonByName: vi.fn(() => of(TEST_POKEMON)),
      saveSelectedPokemon: vi.fn(),
      validatePokemonSelection: vi.fn((pokemon: typeof TEST_POKEMON) => ({
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
          provide: PokemonProfileIntegrationService,
          useValue: integration,
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

    expect(integration.saveSelectedPokemon).toHaveBeenCalledTimes(1);
    expect(integration.saveSelectedPokemon).toHaveBeenCalledWith(TEST_POKEMON);
    expect(component.isCurrentTamagotchiSelection()).toBe(true);

    const buttonAfter = fixture.nativeElement.querySelector('button');

    expect(buttonAfter?.disabled).toBe(true);
    expect(buttonAfter?.textContent?.trim()).toBe('Selected for Tamagotchi');
  });
});
