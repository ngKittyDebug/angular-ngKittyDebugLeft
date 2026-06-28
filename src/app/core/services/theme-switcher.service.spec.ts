import { TestBed } from '@angular/core/testing';
import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { vi } from 'vitest';

import { ThemeSwitcherService } from './theme-switcher.service';

describe('ThemeSwitcherService', () => {
  let service: ThemeSwitcherService;
  let darkModeSignalMock: WritableSignal<boolean>;

  beforeEach(() => {
    darkModeSignalMock = signal(false);

    TestBed.configureTestingModule({
      providers: [
        ThemeSwitcherService,
        {
          provide: TUI_DARK_MODE,
          useValue: darkModeSignalMock,
        },
      ],
    });

    service = TestBed.inject(ThemeSwitcherService);
  });

  it('должен инициализироваться', () => {
    expect(service).toBeTruthy();
  });

  describe('Иконка темы (themeIcon)', () => {
    it('должен возвращать иконку солнца, если темная тема выключена', () => {
      darkModeSignalMock.set(false);

      expect(service.themeIcon()).toBe('@tui.sun');
    });

    it('должен возвращать иконку луны, если темная тема включена', () => {
      darkModeSignalMock.set(true);

      expect(service.themeIcon()).toBe('@tui.moon');
    });
  });

  describe('Переключение темы (toggleTheme)', () => {
    it('должен включить темную тему, если она была выключена', () => {
      darkModeSignalMock.set(false);

      service.toggleTheme();

      expect(darkModeSignalMock()).toBe(true);
    });

    it('должен выключить темную тему, если она была включена', () => {
      darkModeSignalMock.set(true);

      service.toggleTheme();

      expect(darkModeSignalMock()).toBe(false);
    });

    it('должен вызвать метод set у сигнала с инвертированным значением', () => {
      darkModeSignalMock.set(false);
      const setSpy = vi.spyOn(darkModeSignalMock, 'set');

      service.toggleTheme();

      expect(setSpy).toHaveBeenNthCalledWith(1, true);
    });
  });
});
