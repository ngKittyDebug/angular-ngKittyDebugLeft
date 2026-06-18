import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PerfLogPanelComponent } from './perf-log-panel.component';
import { DebugSettingsStore } from '../debug-settings.store';
import type { PerfMetricsSnapshot } from '../perf-metrics';
import { PerfSampleStore } from '../perf-sample.store';

function snapshot(): PerfMetricsSnapshot {
  return {
    fps: 58,
    p50Fps: 60,
    p1Fps: 41,
    jankPercent: 2,
    jitterMs: 1.4,
    sceneLoopMs: 3.2,
    census: { itemsTotal: 12, itemsWritten: 9, itemsSkipped: 3, players: 5 },
    writesPerFrame: 9,
    skipsPerFrame: 3,
    restructuresPerSecond: 3,
    gapPx: 8,
    stalenessMs: 240,
  };
}

function clickButton(fixture: ComponentFixture<PerfLogPanelComponent>, text: string): void {
  const host = fixture.nativeElement as HTMLElement;
  const button = [...host.querySelectorAll('button')].find((element) =>
    (element.textContent ?? '').includes(text),
  );

  button?.click();
}

function rowCount(fixture: ComponentFixture<PerfLogPanelComponent>): number {
  return (fixture.nativeElement as HTMLElement).querySelectorAll('.perf-log__table tbody tr')
    .length;
}

describe('PerfLogPanelComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DebugSettingsStore, PerfSampleStore] });
  });

  function render(): ComponentFixture<PerfLogPanelComponent> {
    const fixture = TestBed.createComponent(PerfLogPanelComponent);

    fixture.componentRef.setInput('snapshot', snapshot());
    fixture.detectChanges();

    return fixture;
  }

  it('captures a sample into the table on the capture button', () => {
    const fixture = render();

    expect(rowCount(fixture)).toBe(0);

    clickButton(fixture, 'capture');
    fixture.detectChanges();

    expect(rowCount(fixture)).toBe(1);
  });

  it('empties the table on the clear button', () => {
    const fixture = render();

    clickButton(fixture, 'capture');
    fixture.detectChanges();
    clickButton(fixture, 'clear');
    fixture.detectChanges();

    expect(rowCount(fixture)).toBe(0);
  });
});
