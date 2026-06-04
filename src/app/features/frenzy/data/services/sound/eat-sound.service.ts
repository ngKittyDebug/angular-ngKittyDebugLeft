import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { type SoundEffect } from '../../models/sound-effect';

@Injectable()
export class EatSoundService implements SoundEffect {
  private readonly engine = inject(AudioEngineService);

  public play(): void {
    this.engine.playTone({ frequency: 660, durationMs: 80, type: 'square', gain: 0.12 });
    this.engine.playTone({
      frequency: 880,
      durationMs: 70,
      type: 'square',
      gain: 0.1,
      delayMs: 60,
    });
  }
}
