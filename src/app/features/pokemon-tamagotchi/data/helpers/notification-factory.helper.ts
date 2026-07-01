import type { Achievement } from '../../models/achievement.model';
import type {
  Notification,
  NotificationPriority,
  StatusAlertType,
} from '../../models/notification.model';
import type { ActionType } from '../../models/tamagotchi-state.model';

interface AlertNotificationTemplate {
  action?: ActionType;
  messageKey: string;
  priority: NotificationPriority;
  titleKey: string;
}

const ALERT_TEMPLATES: Record<StatusAlertType, AlertNotificationTemplate> = {
  energyCritical: {
    action: 'sleep',
    messageKey: 'alerts.energyCritical.message',
    priority: 'critical',
    titleKey: 'alerts.energyCritical.title',
  },
  energyLow: {
    action: 'sleep',
    messageKey: 'alerts.energyLow.message',
    priority: 'warning',
    titleKey: 'alerts.energyLow.title',
  },
  evolutionReady: {
    messageKey: 'alerts.evolutionReady.message',
    priority: 'achievement',
    titleKey: 'alerts.evolutionReady.title',
  },
  hungerCritical: {
    action: 'feed',
    messageKey: 'alerts.hungerCritical.message',
    priority: 'critical',
    titleKey: 'alerts.hungerCritical.title',
  },
  hungerLow: {
    action: 'feed',
    messageKey: 'alerts.hungerLow.message',
    priority: 'warning',
    titleKey: 'alerts.hungerLow.title',
  },
  hydrationCritical: {
    action: 'water',
    messageKey: 'alerts.hydrationCritical.message',
    priority: 'critical',
    titleKey: 'alerts.hydrationCritical.title',
  },
  hydrationLow: {
    action: 'water',
    messageKey: 'alerts.hydrationLow.message',
    priority: 'warning',
    titleKey: 'alerts.hydrationLow.title',
  },
  moodCritical: {
    action: 'care',
    messageKey: 'alerts.moodCritical.message',
    priority: 'critical',
    titleKey: 'alerts.moodCritical.title',
  },
  moodLow: {
    action: 'care',
    messageKey: 'alerts.moodLow.message',
    priority: 'warning',
    titleKey: 'alerts.moodLow.title',
  },
};

const PRIORITY_RANK: Record<NotificationPriority, number> = {
  achievement: 2,
  critical: 0,
  info: 3,
  warning: 1,
};

export function createNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function compareNotificationsByPriority(left: Notification, right: Notification): number {
  const priorityDelta = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return right.timestamp - left.timestamp;
}

export function notificationFromStatusAlert(
  alertType: StatusAlertType,
  timestamp: number = Date.now(),
): Notification {
  const template = ALERT_TEMPLATES[alertType];

  return {
    action: template.action
      ? {
          label: template.action,
          type: template.action,
        }
      : undefined,
    id: createNotificationId(),
    message: template.messageKey,
    priority: template.priority,
    read: false,
    timestamp,
    title: template.titleKey,
  };
}

export function notificationFromEvolutionReady(
  pokemonName: string,
  timestamp: number = Date.now(),
): Notification {
  return {
    id: createNotificationId(),
    message: pokemonName,
    priority: 'achievement',
    read: false,
    timestamp,
    title: 'evolution.readyTitle',
  };
}

export function notificationFromAchievement(
  achievement: Achievement,
  timestamp: number = Date.now(),
): Notification {
  return {
    id: createNotificationId(),
    message: achievement.description,
    priority: 'achievement',
    read: false,
    timestamp,
    title: achievement.name,
  };
}

export function sortNotificationsByPriority(notifications: Notification[]): Notification[] {
  return [...notifications].sort(compareNotificationsByPriority);
}
