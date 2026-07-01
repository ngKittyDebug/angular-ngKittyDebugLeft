export type SpriteVariation = 'default' | 'retro' | 'shiny';

export type StageTheme = 'classic' | 'meadow' | 'night';

export interface TamagotchiCustomization {
  spriteVariation: SpriteVariation;
  stageTheme: StageTheme;
}
