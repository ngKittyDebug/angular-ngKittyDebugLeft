import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProfileFacadeMock,
  type ProfileFacadeMock,
} from '@features/pokemon-profile/data/mocks/profile-facade.mock';
import { PIKACHU_SELECTION_FIXTURE } from '@features/pokemon-profile/data/fixtures/tamagotchi-selection.fixture';
import {
  createTamagotchiSelectionFacadeMock,
  type TamagotchiSelectionFacadeMock,
} from '@features/pokemon-profile/data/mocks/tamagotchi-selection-facade.mock';
import { TamagotchiSelectionFacade } from '@features/pokemon-profile/data/facades/tamagotchi-selection.facade';
import { ProfileFacade } from '@features/profile/data/facades/profile.facade';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import { PokemonTamagotchiSelectionComponent } from '../pokemon-tamagotchi-selection/pokemon-tamagotchi-selection.component';
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

const TAMAGOTCHI_SELECTION_TEMPLATE = `
  <left-paw-pokemon-tamagotchi-selection
    [isCurrentSelection]="isCurrentTamagotchiSelection()"
    [loading]="selectionFacade.isSelectionLoading()"
    [tamagotchiRoute]="tamagotchiRoute"
    (selectRequested)="onTamagotchiSelectRequested()"
  />
`;

describe('PokemonProfileInfoComponent', () => {
  describe('Happy Path', () => {
    describe('Покемон ещё не выбран для тамагочи', () => {
      let fixture: ComponentFixture<PokemonProfileInfoComponent>;
      let selectionFacadeMock: TamagotchiSelectionFacadeMock;

      beforeEach(async () => {
        selectionFacadeMock = createTamagotchiSelectionFacadeMock();

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
            { provide: TamagotchiSelectionFacade, useValue: selectionFacadeMock },
            { provide: ProfileFacade, useValue: createProfileFacadeMock() },
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

      it('должен делегировать выбор в selection facade', () => {
        const selectButton = fixture.nativeElement.querySelector(
          '.tamagotchi-selection__button',
        ) as HTMLButtonElement;

        selectButton.click();

        expect(selectionFacadeMock.selectForTamagotchi).toHaveBeenCalledTimes(1);
        expect(selectionFacadeMock.selectForTamagotchi).toHaveBeenNthCalledWith(
          1,
          PIKACHU_SELECTION_FIXTURE.name,
        );
      });
    });

    describe('Покемон уже выбран для тамагочи', () => {
      let fixture: ComponentFixture<PokemonProfileInfoComponent>;

      beforeEach(async () => {
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
            {
              provide: TamagotchiSelectionFacade,
              useValue: createTamagotchiSelectionFacadeMock({
                selectedName: PIKACHU_SELECTION_FIXTURE.name,
              }),
            },
            { provide: ProfileFacade, useValue: createProfileFacadeMock() },
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

      it('должен заблокировать кнопку выбора', () => {
        const button = fixture.nativeElement.querySelector('.tamagotchi-selection__button');

        expect(button?.disabled).toBe(true);
      });

      it('должен показать текст уже выбранного покемона', () => {
        const button = fixture.nativeElement.querySelector('.tamagotchi-selection__button');

        expect(button?.textContent?.trim()).toBe('Selected for Tamagotchi');
      });

      it('должен вести к актуальному маршруту тамагочи', () => {
        const link = fixture.nativeElement.querySelector('a');

        expect(link?.getAttribute('href')).toBe('/games/tamagotchi');
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
            {
              provide: TamagotchiSelectionFacade,
              useValue: createTamagotchiSelectionFacadeMock(),
            },
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
