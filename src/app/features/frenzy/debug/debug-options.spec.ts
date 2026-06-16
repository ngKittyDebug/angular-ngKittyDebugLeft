import { convertToParamMap, type Params } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { parseDebugFlags } from './debug-options';

function flagsFor(parameters: Params): ReturnType<typeof parseDebugFlags> {
  return parseDebugFlags(convertToParamMap(parameters));
}

describe('parseDebugFlags', () => {
  it('returns everything off when the debug param is absent', () => {
    expect(flagsFor({})).toEqual({
      pokemonBorders: false,
      itemBorders: false,
      speed: false,
      perf: false,
    });
  });

  it('turns everything on for a bare ?debug (empty value)', () => {
    expect(flagsFor({ debug: '' })).toEqual({
      pokemonBorders: true,
      itemBorders: true,
      speed: true,
      perf: true,
    });
  });

  it('enables only the named category', () => {
    expect(flagsFor({ debug: 'speed' })).toEqual({
      pokemonBorders: false,
      itemBorders: false,
      speed: true,
      perf: false,
    });
  });

  it('enables only the perf readout', () => {
    expect(flagsFor({ debug: 'perf' })).toEqual({
      pokemonBorders: false,
      itemBorders: false,
      speed: false,
      perf: true,
    });
  });

  it('combines categories from a comma-separated value', () => {
    expect(flagsFor({ debug: 'pokemon-borders,speed' })).toEqual({
      pokemonBorders: true,
      itemBorders: false,
      speed: true,
      perf: false,
    });
  });

  it('combines categories from a repeated param', () => {
    expect(flagsFor({ debug: ['pokemon-borders', 'item-borders'] })).toEqual({
      pokemonBorders: true,
      itemBorders: true,
      speed: false,
      perf: false,
    });
  });

  it('tolerates whitespace and ignores unknown slugs', () => {
    expect(flagsFor({ debug: ' item-borders , bogus ' })).toEqual({
      pokemonBorders: false,
      itemBorders: true,
      speed: false,
      perf: false,
    });
  });
});
