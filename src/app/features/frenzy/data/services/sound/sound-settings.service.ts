import { Injectable, signal } from '@angular/core';

const ENABLED_KEY = 'left-paw-frenzy-sound-enabled';
const VOLUME_KEY = 'left-paw-frenzy-sound-volume';
const DEFAULT_VOLUME = 1;

@Injectable()
export class SoundSettingsService {
  private readonly _enabled = signal(this.readEnabled());
  private readonly _volume = signal(this.readVolume());

  public readonly enabled = this._enabled.asReadonly();
  public readonly volume = this._volume.asReadonly();

  public setEnabled(value: boolean): void {
    this._enabled.set(value);
    this.persist(ENABLED_KEY, String(value));
  }

  public setVolume(value: number): void {
    const clamped = Math.min(1, Math.max(0, value));

    this._volume.set(clamped);
    this.persist(VOLUME_KEY, String(clamped));
  }

  public toggle(): void {
    this.setEnabled(!this._enabled());
  }

  private persist(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }

  private readEnabled(): boolean {
    if (typeof localStorage === 'undefined') {
      return true;
    }

    return localStorage.getItem(ENABLED_KEY) !== 'false';
  }

  private readVolume(): number {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_VOLUME;
    }

    const stored = Number.parseFloat(localStorage.getItem(VOLUME_KEY) ?? '');

    if (Number.isNaN(stored)) {
      return DEFAULT_VOLUME;
    }

    return Math.min(1, Math.max(0, stored));
  }
}
