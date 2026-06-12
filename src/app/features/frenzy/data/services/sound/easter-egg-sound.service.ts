import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

// A playful bouncing arpeggio — a quirky "surprise!" cue for picking up the easter egg (laying aura).
const BOUNCE_HZ = [392, 523.25, 659.25, 880];
const NOTE_DURATION_MS = 120;
const NOTE_STEP_MS = 60;

@Injectable()
export class EasterEggSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    for (const [index, frequency] of BOUNCE_HZ.entries()) {
      this.engine.playTone({
        frequency,
        durationMs: NOTE_DURATION_MS,
        type: 'triangle',
        gain: 0.1,
        delayMs: index * NOTE_STEP_MS,
      });
    }
  }
}
