import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SoundSettingsService } from './sound-settings.service';
import { FrenzyStorageService } from '../frenzy-storage.service';

const ENABLED_KEY = 'left-paw-frenzy-sound-enabled';
const VOLUME_KEY = 'left-paw-frenzy-sound-volume';

// Fresh DI scope each call — a re-injected service re-reads storage, simulating a reload.
function createService(): SoundSettingsService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [FrenzyStorageService, SoundSettingsService] });

  return TestBed.inject(SoundSettingsService);
}

describe('SoundSettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to enabled at full volume when nothing is stored', () => {
    const service = createService();

    expect(service.enabled()).toBe(true);
    expect(service.volume()).toBe(1);
  });

  it('seeds from the stored values', () => {
    localStorage.setItem(ENABLED_KEY, 'false');
    localStorage.setItem(VOLUME_KEY, '0.4');

    const service = createService();

    expect(service.enabled()).toBe(false);
    expect(service.volume()).toBe(0.4);
  });

  it('falls back to the default volume when the stored value is not numeric', () => {
    localStorage.setItem(VOLUME_KEY, 'garbage');

    const service = createService();

    expect(service.volume()).toBe(1);
  });

  it('persists the enabled flag on setEnabled', () => {
    const service = createService();

    service.setEnabled(false);

    expect(localStorage.getItem(ENABLED_KEY)).toBe('false');
  });

  it('clamps the volume into [0, 1] and persists the clamped value', () => {
    const service = createService();

    service.setVolume(1.7);

    expect(service.volume()).toBe(1);
    expect(localStorage.getItem(VOLUME_KEY)).toBe('1');
  });

  it('flips the enabled flag on toggle', () => {
    const service = createService();

    service.toggle();

    expect(service.enabled()).toBe(false);
  });
});
