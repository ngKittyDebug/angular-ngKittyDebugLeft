import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TamagotchiStore } from '../store/tamagotchi.store';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import { TEST_POKEMON } from '../fixtures/tamagotchi-arbitraries';
import { TamagotchiErrorRecoveryService } from './tamagotchi-error-recovery.service';
import { TamagotchiInitService } from './tamagotchi-init.service';
import { PokemonProfileIntegrationService } from './pokemon-profile-integration.service';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';

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
      const loadFromPersistence = vi.fn();
      const selectPokemon = vi.fn();

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: {
              hasPokemon: signal(false),
              initialized: signal(true),
              loadFromPersistence,
              selectPokemon,
              setError: vi.fn(),
            },
          },
          {
            provide: PokemonProfileIntegrationService,
            useValue: {
              saveSelectedPokemon,
              validateSelectedPokemon,
            },
          },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(validateSelectedPokemon).toHaveBeenCalledTimes(1);
      expect(loadFromPersistence).toHaveBeenCalledTimes(1);
      expect(selectPokemon).toHaveBeenNthCalledWith(1, TEST_POKEMON);
      expect(saveSelectedPokemon).toHaveBeenNthCalledWith(1, TEST_POKEMON);
    });
  });

  describe('Edge Cases', () => {
    it('должен пропускать выбор из профиля, когда сохранённый покемон совпадает с выбором', () => {
      const validateSelectedPokemon = vi.fn(() => of({ error: 'noSelection', valid: false }));
      const loadFromPersistence = vi.fn();
      const selectPokemon = vi.fn();
      const resetState = vi.fn();

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: {
              hasPokemon: signal(true),
              initialized: signal(true),
              loadFromPersistence,
              pokemon: signal(TEST_POKEMON),
              resetState,
              selectPokemon,
              setError: vi.fn(),
            },
          },
          {
            provide: PokemonProfileIntegrationService,
            useValue: {
              getSelectedPokemonReference: vi.fn(() => matchingSelectionReference),
              saveSelectedPokemon: vi.fn(),
              validateSelectedPokemon,
            },
          },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      let completed = false;

      service.bootstrapFromProfile().subscribe(() => {
        completed = true;
      });

      expect(completed).toBe(true);
      expect(validateSelectedPokemon).not.toHaveBeenCalled();
      expect(loadFromPersistence).toHaveBeenCalledTimes(1);
      expect(resetState).not.toHaveBeenCalled();
      expect(selectPokemon).not.toHaveBeenCalled();
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

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: {
              hasPokemon: signal(true),
              initialized: signal(true),
              loadFromPersistence,
              pokemon: signal(TEST_POKEMON),
              resetState,
              selectPokemon,
              setError: vi.fn(),
            },
          },
          {
            provide: PokemonProfileIntegrationService,
            useValue: {
              getSelectedPokemonReference: vi.fn(() => ({
                id: replacementPokemon.id,
                name: replacementPokemon.name,
                species: replacementPokemon.species,
              })),
              saveSelectedPokemon,
              validateSelectedPokemon,
            },
          },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(loadFromPersistence).toHaveBeenCalledTimes(1);
      expect(resetState).toHaveBeenCalledTimes(1);
      expect(validateSelectedPokemon).toHaveBeenCalledTimes(1);
      expect(selectPokemon).toHaveBeenNthCalledWith(1, replacementPokemon);
      expect(saveSelectedPokemon).toHaveBeenNthCalledWith(1, replacementPokemon);
    });

    it('должен выставлять noSelection, когда нет сохранённого покемона и выбор в профиле пуст', () => {
      const validateSelectedPokemon = vi.fn(() => of({ error: 'noSelection', valid: false }));
      const loadFromPersistence = vi.fn();
      const selectPokemon = vi.fn();
      const setError = vi.fn();
      const loadPokemonByName = vi.fn();

      TestBed.configureTestingModule({
        providers: [
          TamagotchiInitService,
          {
            provide: TamagotchiStore,
            useValue: {
              hasPokemon: signal(false),
              initialized: signal(true),
              loadFromPersistence,
              selectPokemon,
              setError,
            },
          },
          {
            provide: PokemonProfileIntegrationService,
            useValue: {
              saveSelectedPokemon: vi.fn(),
              validateSelectedPokemon,
              loadPokemonByName,
            },
          },
        ],
      });

      const service = TestBed.inject(TamagotchiInitService);

      service.bootstrapFromProfile().subscribe();

      expect(validateSelectedPokemon).toHaveBeenCalledTimes(1);
      expect(loadFromPersistence).toHaveBeenCalledTimes(1);
      expect(setError).toHaveBeenNthCalledWith(1, 'noSelection');
      expect(selectPokemon).not.toHaveBeenCalled();
      expect(loadPokemonByName).not.toHaveBeenCalled();
    });
  });
});

describe('TamagotchiErrorRecoveryService', () => {
  let service: TamagotchiErrorRecoveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TamagotchiErrorRecoveryService);
  });

  describe('Happy Path', () => {
    it('должен восстанавливать валидное состояние с зажатыми значениями статуса', () => {
      const broken = {
        ...createInitialTamagotchiState(),
        initialized: true,
        pokemon: TEST_POKEMON,
        status: {
          ...createInitialTamagotchiState().status,
          energy: 150,
          hunger: -10,
        },
      };

      const repaired = service.repairState(broken);

      expect(repaired?.status.energy).toBe(100);
      expect(repaired?.status.hunger).toBe(0);
      expect(repaired?.error).toBeNull();
    });

    it('должен сообщать метаданные восстановления для отремонтированного состояния', () => {
      const result = service.attemptStateRecovery({
        ...createInitialTamagotchiState(),
        initialized: true,
        pokemon: TEST_POKEMON,
        status: createInitialTamagotchiState().status,
      });

      expect(result.recovered).toBe(true);
      expect(result.message).toBe(TAMAGOTCHI_SYSTEM_ERRORS.RECOVERED_FROM_BACKUP);
    });
  });
});
