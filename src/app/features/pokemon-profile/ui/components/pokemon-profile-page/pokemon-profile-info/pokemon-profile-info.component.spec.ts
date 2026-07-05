import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, type MockedObject } from 'vitest';
import {
  createProfileFacadeMock,
  type ProfileFacadeMock,
} from '@features/pokemon-profile/data/mocks/profile-facade.mock';
import { PIKACHU_SELECTION_FIXTURE } from '@features/pokemon-profile/data/fixtures/tamagotchi-selection.fixture';
import { createTamagotchiSelectionPortMock } from '@features/pokemon-profile/data/mocks/tamagotchi-selection-port.mock';
import { ProfileFacade } from '@features/profile/data/facades/profile.facade';
import {
  TAMAGOTCHI_SELECTION_PORT,
  type TamagotchiSelectionPort,
} from '@shared/constants/tamagotchi-selection.token';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { PokemonTamagotchiSelectionComponent } from '@shared/ui/components/pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';
import { PokemonProfileInfoComponent } from './pokemon-profile-info.component';

const POKEMON_PROFILE_TRANSLATIONS = {
  favorites: 'Add to favorites',
  removeFromFavorites: 'Remove from favorites',
  tamagotchiSelection: {
    alreadySelected: 'Selected for Tamagotchi',
    evolvedPokemonError: 'Only first-stage Pokémon can join.',
    loadFailedError: 'Could not prepare this Pokémon.',
    openTamagotchi: 'Open Tamagotchi',
    savedMessage: '{{name}} is ready!',
    selectButton: 'Use in Tamagotchi',
  },
};

describe('PokemonProfileInfoComponent', () => {
  describe('Happy Path', () => {
    describe('Покемон ещё не выбран для тамагочи', () => {
      let fixture: ComponentFixture<PokemonProfileInfoComponent>;
      let selectionPortMock: MockedObject<Partial<TamagotchiSelectionPort>>;

      beforeEach(async () => {
        selectionPortMock = createTamagotchiSelectionPortMock();

        await TestBed.configureTestingModule({
          imports: [
            PokemonProfileInfoComponent,
            TranslocoTestingModule.forRoot({
              langs: { en: { pokemonProfile: POKEMON_PROFILE_TRANSLATIONS } },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
            }),
          ],
          providers: [
            provideRouter([]),
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: selectionPortMock },
            { provide: ProfileFacade, useValue: createProfileFacadeMock() },
          ],
        })
          .overrideComponent(PokemonProfileInfoComponent, {
            set: {
              imports: [PokemonTamagotchiSelectionComponent],
              template: `
                <left-paw-pokemon-tamagotchi-selection
                  [feedback]="selectionFeedback()"
                  [isCurrentSelection]="isCurrentTamagotchiSelection()"
                  [loading]="isSelectionLoading()"
                  pokemonName="Pikachu"
                  tamagotchiRoute="/tamagotchi"
                  (selectRequested)="onTamagotchiSelectRequested()"
                />
              `,
            },
          })
          .compileComponents();

        fixture = TestBed.createComponent(PokemonProfileInfoComponent);
        fixture.componentRef.setInput('pokemonProfileData', {
          name: PIKACHU_SELECTION_FIXTURE.name,
        } as PokemonDetailApiData);
        fixture.detectChanges();
      });

      it('должен показать активную кнопку выбора', () => {
        const button = fixture.nativeElement.querySelector('.tamagotchi-selection__button');

        expect(button?.disabled).toBe(false);
      });

      it('должен показать текст кнопки выбора', () => {
        const button = fixture.nativeElement.querySelector('.tamagotchi-selection__button');

        expect(button?.textContent?.trim()).toBe('Use in Tamagotchi');
      });
    });

    describe('После выбора покемона для тамагочи', () => {
      let fixture: ComponentFixture<PokemonProfileInfoComponent>;
      let selectionPortMock: MockedObject<Partial<TamagotchiSelectionPort>>;

      beforeEach(async () => {
        selectionPortMock = createTamagotchiSelectionPortMock();

        await TestBed.configureTestingModule({
          imports: [
            PokemonProfileInfoComponent,
            TranslocoTestingModule.forRoot({
              langs: { en: { pokemonProfile: POKEMON_PROFILE_TRANSLATIONS } },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
            }),
          ],
          providers: [
            provideRouter([]),
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: selectionPortMock },
            { provide: ProfileFacade, useValue: createProfileFacadeMock() },
          ],
        })
          .overrideComponent(PokemonProfileInfoComponent, {
            set: {
              imports: [PokemonTamagotchiSelectionComponent],
              template: `
                <left-paw-pokemon-tamagotchi-selection
                  [feedback]="selectionFeedback()"
                  [isCurrentSelection]="isCurrentTamagotchiSelection()"
                  [loading]="isSelectionLoading()"
                  pokemonName="Pikachu"
                  tamagotchiRoute="/tamagotchi"
                  (selectRequested)="onTamagotchiSelectRequested()"
                />
              `,
            },
          })
          .compileComponents();

        fixture = TestBed.createComponent(PokemonProfileInfoComponent);
        fixture.componentRef.setInput('pokemonProfileData', {
          name: PIKACHU_SELECTION_FIXTURE.name,
        } as PokemonDetailApiData);
        fixture.detectChanges();

        const selectButton = fixture.nativeElement.querySelector(
          '.tamagotchi-selection__button',
        ) as HTMLButtonElement;

        selectButton.click();
        fixture.detectChanges();
      });

      it('должен сохранить покемона через selection port', () => {
        expect(selectionPortMock.saveSelectedPokemon).toHaveBeenCalledTimes(1);
        expect(selectionPortMock.saveSelectedPokemon).toHaveBeenNthCalledWith(
          1,
          PIKACHU_SELECTION_FIXTURE,
        );
      });

      it('должен заблокировать кнопку выбора после сохранения', () => {
        const button = fixture.nativeElement.querySelector('.tamagotchi-selection__button');

        expect(button?.disabled).toBe(true);
      });

      it('должен показать текст уже выбранного покемона', () => {
        const button = fixture.nativeElement.querySelector('.tamagotchi-selection__button');

        expect(button?.textContent?.trim()).toBe('Selected for Tamagotchi');
      });
    });

    describe('Избранное', () => {
      let fixture: ComponentFixture<PokemonProfileInfoComponent>;
      let profileFacadeMock: ProfileFacadeMock;

      beforeEach(async () => {
        profileFacadeMock = createProfileFacadeMock();

        await TestBed.configureTestingModule({
          imports: [
            PokemonProfileInfoComponent,
            TranslocoTestingModule.forRoot({
              langs: { en: { pokemonProfile: POKEMON_PROFILE_TRANSLATIONS } },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
            }),
          ],
          providers: [
            provideRouter([]),
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: createTamagotchiSelectionPortMock() },
            { provide: ProfileFacade, useValue: profileFacadeMock },
          ],
        })
          .overrideComponent(PokemonProfileInfoComponent, {
            set: {
              template: `
                <button
                  class="pokemon__info_button"
                  type="button"
                  (click)="onFavoriteClick()"
                >
                  {{ isFavorite() ? 'Remove from favorites' : 'Add to favorites' }}
                </button>
              `,
            },
          })
          .compileComponents();

        fixture = TestBed.createComponent(PokemonProfileInfoComponent);
        fixture.componentRef.setInput('pokemonProfileData', {
          name: PIKACHU_SELECTION_FIXTURE.name,
        } as PokemonDetailApiData);
        fixture.detectChanges();
      });

      it('должен загрузить избранное при инициализации', () => {
        expect(profileFacadeMock.loadFavorites).toHaveBeenCalledTimes(1);
      });

      it('должен показать текст добавления в избранное', () => {
        const button = fixture.nativeElement.querySelector('.pokemon__info_button');

        expect(button?.textContent?.trim()).toBe('Add to favorites');
      });

      it('должен переключить избранное по клику', () => {
        const button = fixture.nativeElement.querySelector(
          '.pokemon__info_button',
        ) as HTMLButtonElement;

        button.click();

        expect(profileFacadeMock.toggleFavorite).toHaveBeenCalledTimes(1);
        expect(profileFacadeMock.toggleFavorite).toHaveBeenNthCalledWith(
          1,
          PIKACHU_SELECTION_FIXTURE.name,
        );
      });

      it('должен показать текст удаления из избранного', () => {
        profileFacadeMock.favoritePokemonList.set([PIKACHU_SELECTION_FIXTURE.name]);
        fixture.detectChanges();

        const button = fixture.nativeElement.querySelector('.pokemon__info_button');

        expect(button?.textContent?.trim()).toBe('Remove from favorites');
      });
    });
  });
});
