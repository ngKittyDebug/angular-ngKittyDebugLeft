import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import type { PokemonModel } from '../models/pokemon.model';
import {
  createTamagotchiStoreMock,
  type TamagotchiStoreMock,
} from '../store/tamagotchi.store.mock';
import { TamagotchiStore } from '../store/tamagotchi.store';
import { TamagotchiInitService } from './tamagotchi-init.service';
import {
  createTamagotchiSelectionMock,
  type TamagotchiSelectionMock,
} from './tamagotchi-selection.service.mock';
import { TamagotchiSelectionService } from './tamagotchi-selection.service';

describe('TamagotchiInitService', () => {
  const matchingSelectionReference = {
    id: TEST_POKEMON.id,
    name: TEST_POKEMON.name,
    species: TEST_POKEMON.species,
  };

  describe('Happy Path', () => {
    describe('нет сохранённого покемона', () => {
      let store: TamagotchiStoreMock;
      let selection: TamagotchiSelectionMock;
      let service: TamagotchiInitService;

      beforeEach(() => {
        selection = createTamagotchiSelectionMock({
          saveSelectedPokemon: vi.fn(),
          validateSelectedPokemon: vi.fn(() => of({ pokemon: TEST_POKEMON, valid: true as const })),
        });
        store = createTamagotchiStoreMock({
          hasPokemon: false,
          initialized: false,
          pokemon: null,
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiInitService,
            { provide: TamagotchiStore, useValue: store },
            { provide: TamagotchiSelectionService, useValue: selection },
          ],
        });

        service = TestBed.inject(TamagotchiInitService);
      });

      it('должен выбирать покемона из профиля, когда сохранённого покемона нет', () => {
        service.bootstrapFromProfile().subscribe();

        expect(selection.validateSelectedPokemon).toHaveBeenCalledTimes(1);
        expect(store.loadFromPersistence).toHaveBeenCalledTimes(1);
        expect(store.selectPokemon).toHaveBeenNthCalledWith(1, TEST_POKEMON);
        expect(selection.saveSelectedPokemon).toHaveBeenNthCalledWith(1, TEST_POKEMON);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('сохранённый покемон совпадает с выбором', () => {
      let store: TamagotchiStoreMock;
      let selection: TamagotchiSelectionMock;
      let service: TamagotchiInitService;

      beforeEach(() => {
        selection = createTamagotchiSelectionMock({
          getSelectedPokemonReference: vi.fn(() => matchingSelectionReference),
          validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection' as const, valid: false })),
        });
        store = createTamagotchiStoreMock({
          hasPokemon: true,
          methodOverrides: {
            loadFromPersistence: vi.fn(),
            resetState: vi.fn(),
            selectPokemon: vi.fn(),
          },
          pokemon: TEST_POKEMON,
          selectionOriginId: TEST_POKEMON.id,
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiInitService,
            { provide: TamagotchiStore, useValue: store },
            { provide: TamagotchiSelectionService, useValue: selection },
          ],
        });

        service = TestBed.inject(TamagotchiInitService);
      });

      it('должен пропускать выбор из профиля, когда сохранённый покемон совпадает с выбором', () => {
        let completed = false;

        service.bootstrapFromProfile().subscribe(() => {
          completed = true;
        });

        expect(completed).toBe(true);
        expect(selection.validateSelectedPokemon).toHaveBeenCalledTimes(0);
        expect(store.loadFromPersistence).toHaveBeenCalledTimes(0);
        expect(store.resetState).toHaveBeenCalledTimes(0);
        expect(store.selectPokemon).toHaveBeenCalledTimes(0);
      });
    });

    describe('прогресс после эволюции', () => {
      let store: TamagotchiStoreMock;
      let selection: TamagotchiSelectionMock;
      let service: TamagotchiInitService;

      beforeEach(() => {
        const evolvedPokemon: PokemonModel = {
          ...TEST_POKEMON,
          id: '26',
          isFirstStage: false,
          name: 'raichu',
          species: 'raichu',
        };

        selection = createTamagotchiSelectionMock({
          getSelectedPokemonReference: vi.fn(() => matchingSelectionReference),
          validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection' as const, valid: false })),
        });
        store = createTamagotchiStoreMock({
          hasPokemon: true,
          methodOverrides: { resetState: vi.fn() },
          pokemon: evolvedPokemon,
          selectionOriginId: TEST_POKEMON.id,
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiInitService,
            { provide: TamagotchiStore, useValue: store },
            { provide: TamagotchiSelectionService, useValue: selection },
          ],
        });

        service = TestBed.inject(TamagotchiInitService);
      });

      it('должен сохранять прогресс после эволюции, когда selectionOrigin совпадает с выбором в профиле', () => {
        service.bootstrapFromProfile().subscribe();

        expect(store.resetState).toHaveBeenCalledTimes(0);
        expect(selection.validateSelectedPokemon).toHaveBeenCalledTimes(0);
      });
    });

    describe('selectionOriginId null', () => {
      let store: TamagotchiStoreMock;
      let service: TamagotchiInitService;

      beforeEach(() => {
        const evolvedPokemon: PokemonModel = {
          ...TEST_POKEMON,
          id: '26',
          isFirstStage: false,
          name: 'raichu',
          species: 'raichu',
        };

        store = createTamagotchiStoreMock({
          hasPokemon: true,
          methodOverrides: { resetState: vi.fn() },
          pokemon: evolvedPokemon,
          selectionOriginId: null,
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiInitService,
            { provide: TamagotchiStore, useValue: store },
            {
              provide: TamagotchiSelectionService,
              useValue: createTamagotchiSelectionMock({
                getSelectedPokemonReference: vi.fn(() => matchingSelectionReference),
              }),
            },
          ],
        });

        service = TestBed.inject(TamagotchiInitService);
      });

      it('должен восстанавливать selectionOriginId из профиля без сброса, когда origin null', () => {
        service.bootstrapFromProfile().subscribe();

        expect(store.healSelectionOriginId).toHaveBeenNthCalledWith(1, TEST_POKEMON.id);
        expect(store.resetState).toHaveBeenCalledTimes(0);
      });
    });

    describe('выбор в профиле отличается от state', () => {
      let store: TamagotchiStoreMock;
      let selection: TamagotchiSelectionMock;
      let replacementPokemon: PokemonModel;
      let service: TamagotchiInitService;

      beforeEach(() => {
        replacementPokemon = {
          ...TEST_POKEMON,
          id: '4',
          name: 'charmander',
          species: 'charmander',
        };
        selection = createTamagotchiSelectionMock({
          getSelectedPokemonReference: vi.fn(() => ({
            id: replacementPokemon.id,
            name: replacementPokemon.name,
            species: replacementPokemon.species,
          })),
          saveSelectedPokemon: vi.fn(),
          validateSelectedPokemon: vi.fn(() =>
            of({ pokemon: replacementPokemon, valid: true as const }),
          ),
        });
        store = createTamagotchiStoreMock({
          hasPokemon: true,
          methodOverrides: {
            loadFromPersistence: vi.fn(),
            resetState: vi.fn(),
            selectPokemon: vi.fn(),
          },
          pokemon: TEST_POKEMON,
          selectionOriginId: TEST_POKEMON.id,
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiInitService,
            { provide: TamagotchiStore, useValue: store },
            { provide: TamagotchiSelectionService, useValue: selection },
          ],
        });

        service = TestBed.inject(TamagotchiInitService);
      });

      it('должен сбрасывать прогресс и применять новый выбор, когда покемон в state отличается от выбора в профиле', () => {
        service.bootstrapFromProfile().subscribe();

        expect(store.loadFromPersistence).toHaveBeenCalledTimes(0);
        expect(store.resetState).toHaveBeenCalledTimes(1);
        expect(selection.validateSelectedPokemon).toHaveBeenCalledTimes(1);
        expect(store.selectPokemon).toHaveBeenNthCalledWith(1, replacementPokemon);
        expect(selection.saveSelectedPokemon).toHaveBeenNthCalledWith(1, replacementPokemon);
      });
    });

    describe('пустой выбор в профиле', () => {
      let store: TamagotchiStoreMock;
      let selection: TamagotchiSelectionMock;
      let service: TamagotchiInitService;

      beforeEach(() => {
        selection = createTamagotchiSelectionMock({
          loadPokemonByName: vi.fn(),
          validateSelectedPokemon: vi.fn(() => of({ error: 'noSelection' as const, valid: false })),
        });
        store = createTamagotchiStoreMock({
          hasPokemon: false,
          initialized: false,
          methodOverrides: { setError: vi.fn() },
          pokemon: null,
        });

        TestBed.configureTestingModule({
          providers: [
            TamagotchiInitService,
            { provide: TamagotchiStore, useValue: store },
            { provide: TamagotchiSelectionService, useValue: selection },
          ],
        });

        service = TestBed.inject(TamagotchiInitService);
      });

      it('должен выставлять noSelection, когда нет сохранённого покемона и выбор в профиле пуст', () => {
        service.bootstrapFromProfile().subscribe();

        expect(selection.validateSelectedPokemon).toHaveBeenCalledTimes(1);
        expect(store.loadFromPersistence).toHaveBeenCalledTimes(1);
        expect(store.setError).toHaveBeenNthCalledWith(1, 'noSelection');
        expect(store.selectPokemon).toHaveBeenCalledTimes(0);
        expect(selection.loadPokemonByName).toHaveBeenCalledTimes(0);
      });
    });
  });
});
