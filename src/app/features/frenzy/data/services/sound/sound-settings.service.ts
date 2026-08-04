import { inject, Injectable, signal } from '@angular/core';

import { FrenzyStorageService } from '../frenzy-storage.service';

const ENABLED_KEY = 'left-paw-frenzy-sound-enabled';
const VOLUME_KEY = 'left-paw-frenzy-sound-volume';
const DEFAULT_VOLUME = 1;

@Injectable()
export class SoundSettingsService {
  private readonly storage = inject(FrenzyStorageService);
  private readonly _enabled = signal(this.readEnabled());
  private readonly _volume = signal(this.readVolume());

  public readonly enabled = this._enabled.asReadonly();
  public readonly volume = this._volume.asReadonly();

  public setEnabled(value: boolean): void {
    this._enabled.set(value);
    this.storage.setString(ENABLED_KEY, String(value));
  }

  public setVolume(value: number): void {
    const clamped = Math.min(1, Math.max(0, value));

    this._volume.set(clamped);
    this.storage.setString(VOLUME_KEY, String(clamped));
  }

  public toggle(): void {
    this.setEnabled(!this._enabled());
  }

  private readEnabled(): boolean {
    return this.storage.getString(ENABLED_KEY) !== 'false';
  }

  private readVolume(): number {
    const stored = Number.parseFloat(this.storage.getString(VOLUME_KEY) ?? '');

    if (Number.isNaN(stored)) {
      return DEFAULT_VOLUME;
    }

    return Math.min(1, Math.max(0, stored));
  }
}
