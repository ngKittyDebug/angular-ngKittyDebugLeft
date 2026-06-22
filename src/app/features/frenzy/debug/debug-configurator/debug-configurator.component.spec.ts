import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DebugConfiguratorComponent } from './debug-configurator.component';
import { DebugSettingsStore } from '../debug-settings.store';
import { FrenzyStorageService } from '../../data/services/frenzy-storage.service';

function host(fixture: ComponentFixture<DebugConfiguratorComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function chipsUnder(
  fixture: ComponentFixture<DebugConfiguratorComponent>,
  title: string,
): HTMLButtonElement[] {
  const titles = [...host(fixture).querySelectorAll<HTMLElement>('.debug-configurator__title')];
  const heading = titles.find((element) => (element.textContent ?? '').trim() === title);

  if (heading === undefined) {
    throw new Error(`no configurator section titled "${title}"`);
  }

  const chips = heading.nextElementSibling;

  return [...(chips?.querySelectorAll<HTMLButtonElement>('.debug-configurator__chip') ?? [])];
}

function labels(chips: HTMLButtonElement[]): string[] {
  return chips.map((chip) => (chip.textContent ?? '').trim());
}

function expand(fixture: ComponentFixture<DebugConfiguratorComponent>): void {
  host(fixture).querySelector<HTMLButtonElement>('.debug-configurator__header')?.click();
  fixture.detectChanges();
}

describe('DebugConfiguratorComponent', () => {
  let fixture: ComponentFixture<DebugConfiguratorComponent>;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [FrenzyStorageService, DebugSettingsStore],
    });

    fixture = TestBed.createComponent(DebugConfiguratorComponent);
    fixture.detectChanges();
  });

  it('starts collapsed, showing only the header bar and no control chips', () => {
    expect(host(fixture).querySelector('.debug-configurator__title')).toBeNull();
    expect(
      host(fixture).querySelector('.debug-configurator__header')?.getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('reveals the control sections once the header is clicked', () => {
    expand(fixture);

    expect(
      host(fixture).querySelector('.debug-configurator__header')?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(host(fixture).querySelectorAll('.debug-configurator__title').length).toBeGreaterThan(0);
  });

  it('labels the DPR caps as native / 1× / 1.5×', () => {
    expand(fixture);

    expect(labels(chipsUnder(fixture, 'canvas dpr'))).toEqual(['native', '1×', '1.5×']);
  });

  it('labels the frame caps as off / 20 / 24 / 30', () => {
    expand(fixture);

    expect(labels(chipsUnder(fixture, 'frame cap'))).toEqual(['off', '20', '24', '30']);
  });

  it('hides the DPR section when no render backend is on canvas', () => {
    const store = TestBed.inject(DebugSettingsStore);

    store.setDecorMode('dom');
    expand(fixture);

    expect(
      [...host(fixture).querySelectorAll<HTMLElement>('.debug-configurator__title')].some(
        (element) => (element.textContent ?? '').trim() === 'canvas dpr',
      ),
    ).toBe(false);
  });

  it('writes the chosen frame cap through to the store on a chip click', () => {
    const store = TestBed.inject(DebugSettingsStore);

    expand(fixture);
    chipsUnder(fixture, 'frame cap')[2].click();
    fixture.detectChanges();

    expect(store.frameCapFps()).toBe(24);
  });

  it('marks the active render-mode chip', () => {
    const store = TestBed.inject(DebugSettingsStore);

    store.setRenderMode('canvas');
    expand(fixture);

    const active = chipsUnder(fixture, 'render').filter((chip) =>
      chip.classList.contains('debug-configurator__chip--active'),
    );

    expect(labels(active)).toEqual(['canvas']);
  });
});
