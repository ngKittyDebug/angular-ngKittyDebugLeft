import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioEngineService } from './audio-engine.service';
import { SoundSettingsService } from './sound-settings.service';

// jsdom has no Web Audio — stand in a fake context and record oscillator creation.
const createOscillator = vi.fn();
const node = {
  type: 'square',
  frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
};

class FakeAudioContext {
  public currentTime = 0;
  public state = 'running';
  public destination = {};
  public resume = vi.fn();
  public createGain = vi.fn().mockReturnValue(node);
  public createOscillator = createOscillator.mockReturnValue(node);
}

describe('AudioEngineService', () => {
  const enabled = signal(true);
  let engine: AudioEngineService;

  beforeEach(() => {
    enabled.set(true);
    createOscillator.mockClear();
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;

    TestBed.configureTestingModule({
      providers: [
        AudioEngineService,
        { provide: SoundSettingsService, useValue: { enabled, volume: signal(1) } },
      ],
    });
    engine = TestBed.inject(AudioEngineService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a tone while sound is enabled', () => {
    engine.playTone({ frequency: 200, durationMs: 280, gain: 0.3 });

    expect(createOscillator).toHaveBeenCalled();
  });

  it('stays silent while sound is disabled', () => {
    enabled.set(false);

    engine.playTone({ frequency: 200, durationMs: 280, gain: 0.3 });

    expect(createOscillator).not.toHaveBeenCalled();
  });
});
