import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioEngineService } from './audio-engine.service';
import { SoundSettingsService } from './sound-settings.service';

// jsdom has no Web Audio — stand in a fake context and record oscillator creation.
const createOscillator = vi.fn();
const node: {
  type: string;
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
} = {
  type: 'square',
  frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null,
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

    expect(createOscillator).toHaveBeenCalledTimes(1);
  });

  it('stays silent while sound is disabled', () => {
    enabled.set(false);

    engine.playTone({ frequency: 200, durationMs: 280, gain: 0.3 });

    expect(createOscillator).not.toHaveBeenCalled();
  });

  it('skips an inaudible tone (peak collapses to silence) without opening the context', () => {
    engine.playTone({ frequency: 200, durationMs: 280, gain: 0 });

    expect(createOscillator).not.toHaveBeenCalled();
  });

  it('caps concurrent voices, skipping tones past the limit', () => {
    for (let i = 0; i < 9; i++) {
      engine.playTone({ frequency: 200, durationMs: 280, gain: 0.3 });
    }

    expect(createOscillator).toHaveBeenCalledTimes(6);
  });

  it('frees a voice slot once an oscillator ends', () => {
    for (let i = 0; i < 6; i++) {
      engine.playTone({ frequency: 200, durationMs: 280, gain: 0.3 });
    }

    node.onended?.();
    engine.playTone({ frequency: 200, durationMs: 280, gain: 0.3 });

    expect(createOscillator).toHaveBeenCalledTimes(7);
  });
});
