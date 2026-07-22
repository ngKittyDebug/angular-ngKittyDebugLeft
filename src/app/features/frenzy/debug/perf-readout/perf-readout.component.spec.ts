import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { beforeEach, describe, expect, it } from 'vitest';

import { PerfReadoutComponent } from './perf-readout.component';
import { DebugSettingsStore, PERF_METRIC_KEYS } from '../debug-settings.store';
import type { PerfMetricKey } from '../debug-settings.store';
import type { PerfMetricsSnapshot } from '../perf-metrics';
import { PerfMetricInfoComponent } from '../perf-metric-info/perf-metric-info.component';
import { FrenzyStorageService } from '../../data/services/frenzy-storage.service';
import { COLLAPSE_KEY } from '../../ui/persisted-collapse';

// Stand-in frenzy-debug labels matching the production short labels the rows are queried by. The info hint body is
// not rendered in these specs (no Taiga portal host), so what/why/interpret are placeholders.
const LABELS: Record<string, string> = {
  fps: 'FPS',
  fpsP50: 'p50',
  fpsP1: 'p1-low',
  jank: 'jank',
  jitter: 'jitter',
  sceneLoopMs: 'loop',
  actorCensus: 'actors',
  writeSkip: 'w/s',
  restructures: 'restr',
  gap: 'gap',
  staleness: 'stale',
};

const FRENZY_DEBUG = {
  panelTitle: 'readout',
  fpsLabel: 'FPS',
  infoAriaLabel: 'Details: {{metric}}',
  sections: { what: 'What', why: 'Why', interpret: 'How to read' },
  metrics: Object.fromEntries(
    PERF_METRIC_KEYS.map((key) => [
      key,
      { label: LABELS[key], name: LABELS[key], what: '.', why: '.', interpret: '.' },
    ]),
  ),
};

// Stub for the info child: same selector + I/O contract, no Taiga hint — so these specs exercise the readout's openKey
// wiring without a Taiga portal host (the real child, including its hint, is covered by its own spec).
@Component({
  selector: 'left-paw-perf-metric-info',
  template:
    '<button type="button" class="perf-metric-info" aria-label="info" (click)="toggled.emit()"></button>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubPerfMetricInfoComponent {
  public readonly key = input.required<PerfMetricKey>();
  public readonly open = input<boolean>(false);
  public readonly toggled = output<void>();
}

function sampleSnapshot(overrides: Partial<PerfMetricsSnapshot> = {}): PerfMetricsSnapshot {
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
    ...overrides,
  };
}

function host(fixture: ComponentFixture<PerfReadoutComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rows(fixture: ComponentFixture<PerfReadoutComponent>): HTMLElement[] {
  return [...host(fixture).querySelectorAll<HTMLElement>('.perf-readout__row')];
}

function rowFor(fixture: ComponentFixture<PerfReadoutComponent>, label: string): HTMLElement {
  const match = rows(fixture).find(
    (row) => (row.querySelector('.perf-readout__label')?.textContent ?? '').trim() === label,
  );

  if (match === undefined) {
    throw new Error(`no readout row labelled "${label}"`);
  }

  return match;
}

function valueText(row: HTMLElement): string {
  return (row.querySelector('.perf-readout__value')?.textContent ?? '').trim();
}

// The panel starts collapsed (the FPS pill only); the metric rows live behind the pill/header toggle.
function expand(fixture: ComponentFixture<PerfReadoutComponent>): void {
  host(fixture).querySelector<HTMLButtonElement>('.perf-readout__pill')?.click();
  fixture.detectChanges();
}

describe('PerfReadoutComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'frenzy-debug': FRENZY_DEBUG } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [FrenzyStorageService, DebugSettingsStore],
    });

    TestBed.overrideComponent(PerfReadoutComponent, {
      remove: { imports: [PerfMetricInfoComponent] },
      add: { imports: [StubPerfMetricInfoComponent] },
    });
  });

  function render(
    overrides: Partial<PerfMetricsSnapshot> = {},
  ): ComponentFixture<PerfReadoutComponent> {
    const fixture = TestBed.createComponent(PerfReadoutComponent);

    fixture.componentRef.setInput('snapshot', sampleSnapshot(overrides));
    fixture.detectChanges();

    return fixture;
  }

  it('starts collapsed (FPS pill only) and expands to one row per metric', () => {
    const fixture = render();

    expect(rows(fixture)).toHaveLength(0);
    expect(host(fixture).querySelector('.perf-readout__pill')).toBeTruthy();

    expand(fixture);

    expect(rows(fixture)).toHaveLength(PERF_METRIC_KEYS.length);
  });

  it('shows the current FPS on the collapsed pill', () => {
    const fixture = render({ fps: 58 });

    expect(host(fixture).querySelector('.perf-readout__pill')?.textContent).toContain('58');
  });

  it('keeps a disabled metric as a dimmed row showing «—» (not dropped)', () => {
    const store = TestBed.inject(DebugSettingsStore);

    store.setMetric('gap', false);

    const fixture = render();

    expand(fixture);

    expect(rows(fixture)).toHaveLength(PERF_METRIC_KEYS.length);

    const gap = rowFor(fixture, 'gap');

    expect(gap.classList.contains('perf-readout__row--off')).toBe(true);
    expect(valueText(gap)).toBe('—');
    expect(gap.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false);
  });

  it('renders a no-data reading (gap/stale < 0) as a bright «—» row, distinct from a disabled one', () => {
    const fixture = render({ gapPx: -1 });

    expand(fixture);

    const gap = rowFor(fixture, 'gap');

    // Enabled but no data yet: NOT dimmed, value «—», and no tone — so it reads differently from an off metric.
    expect(gap.classList.contains('perf-readout__row--off')).toBe(false);
    expect(valueText(gap)).toBe('—');

    const value = gap.querySelector('.perf-readout__value');

    expect(value?.classList.contains('perf-readout__value--warn')).toBe(false);
    expect(value?.classList.contains('perf-readout__value--bad')).toBe(false);
  });

  it('toggles the metric in the store when its checkbox is clicked', () => {
    const store = TestBed.inject(DebugSettingsStore);
    const fixture = render();

    expand(fixture);

    const checkbox = rowFor(fixture, 'gap').querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );

    expect(checkbox?.checked).toBe(true);

    checkbox?.click();
    fixture.detectChanges();

    expect(store.metrics().gap).toBe(false);
    expect(rowFor(fixture, 'gap').classList.contains('perf-readout__row--off')).toBe(true);
  });

  it('colours a degraded reading and leaves a healthy one untoned', () => {
    const fixture = render({ fps: 12, p50Fps: 60 });

    expand(fixture);

    expect(
      rowFor(fixture, 'FPS')
        .querySelector('.perf-readout__value')
        ?.classList.contains('perf-readout__value--bad'),
    ).toBe(true);
    expect(
      rowFor(fixture, 'p50')
        .querySelector('.perf-readout__value')
        ?.classList.contains('perf-readout__value--bad'),
    ).toBe(false);
  });

  it('persists the collapsed state across re-creation', () => {
    const first = render();

    expand(first);

    expect(localStorage.getItem(COLLAPSE_KEY.perfReadout)).toBe('false');

    const second = render();

    expect(rows(second)).toHaveLength(PERF_METRIC_KEYS.length);
  });

  it('does not collapse when a click lands outside the panel (live watch panel)', () => {
    const fixture = render();

    expand(fixture);
    expect(rows(fixture)).toHaveLength(PERF_METRIC_KEYS.length);

    document.body.click();
    fixture.detectChanges();

    expect(rows(fixture)).toHaveLength(PERF_METRIC_KEYS.length);
  });

  it('keeps at most one metric info hint open at a time', () => {
    const fixture = render();

    expand(fixture);

    const infos = fixture.debugElement.queryAll(By.directive(StubPerfMetricInfoComponent));
    const fps = infos[PERF_METRIC_KEYS.indexOf('fps')];
    const gap = infos[PERF_METRIC_KEYS.indexOf('gap')];

    const tap = (info: typeof fps): void => {
      (info.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('.perf-metric-info')
        ?.click();
      fixture.detectChanges();
    };

    tap(fps);
    expect(fps.componentInstance.open()).toBe(true);
    expect(gap.componentInstance.open()).toBe(false);

    tap(gap);
    expect(fps.componentInstance.open()).toBe(false);
    expect(gap.componentInstance.open()).toBe(true);

    tap(gap);
    expect(gap.componentInstance.open()).toBe(false);
  });

  it('closes the open info hint on a click outside it (e.g. the fainted screen)', () => {
    const fixture = render();

    expand(fixture);

    const fps = fixture.debugElement.queryAll(By.directive(StubPerfMetricInfoComponent))[
      PERF_METRIC_KEYS.indexOf('fps')
    ];

    (fps.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.perf-metric-info')
      ?.click();
    fixture.detectChanges();
    expect(fps.componentInstance.open()).toBe(true);

    document.body.click();
    fixture.detectChanges();

    expect(fps.componentInstance.open()).toBe(false);
  });

  it('closes the open info hint when the window loses focus (player left the game)', () => {
    const fixture = render();

    expand(fixture);

    const fps = fixture.debugElement.queryAll(By.directive(StubPerfMetricInfoComponent))[
      PERF_METRIC_KEYS.indexOf('fps')
    ];

    (fps.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.perf-metric-info')
      ?.click();
    fixture.detectChanges();
    expect(fps.componentInstance.open()).toBe(true);

    window.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(fps.componentInstance.open()).toBe(false);
  });

  it('keeps the info affordance on a disabled (dimmed) row', () => {
    const store = TestBed.inject(DebugSettingsStore);

    store.setMetric('gap', false);

    const fixture = render();

    expand(fixture);

    const gap = rowFor(fixture, 'gap');

    expect(gap.classList.contains('perf-readout__row--off')).toBe(true);
    expect(gap.querySelector('.perf-metric-info')).toBeTruthy();
  });
});
