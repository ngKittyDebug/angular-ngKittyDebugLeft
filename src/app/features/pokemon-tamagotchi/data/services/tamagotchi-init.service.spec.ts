import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, type MockedObject, vi } from 'vitest';
import { TamagotchiStore } from '../store/tamagotchi.store';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import { TamagotchiInitService } from './tamagotchi-init.service';
import { TamagotchiSelectionService } from './tamagotchi-selection.service';

type TamagotchiStoreInstance = InstanceType<typeof TamagotchiStore>;

type TamagotchiStoreInitMethodsMock = MockedObject<
  Pick<
    TamagotchiStoreInstance,
    'healSelectionOriginId' | 'loadFromPersistence' | 'resetState' | 'selectPokemon' | 'setError'
  >
>;

type TamagotchiSelectionInitMock = MockedObject<
  Pick<
    TamagotchiSelectionService,
    | 'getSelectedPokemonReference'
    | 'loadPokemonByName'
    | 'saveSelectedPokemon'
    | 'validateSelectedPokemon'
  >
>;

function createInitStoreMock(
  options: {
    hasPokemon: boolean;
    initialized?: boolean;
    pokemon?: PokemonModel;
    selectionOriginId?: string | null;
  },
  methodOverrides: Partial<TamagotchiStoreInitMethodsMock> = {},
) {
  const initialized = signal(options.initialized ?? true);
  const selectionOriginId = signal(
    options.selectionOriginId === undefined
      ? (options.pokemon?.id ?? null)
      : options.selectionOriginId,
  );
  const methods = {
    healSelectionOriginId: vi.fn((originId: string) => {
      selectionOriginId.set(originId);
    }),
    loadFromPersistence: vi.fn(() => {
      initialized.set(true);
    }),
    resetState: vi.fn(),
    selectPokemon: vi.fn(),
    setError: vi.fn(),
    ...methodOverrides,
  } as const satisfies TamagotchiStoreInitMethodsMock;

  return {
    hasPokemon: signal(options.hasPokemon),
    initialized,
    selectionOriginId,
    ...(options.pokemon === undefined ? {} : { pokemon: signal(options.pokemon) }),
    ...methods,
  };
}

function createSelectionInitMock(
  overrides: Partial<TamagotchiSelectionInitMock> = {},
): TamagotchiSelectionInitMock {
  return {
    getSelectedPokemonReference: vi.fn(() => null),
    loadPokemonByName: vi.fn(),
    saveSelectedPokemon: vi.fn(),
    validateSelectedPokemon: vi.fn(),
    ...overrides,
  } as const satisfies TamagotchiSelectionInitMock;
}

describe('TamagotchiInitService', () => {
  const matchingSelectionReference = {
    id: TEST_POKEMON.id,
    name: TEST_POKEMON.name,
    species: TEST_POKEMON.species,
  };

  describe('Happy Path', () => {
    it('должен выбирать покемона из профиля, когда сохранённого покемона нет', () => {
      const validateSelectedPokemon = vi.fn(() =>
        of({ pokemon: TEST_POKEMON, valid: true as const }),
      );
      const saveSelectedPokemon = vi.fn();
      const selection = createSelectionInitMock({
        saveSelectedPokemon,
        validateSelectedPokemon,
      });
      const store = createInitStoreMock({ hasPokemon: false, initialized: false });

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          { provide: TamagotchiStore, useValue: store },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(validateSelectedPokemon).toHaveBeenCalledTimes(1);
      expect(store.loadFromPersistence).toHaveBeenCalledTimes(1);
      expect(store.selectPokemon).toHaveBeenNthCalledWith(1, TEST_POKEMON);
      expect(saveSelectedPokemon).toHaveBeenNthCalledWith(1, TEST_POKEMON);
    });
  });

  describe('Edge Cases', () => {
    it('должен пропускать выбор из профиля, когда сохранённый покемон совпадает с выбором', () => {
      const validateSelectedPokemon = vi.fn(() =>
        of({ error: 'noSelection' as const, valid: false }),
      );
      const loadFromPersistence = vi.fn();
      const selectPokemon = vi.fn();
      const resetState = vi.fn();
      const selection = createSelectionInitMock({
        getSelectedPokemonReference: vi.fn(() => matchingSelectionReference),
        validateSelectedPokemon,
      });

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: createInitStoreMock(
              {
                hasPokemon: true,
                pokemon: TEST_POKEMON,
                selectionOriginId: TEST_POKEMON.id,
              },
              { loadFromPersistence, resetState, selectPokemon },
            ),
          },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      let completed = false;

      service.bootstrapFromProfile().subscribe(() => {
        completed = true;
      });

      expect(completed).toBe(true);
      expect(validateSelectedPokemon).not.toHaveBeenCalled();
      expect(loadFromPersistence).not.toHaveBeenCalled();
      expect(resetState).not.toHaveBeenCalled();
      expect(selectPokemon).not.toHaveBeenCalled();
    });

    it('должен сохранять прогресс после эволюции, когда selectionOrigin совпадает с выбором в профиле', () => {
      const evolvedPokemon: PokemonModel = {
        ...TEST_POKEMON,
        id: '26',
        isFirstStage: false,
        name: 'raichu',
        species: 'raichu',
      };
      const validateSelectedPokemon = vi.fn(() =>
        of({ error: 'noSelection' as const, valid: false }),
      );
      const resetState = vi.fn();
      const selection = createSelectionInitMock({
        getSelectedPokemonReference: vi.fn(() => matchingSelectionReference),
        validateSelectedPokemon,
      });

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: createInitStoreMock(
              {
                hasPokemon: true,
                pokemon: evolvedPokemon,
                selectionOriginId: TEST_POKEMON.id,
              },
              { resetState },
            ),
          },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(resetState).not.toHaveBeenCalled();
      expect(validateSelectedPokemon).not.toHaveBeenCalled();
    });

    it('должен восстанавливать selectionOriginId из профиля без сброса, когда origin null', () => {
      const evolvedPokemon: PokemonModel = {
        ...TEST_POKEMON,
        id: '26',
        isFirstStage: false,
        name: 'raichu',
        species: 'raichu',
      };
      const resetState = vi.fn();
      const store = createInitStoreMock(
        {
          hasPokemon: true,
          pokemon: evolvedPokemon,
          selectionOriginId: null,
        },
        { resetState },
      );
      const selection = createSelectionInitMock({
        getSelectedPokemonReference: vi.fn(() => matchingSelectionReference),
      });

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          { provide: TamagotchiStore, useValue: store },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(store.healSelectionOriginId).toHaveBeenNthCalledWith(1, TEST_POKEMON.id);
      expect(resetState).not.toHaveBeenCalled();
    });

    it('должен сбрасывать прогресс и применять новый выбор, когда покемон в state отличается от выбора в профиле', () => {
      const replacementPokemon = {
        ...TEST_POKEMON,
        id: '4',
        name: 'charmander',
        species: 'charmander',
      };
      const validateSelectedPokemon = vi.fn(() =>
        of({ pokemon: replacementPokemon, valid: true as const }),
      );
      const loadFromPersistence = vi.fn();
      const selectPokemon = vi.fn();
      const resetState = vi.fn();
      const saveSelectedPokemon = vi.fn();
      const selection = createSelectionInitMock({
        getSelectedPokemonReference: vi.fn(() => ({
          id: replacementPokemon.id,
          name: replacementPokemon.name,
          species: replacementPokemon.species,
        })),
        saveSelectedPokemon,
        validateSelectedPokemon,
      });

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: createInitStoreMock(
              {
                hasPokemon: true,
                pokemon: TEST_POKEMON,
                selectionOriginId: TEST_POKEMON.id,
              },
              { loadFromPersistence, resetState, selectPokemon },
            ),
          },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(loadFromPersistence).not.toHaveBeenCalled();
      expect(resetState).toHaveBeenCalledTimes(1);
      expect(validateSelectedPokemon).toHaveBeenCalledTimes(1);
      expect(selectPokemon).toHaveBeenNthCalledWith(1, replacementPokemon);
      expect(saveSelectedPokemon).toHaveBeenNthCalledWith(1, replacementPokemon);
    });

    it('должен выставлять noSelection, когда нет сохранённого покемона и выбор в профиле пуст', () => {
      const validateSelectedPokemon = vi.fn(() =>
        of({ error: 'noSelection' as const, valid: false }),
      );
      const setError = vi.fn();
      const loadPokemonByName = vi.fn();
      const selection = createSelectionInitMock({
        loadPokemonByName,
        validateSelectedPokemon,
      });
      const store = createInitStoreMock({ hasPokemon: false, initialized: false }, { setError });

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          { provide: TamagotchiStore, useValue: store },
          { provide: TamagotchiSelectionService, useValue: selection },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(validateSelectedPokemon).toHaveBeenCalledTimes(1);
      expect(store.loadFromPersistence).toHaveBeenCalledTimes(1);
      expect(setError).toHaveBeenNthCalledWith(1, 'noSelection');
      expect(store.selectPokemon).not.toHaveBeenCalled();
      expect(loadPokemonByName).not.toHaveBeenCalled();
    });
  });
});
