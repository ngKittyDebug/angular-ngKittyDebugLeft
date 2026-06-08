import { TestBed } from '@angular/core/testing';

import { ThemeSwitcherService } from './theme-switcher.service';

describe('ThemeSwitcherService', () => {
  let service: ThemeSwitcherService;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {
          /* empty */
        },
        removeListener: () => {
          /* empty */
        },
        addEventListener: () => {
          /* empty */
        },
        removeEventListener: () => {
          /* empty */
        },
        dispatchEvent: () => false,
      }),
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeSwitcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
