import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SceneSandPuffsService } from './scene-sand-puffs.service';
import type { RenderedItem } from '../scene-view-models';

function item(overrides: Partial<RenderedItem> = {}): RenderedItem {
  return {
    id: 'i1',
    type: 'food',
    x: 0.5,
    y: 0.5,
    landed: false,
    spinDurationMs: 2000,
    spinReverse: false,
    ...overrides,
  };
}

describe('SceneSandPuffsService', () => {
  let service: SceneSandPuffsService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [SceneSandPuffsService] });
    service = TestBed.inject(SceneSandPuffsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns a puff at the touchdown x when an item flips airborne→landed', () => {
    service.observe([item({ id: 'a', type: 'rock', x: 0.3, landed: false })]);
    expect(service.puffs()).toHaveLength(0);

    service.observe([item({ id: 'a', type: 'rock', x: 0.3, landed: true })]);

    expect(service.puffs()).toHaveLength(1);
    expect(service.puffs()[0]).toMatchObject({ x: 0.3, weight: 1 });
  });

  it('does not puff for an item first seen already landed (server-rested, never fell on-screen)', () => {
    service.observe([item({ id: 'a', type: 'rock', landed: true })]);

    expect(service.puffs()).toHaveLength(0);
  });

  it('puffs for a bomb when it detonates against the floor (lands), the biggest weight', () => {
    service.observe([item({ id: 'b', type: 'bomb', landed: false })]);
    service.observe([item({ id: 'b', type: 'bomb', landed: true })]);

    expect(service.puffs()).toHaveLength(1);
    expect(service.puffs()[0].weight).toBeGreaterThan(1);
  });

  it('does not puff again while an item stays landed', () => {
    service.observe([item({ id: 'a', landed: false })]);
    service.observe([item({ id: 'a', landed: true })]);
    service.observe([item({ id: 'a', landed: true })]);

    expect(service.puffs()).toHaveLength(1);
  });

  it('removes a puff after its lifetime', () => {
    service.observe([item({ id: 'a', landed: false })]);
    service.observe([item({ id: 'a', landed: true })]);

    expect(service.puffs()).toHaveLength(1);

    vi.advanceTimersByTime(1200);
    expect(service.puffs()).toHaveLength(0);
  });

  it('forgets a vanished id, so a re-spawned id seen mid-air puffs again on its next landing', () => {
    service.observe([item({ id: 'a', landed: false })]);
    service.observe([item({ id: 'a', landed: true })]);
    expect(service.puffs()).toHaveLength(1);

    // The id leaves the field, then a fresh item re-uses it: airborne again → its later landing puffs anew.
    service.observe([]);
    service.observe([item({ id: 'a', landed: false })]);
    service.observe([item({ id: 'a', landed: true })]);

    expect(service.puffs()).toHaveLength(2);
  });

  it('suppresses the puff under prefers-reduced-motion', () => {
    const previous = window.matchMedia;

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }) as MediaQueryList,
    });

    service.observe([item({ id: 'a', landed: false })]);
    service.observe([item({ id: 'a', landed: true })]);

    expect(service.puffs()).toHaveLength(0);

    Object.defineProperty(window, 'matchMedia', { configurable: true, value: previous });
  });
});
