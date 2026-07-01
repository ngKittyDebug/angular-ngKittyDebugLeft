import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';

import { SPRITE_VARIATIONS, STAGE_THEMES } from '../../../data/constants/customization.constants';
import type {
  SpriteVariation,
  StageTheme,
  TamagotchiCustomization,
} from '../../../models/customization.model';

@Component({
  selector: 'left-paw-tamagotchi-appearance-settings',
  imports: [TranslocoDirective, TuiButton],
  templateUrl: './appearance-settings.component.html',
  styleUrl: './appearance-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceSettingsComponent {
  public readonly customization = input.required<TamagotchiCustomization>();
  public readonly customizationChange = output<TamagotchiCustomization>();

  protected readonly spriteVariations = SPRITE_VARIATIONS;
  protected readonly stageThemes = STAGE_THEMES;

  protected onSpriteVariationChange(variation: SpriteVariation): void {
    this.customizationChange.emit({
      ...this.customization(),
      spriteVariation: variation,
    });
  }

  protected onStageThemeChange(theme: StageTheme): void {
    this.customizationChange.emit({
      ...this.customization(),
      stageTheme: theme,
    });
  }
}
