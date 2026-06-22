import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import { PerfMetricInfoComponent } from './perf-metric-info.component';

const FRENZY_DEBUG = {
  infoAriaLabel: 'Details: {{metric}}',
  sections: { what: 'What', why: 'Why', interpret: 'How to read' },
  metrics: {
    fps: {
      label: 'FPS',
      name: 'Frames per second',
      what: 'EMA frames per second',
      why: 'headline smoothness',
      interpret: 'higher is smoother',
    },
  },
};

function render(): ComponentFixture<PerfMetricInfoComponent> {
  TestBed.configureTestingModule({
    imports: [
      PerfMetricInfoComponent,
      TranslocoTestingModule.forRoot({
        langs: { en: { 'frenzy-debug': FRENZY_DEBUG } },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
  });

  const fixture = TestBed.createComponent(PerfMetricInfoComponent);

  fixture.componentRef.setInput('key', 'fps');
  fixture.detectChanges();

  return fixture;
}

function button(fixture: ComponentFixture<PerfMetricInfoComponent>): HTMLButtonElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    '.perf-metric-info',
  )!;
}

describe('PerfMetricInfoComponent', () => {
  it('renders the @tui.info icon affordance with a localized, metric-aware aria-label', () => {
    const fixture = render();
    const trigger = button(fixture);

    expect(trigger).toBeTruthy();
    expect(trigger.querySelector('tui-icon')).toBeTruthy();
    // Proves the i18n + per-metric key wiring: the aria-label folds in the metric's own label.
    expect(trigger.getAttribute('aria-label')).toBe('Details: FPS');
  });

  it('emits toggled when the icon is tapped, without self-managing open state', () => {
    const fixture = render();
    const onToggled = vi.fn();

    fixture.componentInstance.toggled.subscribe(onToggled);

    button(fixture).click();

    expect(onToggled).toHaveBeenCalledTimes(1);
  });
});
