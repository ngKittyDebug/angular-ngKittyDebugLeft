import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { AvailableLangs } from '@jsverse/transloco';
import { TranslocoService } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import { LanguageSwitcherService } from './language-switcher.service';

interface SetupOptions {
  availableLangs?: AvailableLangs;
  activeLang?: string;
}

function createService(options: SetupOptions = {}) {
  const setActiveLangSpy = vi.fn();
  const activeLangSignal = signal(options.activeLang ?? 'ru');

  const translocoMock: Partial<TranslocoService> = {
    getAvailableLangs: () => options.availableLangs ?? ['ru', 'en'],
    setActiveLang: setActiveLangSpy,
    activeLang: activeLangSignal,
  };

  TestBed.configureTestingModule({
    providers: [LanguageSwitcherService, { provide: TranslocoService, useValue: translocoMock }],
  });

  return {
    service: TestBed.inject(LanguageSwitcherService),
    setActiveLangSpy,
    activeLangSignal,
  };
}

describe('LanguageSwitcherService', () => {
  it('должен инициализироваться', () => {
    const { service } = createService();

    expect(service).toBeTruthy();
  });

  it('должен отдавать список доступных языков из строкового массива', () => {
    const { service } = createService({ availableLangs: ['ru', 'en'] });

    expect(service.languages).toEqual(['ru', 'en']);
  });

  it('должен извлекать id, если языки заданы объектами', () => {
    const { service } = createService({
      availableLangs: [
        { id: 'ru', label: 'Русский' },
        { id: 'en', label: 'English' },
      ],
    });

    expect(service.languages).toEqual(['ru', 'en']);
  });

  it('должен возвращать активный язык из TranslocoService', () => {
    const { service } = createService({ activeLang: 'en' });

    expect(service.currentLanguage()).toBe('en');
  });

  it('должен вызывать setActiveLang с переданным языком при переключении', () => {
    const { service, setActiveLangSpy } = createService();

    service.languageSwitch('en');

    expect(setActiveLangSpy).toHaveBeenCalledWith('en');
  });
});
