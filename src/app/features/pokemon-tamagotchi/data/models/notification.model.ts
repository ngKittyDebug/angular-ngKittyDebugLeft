export type NotificationPriority = 'info' | 'warning' | 'critical' | 'achievement';

export type NotificationText =
  | {
      kind: 'plainText';
      text: string;
    }
  | {
      key: string;
      kind: 'translationKey';
    };

export interface NotificationModel {
  id: string;
  title: NotificationText;
  message: NotificationText;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
}

export type StatusAlertType =
  | 'hungerLow'
  | 'hungerCritical'
  | 'moodLow'
  | 'moodCritical'
  | 'energyLow'
  | 'energyCritical'
  | 'hydrationLow'
  | 'hydrationCritical';
