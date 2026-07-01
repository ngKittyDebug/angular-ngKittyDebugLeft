import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import * as TamagotchiActions from '../store/tamagotchi.actions';
import { createInitialTamagotchiState, TAMAGOTCHI_FEATURE_KEY } from '../store/tamagotchi.state';
import { TEST_POKEMON } from '../testing/tamagotchi-arbitraries';
import { TamagotchiErrorRecoveryService } from './tamagotchi-error-recovery.service';
import { TamagotchiInitService } from './tamagotchi-init.service';
import { PokemonProfileIntegrationService } from './pokemon-profile-integration.service';

describe('TamagotchiInitService', () => {
  it('should skip profile selection when persisted pokemon exists', () => {
    const validateSelectedPokemon = vi.fn(() => of({ error: 'noSelection', valid: false }));

    TestBed.configureTestingModule({
      providers: [
        TamagotchiInitService,
        provideMockStore({
          initialState: {
            [TAMAGOTCHI_FEATURE_KEY]: {
              ...createInitialTamagotchiState(),
              initialized: true,
              pokemon: TEST_POKEMON,
            },
          },
        }),
        {
          provide: PokemonProfileIntegrationService,
          useValue: {
            saveSelectedPokemon: vi.fn(),
            validateSelectedPokemon,
          },
        },
      ],
    });

    const service = TestBed.inject(TamagotchiInitService);
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');

    let completed = false;

    service.bootstrapFromProfile().subscribe(() => {
      completed = true;
    });

    expect(completed).toBe(true);
    expect(validateSelectedPokemon).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(TamagotchiActions.loadState());
  });

  it('should dispatch profile pokemon when no persisted pokemon exists', () => {
    const validateSelectedPokemon = vi.fn(() =>
      of({ pokemon: TEST_POKEMON, valid: true as const }),
    );
    const saveSelectedPokemon = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        TamagotchiInitService,
        provideMockStore({
          initialState: {
            [TAMAGOTCHI_FEATURE_KEY]: {
              ...createInitialTamagotchiState(),
              initialized: true,
              pokemon: null,
            },
          },
        }),
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
    const store = TestBed.inject(Store);
    const dispatch = vi.spyOn(store, 'dispatch');

    service.bootstrapFromProfile().subscribe();

    expect(validateSelectedPokemon).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(TamagotchiActions.loadState());
    expect(dispatch).toHaveBeenCalledWith(
      TamagotchiActions.selectPokemon({ pokemon: TEST_POKEMON }),
    );
    expect(saveSelectedPokemon).toHaveBeenCalledWith(TEST_POKEMON);
  });
});

describe('TamagotchiErrorRecoveryService', () => {
  let service: TamagotchiErrorRecoveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TamagotchiErrorRecoveryService);
  });

  it('should repair valid state with clamped status values', () => {
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

  it('should report recovery metadata for repaired state', () => {
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
