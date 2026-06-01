import type { Line } from './types';

export interface LineMetadata {
  id: Line;
  label: string;
}

export const LINES: readonly LineMetadata[] = [
  { id: 'caterpie', label: 'Caterpie' },
  { id: 'magikarp', label: 'Magikarp' },
  { id: 'pidgey', label: 'Pidgey' },
  { id: 'bulbasaur', label: 'Bulbasaur' },
  { id: 'charmander', label: 'Charmander' },
  { id: 'squirtle', label: 'Squirtle' },
];

const VALID_LINE_IDS = new Set<Line>(LINES.map((line) => line.id));

export function isLine(value: unknown): value is Line {
  return typeof value === 'string' && VALID_LINE_IDS.has(value as Line);
}
