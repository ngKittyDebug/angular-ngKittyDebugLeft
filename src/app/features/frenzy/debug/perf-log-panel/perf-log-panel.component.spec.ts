import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PerfLogPanelComponent } from './perf-log-panel.component';
import { DebugSettingsStore } from '../debug-settings.store';
import type { PerfMetricsSnapshot } from '../perf-metrics';
import { PerfSampleStore } from '../perf-sample.store';
import { FrenzyStorageService } from '../../data/services/frenzy-storage.service';

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

function controlsVisible(fixture: ComponentFixture<PerfLogPanelComponent>): boolean {
  return (fixture.nativeElement as HTMLElement).querySelector('.perf-log__controls') !== null;
}

// The panel starts collapsed (header only); the capture/clear controls live behind the header toggle.
function expand(fixture: ComponentFixture<PerfLogPanelComponent>): void {
  clickButton(fixture, 'perf-log');
  fixture.detectChanges();
}

describe('PerfLogPanelComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [FrenzyStorageService, DebugSettingsStore, PerfSampleStore],
    });
  });

  function render(): ComponentFixture<PerfLogPanelComponent> {
    const fixture = TestBed.createComponent(PerfLogPanelComponent);

    fixture.componentRef.setInput('snapshot', snapshot());
    fixture.detectChanges();

    return fixture;
  }

  it('starts collapsed and toggles the controls on the header click', () => {
    const fixture = render();

    expect(controlsVisible(fixture)).toBe(false);

    expand(fixture);
    expect(controlsVisible(fixture)).toBe(true);

    clickButton(fixture, 'perf-log');
    fixture.detectChanges();
    expect(controlsVisible(fixture)).toBe(false);
  });

  it('captures a sample into the table on the capture button', () => {
    const fixture = render();

    expand(fixture);
    expect(rowCount(fixture)).toBe(0);

    clickButton(fixture, 'capture');
    fixture.detectChanges();

    expect(rowCount(fixture)).toBe(1);
  });

  it('empties the table on the clear button', () => {
    const fixture = render();

    expand(fixture);
    clickButton(fixture, 'capture');
    fixture.detectChanges();
    clickButton(fixture, 'clear');
    fixture.detectChanges();

    expect(rowCount(fixture)).toBe(0);
  });
});
