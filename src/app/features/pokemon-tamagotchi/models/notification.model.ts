import type { ActionType } from './tamagotchi-state.model';

export type NotificationPriority = 'info' | 'warning' | 'critical' | 'achievement';

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
  action?: {
    type: ActionType;
    label: string;
  };
}

export type StatusAlertType =
  | 'hungerLow'
  | 'hungerCritical'
  | 'moodLow'
  | 'moodCritical'
  | 'energyLow'
  | 'energyCritical'
  | 'hydrationLow'
  | 'hydrationCritical'
  | 'evolutionReady';
