import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { beforeEach, describe, expect, it, type MockedObject, vi } from 'vitest';
import { throwError } from 'rxjs';
import { AppNotificationService } from '@core/services/app-notification.service';
import { PIKACHU_SELECTION_FIXTURE } from '@features/pokemon-profile/data/fixtures/tamagotchi-selection.fixture';
import { createTamagotchiSelectionPortMock } from '@features/pokemon-profile/data/mocks/tamagotchi-selection-port.mock';
import { TamagotchiSelectionFacade } from '@features/pokemon-profile/data/facades/tamagotchi-selection.facade';
import {
  TAMAGOTCHI_SELECTION_PORT,
  type TamagotchiSelectionPort,
} from '@shared/constants/tamagotchi-selection.token';

function createTranslocoServiceMock(): Pick<TranslocoService, 'translate'> {
  return {
    translate: vi.fn((key: string, parameters?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'pokemonProfile.tamagotchiSelection.savedMessage': '{{name}} is ready!',
        'pokemonProfile.tamagotchiSelection.evolvedPokemonError':
          'Only first-stage Pokémon can join.',
        'pokemonProfile.tamagotchiSelection.loadFailedError': 'Could not prepare this Pokémon.',
      };
      const template = translations[key] ?? key;

      if (!parameters?.['name']) {
        return template;
      }

      return template.replace('{{name}}', parameters['name']);
    }) as TranslocoService['translate'],
  };
}

function createAppNotificationServiceMock(): MockedObject<
  Pick<AppNotificationService, 'showErrorNotification' | 'showPositiveNotification'>
> {
  return {
    showErrorNotification: vi.fn(),
    showPositiveNotification: vi.fn(),
  };
}

describe('TamagotchiSelectionFacade', () => {
  describe('Happy Path', () => {
    describe('Успешный выбор покемона', () => {
      let facade: TamagotchiSelectionFacade;
      let selectionPortMock: MockedObject<Partial<TamagotchiSelectionPort>>;
      let appNotifications: MockedObject<
        Pick<AppNotificationService, 'showErrorNotification' | 'showPositiveNotification'>
      >;

      beforeEach(() => {
        selectionPortMock = createTamagotchiSelectionPortMock();
        appNotifications = createAppNotificationServiceMock();

        TestBed.configureTestingModule({
          providers: [
            TamagotchiSelectionFacade,
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: selectionPortMock },
            { provide: AppNotificationService, useValue: appNotifications },
            { provide: TranslocoService, useValue: createTranslocoServiceMock() },
          ],
        });

        facade = TestBed.inject(TamagotchiSelectionFacade);
      });

      it('должен сохранить покемона через selection port', () => {
        facade.selectForTamagotchi(PIKACHU_SELECTION_FIXTURE.name);

        expect(selectionPortMock.saveSelectedPokemon).toHaveBeenCalledTimes(1);
        expect(selectionPortMock.saveSelectedPokemon).toHaveBeenNthCalledWith(
          1,
          PIKACHU_SELECTION_FIXTURE,
        );
      });

      it('должен показать positive toast после сохранения', () => {
        facade.selectForTamagotchi(PIKACHU_SELECTION_FIXTURE.name);

        expect(appNotifications.showPositiveNotification).toHaveBeenCalledTimes(1);
        expect(appNotifications.showPositiveNotification).toHaveBeenNthCalledWith(
          1,
          'Pikachu is ready!',
        );
      });

      it('должен обновить selectedPokemonName после сохранения', () => {
        facade.selectForTamagotchi(PIKACHU_SELECTION_FIXTURE.name);

        expect(facade.selectedPokemonName()).toBe(PIKACHU_SELECTION_FIXTURE.name);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Ошибки выбора тамагочи', () => {
      let facade: TamagotchiSelectionFacade;
      let selectionPortMock: MockedObject<Partial<TamagotchiSelectionPort>>;
      let appNotifications: MockedObject<
        Pick<AppNotificationService, 'showErrorNotification' | 'showPositiveNotification'>
      >;

      beforeEach(() => {
        selectionPortMock = createTamagotchiSelectionPortMock();
        appNotifications = createAppNotificationServiceMock();

        TestBed.configureTestingModule({
          providers: [
            TamagotchiSelectionFacade,
            { provide: TAMAGOTCHI_SELECTION_PORT, useValue: selectionPortMock },
            { provide: AppNotificationService, useValue: appNotifications },
            { provide: TranslocoService, useValue: createTranslocoServiceMock() },
          ],
        });

        facade = TestBed.inject(TamagotchiSelectionFacade);
      });

      it('должен показать error toast при evolvedPokemon', () => {
        selectionPortMock.validatePokemonSelection = vi.fn(() => ({
          error: 'evolvedPokemon' as const,
          valid: false as const,
        }));

        facade.selectForTamagotchi(PIKACHU_SELECTION_FIXTURE.name);

        expect(appNotifications.showErrorNotification).toHaveBeenCalledTimes(1);
        expect(appNotifications.showErrorNotification).toHaveBeenNthCalledWith(
          1,
          'Only first-stage Pokémon can join.',
        );
      });

      it('должен показать error toast при loadFailed', () => {
        selectionPortMock.loadPokemonByName = vi.fn(() => throwError(() => new Error('network')));

        facade.selectForTamagotchi(PIKACHU_SELECTION_FIXTURE.name);

        expect(appNotifications.showErrorNotification).toHaveBeenCalledTimes(1);
        expect(appNotifications.showErrorNotification).toHaveBeenNthCalledWith(
          1,
          'Could not prepare this Pokémon.',
        );
      });

      it('не должен вызывать selectForTamagotchi без имени покемона', () => {
        facade.selectForTamagotchi(undefined);

        expect(selectionPortMock.loadPokemonByName).not.toHaveBeenCalled();
      });
    });
  });
});
