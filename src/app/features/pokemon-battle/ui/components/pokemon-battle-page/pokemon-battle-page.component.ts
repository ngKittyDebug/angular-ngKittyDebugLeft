import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonBattleStore } from '../../../data/store/pokemon-battle.store';
import { AudioManagerService } from '../../../data/services/audio-manager.service';
import { PokemonTeamSelectionComponent } from './pokemon-team-selection/pokemon-team-selection.component';
import { PokemonBattleArenaComponent } from './pokemon-battle-arena/pokemon-battle-arena.component';

@Component({
  selector: 'left-paw-pokemon-battle-page',
  imports: [CommonModule, PokemonTeamSelectionComponent, PokemonBattleArenaComponent],
  templateUrl: './pokemon-battle-page.component.html',
  styleUrl: './pokemon-battle-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokemonBattlePageComponent {
  private readonly store = inject(PokemonBattleStore);
  private readonly audioManager = inject(AudioManagerService);

  // Expose store state for template
  public readonly battleStarted = this.store.battleStarted;

  // Expose AudioManager state for template
  public readonly soundEnabled = this.audioManager.enabled;
  public readonly soundVolume = this.audioManager.volume;
  public readonly soundVolumePercent = computed(() => Math.round(this.soundVolume() * 100));

  public toggleMute(): void {
    this.audioManager.toggle();
  }

  public onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input) {
      this.audioManager.setVolume(Number.parseFloat(input.value));
    }
  }
}
