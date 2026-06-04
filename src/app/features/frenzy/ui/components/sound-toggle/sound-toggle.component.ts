import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiIcon, TuiSlider } from '@taiga-ui/core';
import { TuiSwitch } from '@taiga-ui/kit';

import { SoundSettingsService } from '../../../data/services/sound/sound-settings.service';

@Component({
  selector: 'left-paw-sound-toggle',
  imports: [FormsModule, TranslocoDirective, TuiIcon, TuiSlider, TuiSwitch],
  templateUrl: './sound-toggle.component.html',
  styleUrl: './sound-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoundToggleComponent {
  private readonly settings = inject(SoundSettingsService);

  // Mobile drops the hint tooltip and volume slider — just the on/off switch.
  public readonly compact = input<boolean>(false);

  protected readonly enabled = this.settings.enabled;
  protected readonly volume = this.settings.volume;

  protected setEnabled(value: boolean): void {
    this.settings.setEnabled(value);
  }

  protected setVolume(value: number): void {
    this.settings.setVolume(value);
  }
}
