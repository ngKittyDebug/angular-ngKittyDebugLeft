import { TestBed } from '@angular/core/testing';

import { ThemeSwithcerService } from './theme-swithcer.service';

describe('ThemeSwithcerService', () => {
  let service: ThemeSwithcerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeSwithcerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
