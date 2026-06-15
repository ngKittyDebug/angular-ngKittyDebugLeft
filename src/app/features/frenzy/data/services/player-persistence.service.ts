import { Injectable } from '@angular/core';

// Single key for all frenzy values. Persistent prefs (name/appearance/minimap state) live as a JSON blob in
// localStorage; the per-tab session token lives under the same key in sessionStorage — a different storage
// namespace on purpose, so each tab keeps its own player identity (the server uses the token as the player id).
const SESSION_KEY = 'frenzy-session';

interface FrenzySession {
  name?: string;
  appearance?: string;
  minimapCollapsed?: boolean;
  legendCollapsed?: boolean;
  leaderboardCollapsed?: boolean;
}

@Injectable()
export class PlayerPersistenceService {
  public getAppearance(): string {
    return this.read().appearance ?? '';
  }

  public getLeaderboardCollapsed(): boolean | null {
    return this.read().leaderboardCollapsed ?? null;
  }

  public getLegendCollapsed(): boolean | null {
    return this.read().legendCollapsed ?? null;
  }

  public getMinimapCollapsed(): boolean | null {
    return this.read().minimapCollapsed ?? null;
  }

  public getName(): string {
    return this.read().name ?? '';
  }

  public getOrCreateToken(): string {
    const storage = globalThis.sessionStorage;
    const existing = storage?.getItem(SESSION_KEY);

    if (existing !== null && existing !== undefined && existing.length > 0) {
      return existing;
    }

    const fresh = globalThis.crypto.randomUUID();

    storage?.setItem(SESSION_KEY, fresh);

    return fresh;
  }

  // Replace this tab's session token with a fresh one. Used when the server rejects `identify` because the token
  // is already bound to another live connection — a duplicated tab clones sessionStorage, so the copy rotates and
  // plays as its own Pokémon instead of fighting the original over one identity.
  public rotateToken(): string {
    const fresh = globalThis.crypto.randomUUID();

    globalThis.sessionStorage?.setItem(SESSION_KEY, fresh);

    return fresh;
  }

  public saveAppearance(appearance: string): void {
    this.merge({ appearance });
  }

  public saveLeaderboardCollapsed(leaderboardCollapsed: boolean): void {
    this.merge({ leaderboardCollapsed });
  }

  public saveLegendCollapsed(legendCollapsed: boolean): void {
    this.merge({ legendCollapsed });
  }

  public saveMinimapCollapsed(minimapCollapsed: boolean): void {
    this.merge({ minimapCollapsed });
  }

  public saveName(name: string): void {
    this.merge({ name });
  }

  private merge(patch: Partial<FrenzySession>): void {
    const next: FrenzySession = { ...this.read(), ...patch };

    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(next));
  }

  private read(): FrenzySession {
    const raw = globalThis.localStorage?.getItem(SESSION_KEY);

    if (raw === null || raw === undefined) {
      return {};
    }

    try {
      return JSON.parse(raw) as FrenzySession;
    } catch {
      return {};
    }
  }
}
