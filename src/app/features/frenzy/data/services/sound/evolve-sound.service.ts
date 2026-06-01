import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

const ARPEGGIO_HZ = [523.25, 659.25, 783.99, 1046.5];
const NOTE_DURATION_MS = 220;
const NOTE_STEP_MS = 90;

@Injectable()
export class EvolveSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    for (const [index, frequency] of ARPEGGIO_HZ.entries()) {
      this.engine.playTone({
        frequency,
        durationMs: NOTE_DURATION_MS,
        type: 'triangle',
        gain: 0.14,
        delayMs: index * NOTE_STEP_MS,
      });
    }
  }
}
