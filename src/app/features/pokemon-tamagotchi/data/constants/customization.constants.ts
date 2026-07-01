import type {
  SpriteVariation,
  StageTheme,
  TamagotchiCustomization,
} from '../../models/customization.model';

export const DEFAULT_CUSTOMIZATION: TamagotchiCustomization = {
  spriteVariation: 'default',
  stageTheme: 'classic',
};

export const SPRITE_VARIATIONS: SpriteVariation[] = ['default', 'shiny', 'retro'];

export const STAGE_THEMES: StageTheme[] = ['classic', 'meadow', 'night'];

export const STAGE_THEME_CLASS: Record<StageTheme, string> = {
  classic: 'tamagotchi-stage--classic',
  meadow: 'tamagotchi-stage--meadow',
  night: 'tamagotchi-stage--night',
};
