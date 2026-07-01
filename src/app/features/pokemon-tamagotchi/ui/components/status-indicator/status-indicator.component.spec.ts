import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';
import { STATUS_THRESHOLDS } from '../../../data/constants/status-thresholds.constants';
import type { StatusType } from '../../../models/pokemon-status.model';
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
  it('should create', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('renders the translated status label and numeric value', () => {
    const element = createFixture({ currentValue: 72, statusType: 'mood' })
      .nativeElement as HTMLElement;

    expect(element.querySelector('.status-indicator__label')?.textContent?.trim()).toBe('Mood');
    expect(element.querySelector('.status-indicator__value')?.textContent?.trim()).toBe('72 / 100');
  });

  it('renders a visible progress bar', () => {
    const element = createFixture({ currentValue: 72, statusType: 'hunger' })
      .nativeElement as HTMLElement;
    const bar = element.querySelector('progress[tuiProgressBar]') as HTMLProgressElement | null;

    expect(bar).toBeTruthy();
    expect(bar?.value).toBe(72);
    expect(bar?.max).toBe(100);
  });

  it('does not apply alert classes when the value is above warning threshold', () => {
    const fixture = createFixture({ currentValue: 50, statusType: 'hunger' });
    const root = indicatorRoot(fixture);

    expect(root.classList.contains('status-indicator--warning')).toBe(false);
    expect(root.classList.contains('status-indicator--critical')).toBe(false);
    expect(root.querySelector('.status-indicator__badge')).toBeNull();
  });

  it('applies warning styling when the value reaches the warning threshold', () => {
    const fixture = createFixture({
      currentValue: STATUS_THRESHOLDS.hungerWarning,
      statusType: 'hunger',
    });
    const root = indicatorRoot(fixture);

    expect(root.classList.contains('status-indicator--warning')).toBe(true);
    expect(root.classList.contains('status-indicator--critical')).toBe(false);
    expect(root.querySelector('.status-indicator__badge')?.textContent?.trim()).toBe('!');
  });

  it('applies critical styling when the value reaches the critical threshold', () => {
    const fixture = createFixture({
      currentValue: STATUS_THRESHOLDS.energyCritical,
      statusType: 'energy',
    });
    const root = indicatorRoot(fixture);

    expect(root.classList.contains('status-indicator--critical')).toBe(true);
    expect(root.classList.contains('status-indicator--warning')).toBe(false);
    expect(root.querySelector('.status-indicator__badge')?.textContent?.trim()).toBe('!!');
  });

  it('renders experience without threshold alert badges', () => {
    const fixture = createFixture({ currentValue: 5, statusType: 'experience' });
    const root = indicatorRoot(fixture);

    expect(root.classList.contains('status-indicator--warning')).toBe(false);
    expect(root.classList.contains('status-indicator--critical')).toBe(false);
    expect(root.querySelector('.status-indicator__badge')).toBeNull();
  });
});
