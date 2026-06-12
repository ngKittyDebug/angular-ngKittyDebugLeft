// The three seaweed/coral silhouettes of the aquarium flora — one source of truth shared by the backdrop
// (`AquariumDecorComponent`, full-size and swaying) and the minimap (scaled-down and static), so both draw
// identical shapes. `coral` marks the branchier third shape, which the scene renders slightly faded.
export interface KelpBlade {
  viewBox: string;
  path: string;
  coral: boolean;
}

export const KELP_BLADES: readonly KelpBlade[] = [
  {
    viewBox: '0 0 60 160',
    coral: false,
    path: 'M30 160 C 10 122 44 94 24 62 C 16 46 34 38 30 2 C 40 30 44 82 36 116 C 50 132 22 146 30 160 Z',
  },
  {
    viewBox: '0 0 60 160',
    coral: false,
    path: 'M30 160 C 48 124 18 96 36 64 C 46 48 28 40 32 4 C 22 30 18 84 28 118 C 14 134 42 146 30 160 Z',
  },
  {
    viewBox: '0 0 60 160',
    coral: true,
    path: 'M30 160 C 30 120 8 112 12 72 C 4 94 0 62 14 58 C 8 42 24 50 26 80 C 30 62 34 62 34 86 C 38 52 54 58 48 78 C 60 66 56 98 46 98 C 52 124 30 124 30 160 Z',
  },
];

// Plant tints (theme-scoped vars from aquarium-theme.scss). Cycled in lockstep with KELP_BLADES by `index % 3`,
// so a given silhouette always wears the same colour in both the scene and the minimap.
export const KELP_COLORS = ['var(--aq-plant-a)', 'var(--aq-plant-b)', 'var(--aq-plant-c)'];
