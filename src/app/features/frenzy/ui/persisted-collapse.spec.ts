import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { persistedCollapse } from './persisted-collapse';
import { FrenzyStorageService } from '../data/services/frenzy-storage.service';

const KEY = 'frenzy-test-collapsed';

// persistedCollapse injects FrenzyStorageService, so it must run in an injection context — same as in components.
function createCollapse(key: string, fallback: () => boolean): WritableSignal<boolean> {
  return TestBed.runInInjectionContext(() => persistedCollapse(key, fallback));
}

describe('persistedCollapse', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [FrenzyStorageService] });
  });

  it('seeds from the fallback when nothing is stored', () => {
    const collapsed = createCollapse(KEY, () => true);

    expect(collapsed()).toBe(true);
  });

  it('seeds from the stored value, ignoring the fallback', () => {
    localStorage.setItem(KEY, 'false');

    const collapsed = createCollapse(KEY, () => true);

    expect(collapsed()).toBe(false);
  });

  it('falls back when the stored value is not a boolean string', () => {
    localStorage.setItem(KEY, 'garbage');

    const collapsed = createCollapse(KEY, () => true);

    expect(collapsed()).toBe(true);
  });

  it('writes through to storage on an explicit set', () => {
    const collapsed = createCollapse(KEY, () => false);

    collapsed.set(true);

    expect(collapsed()).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('true');
  });

  it('writes through to storage on an explicit update', () => {
    const collapsed = createCollapse(KEY, () => false);

    collapsed.update((value) => !value);

    expect(collapsed()).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('true');
  });

  it('keeps following the reactive fallback while nothing has been stored', () => {
    const compact = signal(false);
    const collapsed = createCollapse(KEY, () => compact());

    expect(collapsed()).toBe(false);

    compact.set(true);

    expect(collapsed()).toBe(true);
  });

  it('lets an explicit choice win over the fallback thereafter', () => {
    const compact = signal(true);
    const collapsed = createCollapse(KEY, () => compact());

    collapsed.set(false);
    compact.set(true);

    expect(collapsed()).toBe(false);
  });
});
