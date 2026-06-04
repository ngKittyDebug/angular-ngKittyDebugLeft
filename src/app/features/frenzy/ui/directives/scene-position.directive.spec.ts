import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { clampXPercent, ScenePositionDirective } from './scene-position.directive';
import type { ScenePosition } from './scene-position.directive';

@Component({
  selector: 'left-paw-host',
  imports: [ScenePositionDirective],
  template: `<div class="target" [leftPawScenePosition]="position()"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  public readonly position = signal<ScenePosition>({ x: 0.5, y: 0.5 });
}

describe('ScenePositionDirective', () => {
  it('writes left/top as percentages from normalized coordinates (parent size unknown in jsdom)', () => {
    const fixture = TestBed.createComponent(HostComponent);

    fixture.componentInstance.position.set({ x: 0.25, y: 0.75 });

    const target = fixture.nativeElement.querySelector('.target') as HTMLElement;

    fixture.detectChanges();

    // jsdom reports 0 for parent client size, so the directive falls back to percentages.
    expect(target.style.left).toBe('25%');
    expect(target.style.top).toBe('75%');
  });
});

describe('clampXPercent', () => {
  it('keeps the raw percent when the box fits', () => {
    expect(clampXPercent(0.5, 100, 1000)).toBe(50);
  });

  it('clamps near the left edge by half the element width', () => {
    expect(clampXPercent(0, 100, 1000)).toBe(5);
  });

  it('clamps near the right edge by half the element width', () => {
    expect(clampXPercent(1, 100, 1000)).toBe(95);
  });

  it('falls back to the raw percent when the parent width is unknown', () => {
    expect(clampXPercent(0.3, 100, 0)).toBe(30);
  });
});
