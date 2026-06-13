import type { MockedObject } from 'vitest';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import type { MainCatalogFacade } from './main-catalog.facade';

export const mainCatalogFacadeMock = {
  currentPage: signal<number>(0),
  pagesCount: signal<number>(2),
  isLoadingPokemonPaginationData: signal<boolean>(false),
  paginatedPokemonList: signal<[]>([]),
  filterByName: signal<string>(''),
  filterByTypes: signal<string[]>([]),
  filterByGenerations: signal<string[]>([]),
  setPaginationCount: vi.fn(),
  typeList: signal<string[] | undefined>(undefined),
  generationList: signal<string[] | undefined>(undefined),
} as const satisfies MockedObject<Partial<MainCatalogFacade>>;
