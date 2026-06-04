import { inject, Injectable } from '@angular/core';

import { SoundSettingsService } from './sound-settings.service';

export interface ToneOptions {
  frequency: number;
  durationMs: number;
  type?: OscillatorType;
  gain?: number;
  delayMs?: number;
  endFrequency?: number;
}

const SILENCE = 0.0001;
const ATTACK_SECONDS = 0.01;

@Injectable()
export class AudioEngineService {
  private readonly settings = inject(SoundSettingsService);
  private context: AudioContext | null = null;

  public playTone(options: ToneOptions): void {
    if (!this.settings.enabled()) {
      return;
    }

    const peak = (options.gain ?? 0.12) * this.settings.volume();

    if (peak <= SILENCE) {
      return;
    }

    const context = this.ensureContext();

    if (context === null) {
      return;
    }

    const startAt = context.currentTime + (options.delayMs ?? 0) / 1000;
    const stopAt = startAt + options.durationMs / 1000;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = options.type ?? 'square';
    oscillator.frequency.setValueAtTime(options.frequency, startAt);

    if (options.endFrequency !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(options.endFrequency, stopAt);
    }

    envelope.gain.setValueAtTime(SILENCE, startAt);
    envelope.gain.exponentialRampToValueAtTime(peak, startAt + ATTACK_SECONDS);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, stopAt);
    oscillator.connect(envelope).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const audioContextConstructor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (audioContextConstructor === undefined) {
      return null;
    }

    this.context ??= new audioContextConstructor();

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }

    return this.context;
  }
}
