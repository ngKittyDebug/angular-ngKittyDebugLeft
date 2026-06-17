import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

// A warm, rounded two-note "nourished" cue for picking up the vitamin (heal + decay pause) — softer and
// lower than the shield's bright shimmer, so the two buffs sound distinct.
const WARM_HZ = [440, 587.33];
const NOTE_DURATION_MS = 240;
const NOTE_STEP_MS = 90;

@Injectable()
export class WellFedSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    for (const [index, frequency] of WARM_HZ.entries()) {
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
