import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

// A short rising two-note shimmer — a soft "ward up" cue distinct from the eat/evolve sounds.
const SHIMMER_HZ = [659.25, 987.77];
const NOTE_DURATION_MS = 260;
const NOTE_STEP_MS = 70;

@Injectable()
export class ShieldSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    for (const [index, frequency] of SHIMMER_HZ.entries()) {
      this.engine.playTone({
        frequency,
        durationMs: NOTE_DURATION_MS,
        type: 'sine',
        gain: 0.1,
        delayMs: index * NOTE_STEP_MS,
      });
    }
  }
}
