import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { STATUS_THRESHOLDS } from '../../../data/constants/status-thresholds.constants';
import type { StatusType } from '../../../data/models/pokemon-status.model';
import { StatusIndicatorComponent } from './status-indicator.component';

function createFixture(
  inputs: { currentValue: number; statusType: StatusType } = {
    currentValue: 80,
    statusType: 'hunger',
  },
): ComponentFixture<StatusIndicatorComponent> {
  TestBed.configureTestingModule({
    imports: [
      StatusIndicatorComponent,
      TranslocoTestingModule.forRoot({
        langs: {
          en: {
            pokemonTamagotchi: {
              status: {
                health: 'Health',
                hunger: 'Hunger',
                mood: 'Mood',
                energy: 'Energy',
                hydration: 'Hydration',
                experience: 'Experience',
                tooltip: '{{label}}: {{value}} / {{max}}',
                levelTooltip: 'Level {{level}} · {{experience}} XP',
                warningBadge: 'Warning',
                criticalBadge: 'Critical',
                alertWarning: '{{label}}: {{value}} / {{max}} — warning',
                alertCritical: '{{label}}: {{value}} / {{max}} — critical',
              },
            },
          },
        },
        translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
      }),
    ],
  });

  const fixture = TestBed.createComponent(StatusIndicatorComponent);

  fixture.componentRef.setInput('statusType', inputs.statusType);
  fixture.componentRef.setInput('currentValue', inputs.currentValue);
  fixture.componentRef.setInput('thresholds', STATUS_THRESHOLDS);
  fixture.detectChanges();

  return fixture;
}

function indicatorRoot(fixture: ComponentFixture<StatusIndicatorComponent>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector('.status-indicator') as HTMLElement;
}

describe('StatusIndicatorComponent', () => {
  describe('Happy Path', () => {
    it('должен создаваться', () => {
      expect(createFixture().componentInstance).toBeTruthy();
    });

    it('должен отображать переведённую метку статуса и числовое значение', () => {
      const element = createFixture({ currentValue: 72, statusType: 'mood' })
        .nativeElement as HTMLElement;

      expect(element.querySelector('.status-indicator__label')?.textContent?.trim()).toBe('Mood');
      expect(element.querySelector('.status-indicator__value')?.textContent?.trim()).toBe(
        '72 / 100',
      );
    });

    it('должен отображать видимый progress bar', () => {
      const element = createFixture({ currentValue: 72, statusType: 'hunger' })
        .nativeElement as HTMLElement;
      const bar = element.querySelector('progress[tuiProgressBar]') as HTMLProgressElement | null;

      expect(bar).toBeTruthy();
      expect(bar?.value).toBe(72);
      expect(bar?.max).toBe(100);
    });

    it('должен отображать опыт без значков предупреждения', () => {
      const fixture = createFixture({ currentValue: 5, statusType: 'experience' });
      const root = indicatorRoot(fixture);

      expect(root.classList.contains('status-indicator--warning')).toBe(false);
      expect(root.classList.contains('status-indicator--critical')).toBe(false);
      expect(root.querySelector('.status-indicator__badge')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('не должен применять alert-классы, когда значение выше порога warning', () => {
      const fixture = createFixture({ currentValue: 50, statusType: 'hunger' });
      const root = indicatorRoot(fixture);

      expect(root.classList.contains('status-indicator--warning')).toBe(false);
      expect(root.classList.contains('status-indicator--critical')).toBe(false);
      expect(root.querySelector('.status-indicator__badge')).toBeNull();
    });

    it('должен применять warning-стили, когда значение достигает порога warning', () => {
      const fixture = createFixture({
        currentValue: STATUS_THRESHOLDS.hungerWarning,
        statusType: 'hunger',
      });
      const root = indicatorRoot(fixture);
      const badge = root.querySelector('.status-indicator__badge') as HTMLElement;

      expect(root.classList.contains('status-indicator--warning')).toBe(true);
      expect(root.classList.contains('status-indicator--critical')).toBe(false);
      expect(badge.textContent?.trim()).toBe('!');
      expect(badge.getAttribute('aria-label')).toBe('Warning');
      expect(root.getAttribute('aria-label')).toBe(
        `Hunger: ${STATUS_THRESHOLDS.hungerWarning} / 100 — warning`,
      );
    });

    it('должен анонсировать переход в warning через live-region', () => {
      const fixture = createFixture({
        currentValue: STATUS_THRESHOLDS.hungerWarning + 1,
        statusType: 'hunger',
      });

      fixture.componentRef.setInput('currentValue', STATUS_THRESHOLDS.hungerWarning);
      fixture.detectChanges();

      const live = indicatorRoot(fixture).querySelector('.status-indicator__live') as HTMLElement;

      expect(live.getAttribute('aria-live')).toBe('polite');
      expect(live.textContent?.trim()).toBe(
        `Hunger: ${STATUS_THRESHOLDS.hungerWarning} / 100 — warning`,
      );
    });

    it('должен применять critical-стили, когда значение достигает порога critical', () => {
      const fixture = createFixture({
        currentValue: STATUS_THRESHOLDS.energyCritical,
        statusType: 'energy',
      });
      const root = indicatorRoot(fixture);
      const badge = root.querySelector('.status-indicator__badge') as HTMLElement;

      expect(root.classList.contains('status-indicator--critical')).toBe(true);
      expect(root.classList.contains('status-indicator--warning')).toBe(false);
      expect(badge.textContent?.trim()).toBe('!!');
      expect(badge.getAttribute('aria-label')).toBe('Critical');
      expect(root.getAttribute('aria-label')).toBe(
        `Energy: ${STATUS_THRESHOLDS.energyCritical} / 100 — critical`,
      );
    });

    it('должен анонсировать переход в critical через assertive live-region', () => {
      const fixture = createFixture({
        currentValue: STATUS_THRESHOLDS.energyCritical + 1,
        statusType: 'energy',
      });

      fixture.componentRef.setInput('currentValue', STATUS_THRESHOLDS.energyCritical);
      fixture.detectChanges();

      const live = indicatorRoot(fixture).querySelector('.status-indicator__live') as HTMLElement;

      expect(live.getAttribute('aria-live')).toBe('assertive');
      expect(live.textContent?.trim()).toBe(
        `Energy: ${STATUS_THRESHOLDS.energyCritical} / 100 — critical`,
      );
    });
  });
});
