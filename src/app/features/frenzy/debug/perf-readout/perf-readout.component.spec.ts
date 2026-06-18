import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PerfReadoutComponent } from './perf-readout.component';
import { DebugSettingsStore, PERF_METRIC_KEYS } from '../debug-settings.store';
import type { PerfMetricsSnapshot } from '../perf-metrics';

function sampleSnapshot(): PerfMetricsSnapshot {
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

function metricTexts(fixture: ComponentFixture<PerfReadoutComponent>): string[] {
  const host = fixture.nativeElement as HTMLElement;

  return [...host.querySelectorAll('.perf-readout__metric')].map((element) =>
    (element.textContent ?? '').trim(),
  );
}

describe('PerfReadoutComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DebugSettingsStore] });
  });

  function render(): ComponentFixture<PerfReadoutComponent> {
    const fixture = TestBed.createComponent(PerfReadoutComponent);

    fixture.componentRef.setInput('snapshot', sampleSnapshot());
    fixture.detectChanges();

    return fixture;
  }

  it('renders one line per enabled metric (all on by default)', () => {
    expect(metricTexts(render())).toHaveLength(PERF_METRIC_KEYS.length);
  });

  it('drops a metric line when its toggle is turned off', () => {
    const store = TestBed.inject(DebugSettingsStore);
    const fixture = render();

    expect(metricTexts(fixture).some((text) => text.startsWith('gap'))).toBe(true);

    store.setMetric('gap', false);
    fixture.detectChanges();

    const texts = metricTexts(fixture);

    expect(texts.some((text) => text.startsWith('gap'))).toBe(false);
    expect(texts).toHaveLength(PERF_METRIC_KEYS.length - 1);
  });
});
