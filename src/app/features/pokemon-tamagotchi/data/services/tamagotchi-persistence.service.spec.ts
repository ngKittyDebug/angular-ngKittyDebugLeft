import { TestBed } from '@angular/core/testing';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import { createTamagotchiStorageMock } from '../fixtures/tamagotchi-storage.mock';
import { TamagotchiStorageService } from './tamagotchi-storage.service';
import {
  TAMAGOTCHI_BACKUP_KEY,
  TAMAGOTCHI_STATE_VERSION,
  TAMAGOTCHI_STORAGE_KEY,
  TamagotchiPersistenceService,
} from './tamagotchi-persistence.service';

describe('TamagotchiPersistenceService', () => {
  let service: TamagotchiPersistenceService;
  let storageMock: ReturnType<typeof createTamagotchiStorageMock>;

  beforeEach(() => {
    storageMock = createTamagotchiStorageMock();
    TestBed.configureTestingModule({
      providers: [{ provide: TamagotchiStorageService, useValue: storageMock }],
    });
    service = TestBed.inject(TamagotchiPersistenceService);
  });

  it('should round-trip tamagotchi state through localStorage', () => {
    const state = {
      ...createInitialTamagotchiState(),
      initialized: true,
      status: {
        ...createInitialTamagotchiState().status,
        hunger: 42,
        mood: 55,
      },
    };

    service.save(state);
    const loaded = service.load();

    expect(loaded).not.toBeNull();
    expect(loaded?.state.status.hunger).toBe(42);
    expect(loaded?.state.status.mood).toBe(55);
    expect(loaded?.recoveredFromBackup).toBe(false);
  });

  it('should recover from backup when primary storage is corrupted', () => {
    const state = createInitialTamagotchiState();
    const payload = JSON.stringify({ state, version: TAMAGOTCHI_STATE_VERSION });

    storageMock.setItem(TAMAGOTCHI_BACKUP_KEY, payload);
    storageMock.setItem(TAMAGOTCHI_STORAGE_KEY, '{ invalid json');

    const loaded = service.load();

    expect(loaded?.recoveredFromBackup).toBe(true);
    expect(loaded?.state.status.health).toBe(state.status.health);
  });

  it('should clear persisted state', () => {
    service.save(createInitialTamagotchiState());
    service.clear();

    expect(storageMock.getItem(TAMAGOTCHI_STORAGE_KEY)).toBeNull();
    expect(storageMock.getItem(TAMAGOTCHI_BACKUP_KEY)).toBeNull();
    expect(service.load()).toBeNull();
  });
});
