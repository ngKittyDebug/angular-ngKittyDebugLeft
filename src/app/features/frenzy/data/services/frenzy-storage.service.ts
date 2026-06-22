import { Injectable } from '@angular/core';

/**
 * The single seam for persisting Frenzy state to the browser's `localStorage`. Frenzy code goes through this service
 * instead of touching `localStorage` directly: one SSR guard, one place to swap or instrument the backend, and a
 * mockable dependency in tests (provide a fake in the TestBed before constructing the store).
 *
 * String and JSON helpers. Reads degrade to `null` — on a missing key, an SSR / no-storage environment, or a corrupt
 * JSON blob — rather than throwing; callers treat `null` as "nothing stored" and fall back to their own defaults.
 * (Per-tab `sessionStorage` identity stays in `PlayerPersistenceService`; this seam is the shared localStorage one.)
 */
@Injectable()
export class FrenzyStorageService {
  public getString(key: string): string | null {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  public setString(key: string, value: string): void {
    globalThis.localStorage?.setItem(key, value);
  }

  public getJson<T>(key: string): T | null {
    const raw = this.getString(key);

    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public setJson(key: string, value: unknown): void {
    this.setString(key, JSON.stringify(value));
  }
}
