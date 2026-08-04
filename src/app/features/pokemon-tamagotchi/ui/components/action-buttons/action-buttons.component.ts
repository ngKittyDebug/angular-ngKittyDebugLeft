import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiHint } from '@taiga-ui/core';
import type { ActionCooldownsModel, ActionType } from '../../../data/models/tamagotchi-state.model';

export interface ActionButtonViewModel {
  action: ActionType;
  cooldownSeconds: number | null;
  disabled: boolean;
  disabledReasonKey: string | null;
  icon: string;
  labelKey: string;
}

@Component({
  selector: 'left-paw-action-buttons',
  imports: [TranslocoDirective, TuiButton, TuiHint],
  templateUrl: './action-buttons.component.html',
  styleUrl: './action-buttons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonsComponent {
  private readonly actionMeta: Record<
    ActionType,
    { canInput: () => boolean; icon: string; labelKey: string }
  > = {
    care: {
      canInput: () => this.canCare(),
      icon: '@tui.heart',
      labelKey: 'care',
    },
    feed: {
      canInput: () => this.canFeed(),
      icon: '@tui.star',
      labelKey: 'feed',
    },
    play: {
      canInput: () => this.canPlay(),
      icon: '@tui.smile',
      labelKey: 'play',
    },
    sleep: {
      canInput: () => true,
      icon: '@tui.moon',
      labelKey: 'sleep',
    },
    train: {
      canInput: () => this.canTrain(),
      icon: '@tui.trophy',
      labelKey: 'train',
    },
    water: {
      canInput: () => this.canWater(),
      icon: '@tui.droplet',
      labelKey: 'water',
    },
  };

  public readonly actionsLocked = input<boolean>(false);
  public readonly canCare = input<boolean>(true);
  public readonly canFeed = input<boolean>(true);
  public readonly canPlay = input<boolean>(true);
  public readonly canTrain = input<boolean>(true);
  public readonly canWater = input<boolean>(true);
  public readonly cooldowns = input.required<ActionCooldownsModel>();
  public readonly isSleeping = input<boolean>(false);

  public readonly actionSelected = output<ActionType>();

  protected readonly buttonList = computed<ActionButtonViewModel[]>(() => {
    const sleeping = this.isSleeping();
    const locked = this.actionsLocked();
    const cooldowns = this.cooldowns();
    const awakeActionList: ActionType[] = ['feed', 'water', 'care', 'play', 'train'];

    if (sleeping) {
      return [
        this.buildButton(
          'sleep',
          cooldowns.sleep,
          locked,
          locked ? 'disabledTraining' : null,
          'wakeUp',
        ),
      ];
    }

    return [
      ...awakeActionList.map((action) => this.buildAwakeButton(action, cooldowns, locked)),
      this.buildButton(
        'sleep',
        cooldowns.sleep,
        locked,
        locked ? 'disabledTraining' : null,
        'sleep',
      ),
    ];
  });

  protected onAction(action: ActionType, unavailable = false): void {
    if (unavailable) {
      return;
    }

    this.actionSelected.emit(action);
  }

  private buildAwakeButton(
    action: ActionType,
    cooldowns: ActionCooldownsModel,
    actionsLocked: boolean,
  ): ActionButtonViewModel {
    const meta = this.actionMeta[action];
    const cooldownMs = cooldowns[action];
    const cooldownSeconds = cooldownMs ? Math.ceil(cooldownMs / 1000) : null;
    const onCooldown = cooldownSeconds !== null && cooldownSeconds > 0;
    const blockedByTraining = actionsLocked && action !== 'play';
    const allowed = meta.canInput() && !onCooldown && !blockedByTraining;

    let disabledReasonKey: string | null = null;

    if (blockedByTraining) {
      disabledReasonKey = 'disabledTraining';
    } else if (onCooldown) {
      disabledReasonKey = 'disabledCooldown';
    } else if (!meta.canInput()) {
      disabledReasonKey = 'disabledLowEnergy';
    }

    return this.buildButton(
      action,
      cooldownMs,
      !allowed,
      disabledReasonKey,
      meta.labelKey,
      meta.icon,
    );
  }

  private buildButton(
    action: ActionType,
    cooldownMs: number | null,
    disabled: boolean,
    disabledReasonKey: string | null,
    labelKey: string,
    icon?: string,
  ): ActionButtonViewModel {
    const meta = this.actionMeta[action];
    const cooldownSeconds = cooldownMs ? Math.ceil(cooldownMs / 1000) : null;

    return {
      action,
      cooldownSeconds: cooldownSeconds && cooldownSeconds > 0 ? cooldownSeconds : null,
      disabled,
      disabledReasonKey,
      icon: icon ?? meta.icon,
      labelKey,
    };
  }
}
