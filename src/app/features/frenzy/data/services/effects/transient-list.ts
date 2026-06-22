import { signal } from '@angular/core';

/** Short random id for a transient scene element (floating text, blast). */
export function createTransientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A signal-backed list of id'd items, each auto-removed after its own TTL.
 * The shared primitive behind every "event → transient scene element with a lifetime" effect.
 */
export class TransientList<T extends { id: string }> {
  private readonly _items = signal<readonly T[]>([]);

  public readonly items = this._items.asReadonly();

  public add(item: T, ttlMs: number, cap?: number): void {
    this._items.update((current) => {
      const next = [...current, item];

      // With a cap, keep only the newest `cap` items (drop-oldest) so an event burst — e.g. a bomb cascade
      // adding many blasts at once — can't pile up unbounded transient DOM. The dropped item's pending TTL
      // timer still fires later and removes a now-absent id, which is a harmless no-op.
      return cap !== undefined && next.length > cap ? next.slice(next.length - cap) : next;
    });
    setTimeout(() => this.remove(item.id), ttlMs);
  }

  public remove(id: string): void {
    this._items.update((current) => current.filter((item) => item.id !== id));
  }
}
