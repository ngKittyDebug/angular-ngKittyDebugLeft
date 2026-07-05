import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { throwError } from 'rxjs';
import { AppNotificationService } from '@core/services/app-notification.service';
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

const FAVORITES_TRANSLATIONS = {
  favorites: 'Add to favorites',
  removeFromFavorites: 'Remove from favorites',
};

const TAMAGOTCHI_SELECTION_UI_TRANSLATIONS = {
  alreadySelected: 'Selected for Tamagotchi',
  openTamagotchi: 'Open Tamagotchi',
  selectButton: 'Use in Tamagotchi',
};

const TAMAGOTCHI_SELECTION_NOTIFICATION_TRANSLATIONS = {
  evolvedPokemonError: 'Only first-stage Pokémon can join.',
  loadFailedError: 'Could not prepare this Pokémon.',
  savedMessage: '{{name}} is ready!',
};

const TAMAGOTCHI_SELECTION_TEMPLATE = `
  <left-paw-pokemon-tamagotchi-selection
    [isCurrentSelection]="isCurrentTamagotchiSelection()"
    [loading]="isSelectionLoading()"
    tamagotchiRoute="/tamagotchi"
    (selectRequested)="onTamagotchiSelectRequested()"
  />
`;

function createAppNotificationServiceMock(): MockedObject<
  Pick<AppNotificationService, 'showErrorNotification' | 'showPositiveNotification'>
> {
  return {
    showErrorNotification: vi.fn(),
    showPositiveNotification: vi.fn(),
  };
}

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
              langs: {
                en: {
                  pokemonProfile: {
                    tamagotchiSelection: TAMAGOTCHI_SELECTION_UI_TRANSLATIONS,
                  },
                },
              },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
            }),
          ],
          providers: [
            provideRouter([]),
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: selectionPortMock },
            { provide: ProfileFacade, useValue: createProfileFacadeMock() },
            { provide: AppNotificationService, useValue: createAppNotificationServiceMock() },
          ],
        })
          .overrideComponent(PokemonProfileInfoComponent, {
            set: {
              imports: [PokemonTamagotchiSelectionComponent],
              template: TAMAGOTCHI_SELECTION_TEMPLATE,
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
      let appNotifications: MockedObject<
        Pick<AppNotificationService, 'showErrorNotification' | 'showPositiveNotification'>
      >;

      beforeEach(async () => {
        selectionPortMock = createTamagotchiSelectionPortMock();
        appNotifications = createAppNotificationServiceMock();

        await TestBed.configureTestingModule({
          imports: [
            PokemonProfileInfoComponent,
            TranslocoTestingModule.forRoot({
              langs: {
                en: {
                  pokemonProfile: {
                    tamagotchiSelection: {
                      ...TAMAGOTCHI_SELECTION_UI_TRANSLATIONS,
                      ...TAMAGOTCHI_SELECTION_NOTIFICATION_TRANSLATIONS,
                    },
                  },
                },
              },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
            }),
          ],
          providers: [
            provideRouter([]),
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: selectionPortMock },
            { provide: ProfileFacade, useValue: createProfileFacadeMock() },
            { provide: AppNotificationService, useValue: appNotifications },
          ],
        })
          .overrideComponent(PokemonProfileInfoComponent, {
            set: {
              imports: [PokemonTamagotchiSelectionComponent],
              template: TAMAGOTCHI_SELECTION_TEMPLATE,
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

      it('должен показать positive toast после сохранения', () => {
        expect(appNotifications.showPositiveNotification).toHaveBeenCalledTimes(1);
        expect(appNotifications.showPositiveNotification).toHaveBeenNthCalledWith(
          1,
          'Pikachu is ready!',
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
              langs: { en: { pokemonProfile: FAVORITES_TRANSLATIONS } },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
            }),
          ],
          providers: [
            provideRouter([]),
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: createTamagotchiSelectionPortMock() },
            { provide: ProfileFacade, useValue: profileFacadeMock },
            { provide: AppNotificationService, useValue: createAppNotificationServiceMock() },
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

  describe('Edge Cases', () => {
    describe('Ошибки выбора тамагочи', () => {
      let fixture: ComponentFixture<PokemonProfileInfoComponent>;
      let selectionPortMock: MockedObject<Partial<TamagotchiSelectionPort>>;
      let appNotifications: MockedObject<
        Pick<AppNotificationService, 'showErrorNotification' | 'showPositiveNotification'>
      >;

      beforeEach(async () => {
        selectionPortMock = createTamagotchiSelectionPortMock();
        appNotifications = createAppNotificationServiceMock();

        await TestBed.configureTestingModule({
          imports: [
            PokemonProfileInfoComponent,
            TranslocoTestingModule.forRoot({
              langs: {
                en: {
                  pokemonProfile: {
                    tamagotchiSelection: {
                      ...TAMAGOTCHI_SELECTION_UI_TRANSLATIONS,
                      ...TAMAGOTCHI_SELECTION_NOTIFICATION_TRANSLATIONS,
                    },
                  },
                },
              },
              translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
            }),
          ],
          providers: [
            provideRouter([]),
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: selectionPortMock },
            { provide: ProfileFacade, useValue: createProfileFacadeMock() },
            { provide: AppNotificationService, useValue: appNotifications },
          ],
        })
          .overrideComponent(PokemonProfileInfoComponent, {
            set: {
              imports: [PokemonTamagotchiSelectionComponent],
              template: TAMAGOTCHI_SELECTION_TEMPLATE,
            },
          })
          .compileComponents();

        fixture = TestBed.createComponent(PokemonProfileInfoComponent);
        fixture.componentRef.setInput('pokemonProfileData', {
          name: PIKACHU_SELECTION_FIXTURE.name,
        } as PokemonDetailApiData);
        fixture.detectChanges();
      });

      it('должен показать error toast при evolvedPokemon', () => {
        selectionPortMock.validatePokemonSelection = vi.fn(() => ({
          error: 'evolvedPokemon' as const,
          valid: false as const,
        }));

        const selectButton = fixture.nativeElement.querySelector(
          '.tamagotchi-selection__button',
        ) as HTMLButtonElement;

        selectButton.click();
        fixture.detectChanges();

        expect(appNotifications.showErrorNotification).toHaveBeenCalledTimes(1);
        expect(appNotifications.showErrorNotification).toHaveBeenNthCalledWith(
          1,
          'Only first-stage Pokémon can join.',
        );
      });

      it('должен показать error toast при loadFailed', () => {
        selectionPortMock.loadPokemonByName = vi.fn(() => throwError(() => new Error('network')));

        const selectButton = fixture.nativeElement.querySelector(
          '.tamagotchi-selection__button',
        ) as HTMLButtonElement;

        selectButton.click();
        fixture.detectChanges();

        expect(appNotifications.showErrorNotification).toHaveBeenCalledTimes(1);
        expect(appNotifications.showErrorNotification).toHaveBeenNthCalledWith(
          1,
          'Could not prepare this Pokémon.',
        );
      });
    });
  });
});
