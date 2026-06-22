/** Gap between two floats of the same owner leaving the queue, ms — the previous one rises clear before
 * the next chases it, so a flurry forms a legible column over time instead of overlapping at the head. */
export const FLOAT_RELEASE_STAGGER_MS = 600;

/**
 * A per-owner priority queue that hands items out one at a time. Each owner has an independent pending
 * list (sorted priority desc, FIFO within equal priority); the first item releases immediately and every
 * subsequent item for that owner waits one stagger, so its floats chase each other up a single column
 * rather than piling on the same spot. The `release` callback is where a freed item goes (the visible list).
 */
export class OwnerReleaseQueue<T extends { id: string; ownerId: string; priority: number }> {
  private readonly pending = new Map<string, T[]>();
  // Owner → live stagger timer. A keyed timer (not a flag) so a replace can cancel it: an owner whose
  // released float was pulled early shouldn't keep waiting out a stagger meant to space a stack.
  private readonly cooling = new Map<string, ReturnType<typeof setTimeout>>();

  public constructor(private readonly release: (item: T) => void) {}

  public enqueue(item: T): void {
    const queue = this.pending.get(item.ownerId) ?? [];
    // Sorted insert: slot before the first lower-priority entry, so a late high-priority float jumps ahead
    // of pending lowers (but never preempts one already released).
    const at = queue.findIndex((queued) => queued.priority < item.priority);

    queue.splice(at === -1 ? queue.length : at, 0, item);
    this.pending.set(item.ownerId, queue);
    this.pump(item.ownerId);
  }

  /** Drop a still-pending item by id so it never releases. Returns whether it was found pending — the caller
   * (e.g. dying-removal, poke-replace) then knows it doesn't also need to pull it from the visible list. */
  public removePending(id: string): boolean {
    for (const [ownerId, queue] of this.pending) {
      const at = queue.findIndex((queued) => queued.id === id);

      if (at === -1) {
        continue;
      }

      queue.splice(at, 1);

      if (queue.length === 0) {
        this.pending.delete(ownerId);
      }

      return true;
    }

    return false;
  }

  /** A released float of this owner just left the visible list (replaced or cleared). Its column slot is
   * free now, so cancel the pending stagger and release the next item at once instead of making a
   * replacement wait out a gap meant to space genuine stacks. */
  public notifyRemoved(ownerId: string): void {
    const timer = this.cooling.get(ownerId);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.cooling.delete(ownerId);
    }

    this.pump(ownerId);
  }

  private pump(ownerId: string): void {
    if (this.cooling.has(ownerId)) {
      return;
    }

    const queue = this.pending.get(ownerId);

    if (queue === undefined || queue.length === 0) {
      return;
    }

    const next = queue.shift() as T;

    if (queue.length === 0) {
      this.pending.delete(ownerId);
    }

    this.release(next);
    this.cooling.set(
      ownerId,
      setTimeout(() => {
        this.cooling.delete(ownerId);
        this.pump(ownerId);
      }, FLOAT_RELEASE_STAGGER_MS),
    );
  }
}
