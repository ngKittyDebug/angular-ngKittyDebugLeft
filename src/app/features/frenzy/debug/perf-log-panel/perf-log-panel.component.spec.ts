import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PerfLogPanelComponent } from './perf-log-panel.component';
import { DebugSettingsStore } from '../debug-settings.store';
import type { PerfMetricsSnapshot } from '../perf-metrics';
import { PerfSampleStore } from '../perf-sample.store';
import { FrenzyStorageService } from '../../data/services/frenzy-storage.service';

// Stand-in frenzy-debug perf-log labels matching the production English values the buttons/fields are queried by.
const FRENZY_DEBUG = {
  perfLog: {
    header: 'perf-log',
    fields: { label: 'label', mode: 'mode', everySeconds: 'every (s)', format: 'format', to: 'to' },
    options: {
      manual: 'manual',
      auto: 'auto',
      clipboard: 'clipboard',
      textarea: 'textarea',
      download: 'download',
    },
    actions: { capture: 'capture', export: 'export', clear: 'clear' },
    table: { label: 'label', fps: 'fps', p1: 'p1', jank: 'jank', loop: 'loop' },
  },
};

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

function fieldBefore(
  fixture: ComponentFixture<PerfLogPanelComponent>,
  labelText: string,
): HTMLInputElement | HTMLSelectElement {
  const host = fixture.nativeElement as HTMLElement;
  const field = [...host.querySelectorAll<HTMLLabelElement>('.perf-log__field')].find((label) =>
    (label.textContent ?? '').includes(labelText),
  );
  const control = field?.querySelector<HTMLInputElement | HTMLSelectElement>('input, select');

  if (!control) {
    throw new Error(`no perf-log field labelled "${labelText}"`);
  }

  return control;
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
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: { 'frenzy-debug': FRENZY_DEBUG } },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [FrenzyStorageService, DebugSettingsStore, PerfSampleStore],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('routes the exported text into the readonly textarea when the destination is textarea', () => {
    const settings = TestBed.inject(DebugSettingsStore);

    settings.updatePerfLog({ exportDestination: 'textarea' });

    const fixture = render();

    expand(fixture);
    clickButton(fixture, 'capture');
    fixture.detectChanges();
    clickButton(fixture, 'export');
    fixture.detectChanges();

    const textarea = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
      '.perf-log__textarea',
    );

    expect(textarea?.value.length).toBeGreaterThan(0);
  });

  it('writes a label edit through to the perf-log config', () => {
    const settings = TestBed.inject(DebugSettingsStore);
    const fixture = render();

    expand(fixture);

    const input = fieldBefore(fixture, 'label') as HTMLInputElement;

    input.value = 'lever-x';
    input.dispatchEvent(new Event('input'));

    expect(settings.perfLog().label).toBe('lever-x');
  });

  it('ignores a non-positive capture interval edit, keeping the previous value', () => {
    const settings = TestBed.inject(DebugSettingsStore);
    const fixture = render();

    expand(fixture);

    const input = fieldBefore(fixture, 'every') as HTMLInputElement;

    input.value = '0';
    input.dispatchEvent(new Event('input'));

    expect(settings.perfLog().captureIntervalSeconds).toBe(10);
  });

  it('auto-captures on the configured interval while the mode is auto', () => {
    vi.useFakeTimers();

    const settings = TestBed.inject(DebugSettingsStore);

    settings.updatePerfLog({ captureMode: 'auto', captureIntervalSeconds: 5 });

    const fixture = render();

    expand(fixture);
    expect(rowCount(fixture)).toBe(0);

    vi.advanceTimersByTime(5000);
    fixture.detectChanges();

    expect(rowCount(fixture)).toBe(1);

    fixture.destroy();
  });
});
