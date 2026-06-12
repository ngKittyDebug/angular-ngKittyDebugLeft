import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HpFlashDirective } from './hp-flash.directive';

@Component({
  selector: 'left-paw-hp-flash-host',
  template: `<span [leftPawHpFlash]="hp()" [flashThreshold]="threshold()">{{ hp() }}</span>`,
  imports: [HpFlashDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  public readonly hp = signal(100);
  public readonly threshold = signal(10);
}

function keyframesColor(call: unknown[]): string {
  return JSON.stringify(call[0]);
}

describe('HpFlashDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let animate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    animate = vi.fn().mockReturnValue({ cancel: vi.fn() });
    Element.prototype.animate = animate as unknown as Element['animate'];

    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not flash on the first render', () => {
    expect(animate).not.toHaveBeenCalled();
  });

  it('flashes the positive tone on a gain larger than the threshold', () => {
    host.hp.set(150);
    fixture.detectChanges();

    expect(animate).toHaveBeenCalledTimes(1);
    expect(keyframesColor(animate.mock.calls[0])).toContain('#4caf50');
  });

  it('flashes the negative tone on a loss larger than the threshold', () => {
    host.hp.set(50);
    fixture.detectChanges();

    expect(animate).toHaveBeenCalledTimes(1);
    expect(keyframesColor(animate.mock.calls[0])).toContain('#f44336');
  });

  it('does not flash when the change is within the threshold (e.g. decay)', () => {
    host.hp.set(98);
    fixture.detectChanges();

    expect(animate).not.toHaveBeenCalled();
  });
});
