import { inject, Injectable } from '@angular/core';

import { AudioEngineService } from './audio-engine.service';
import { SOUND_CONFIG, type SoundKind } from './sound-config';

/** Single entry point for scene sound: `play(kind)` looks the cue up in `SOUND_CONFIG` and feeds its tones to the engine. */
@Injectable()
export class SoundPlayerService {
  private readonly engine = inject(AudioEngineService);

  public play(kind: SoundKind): void {
    for (const tone of SOUND_CONFIG[kind]) {
      this.engine.playTone(tone);
    }
  }
}
