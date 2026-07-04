import type {
  NotificationModel,
  NotificationPriority,
  StatusAlertType,
} from '../models/notification.model';

interface AlertNotificationTemplate {
  messageKey: string;
  priority: NotificationPriority;
  titleKey: string;
}

const ALERT_TEMPLATES: Record<StatusAlertType, AlertNotificationTemplate> = {
  energyCritical: {
    messageKey: 'alerts.energyCritical.message',
    priority: 'critical',
    titleKey: 'alerts.energyCritical.title',
  },
  energyLow: {
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
    messageKey: 'alerts.hungerCritical.message',
    priority: 'critical',
    titleKey: 'alerts.hungerCritical.title',
  },
  hungerLow: {
    messageKey: 'alerts.hungerLow.message',
    priority: 'warning',
    titleKey: 'alerts.hungerLow.title',
  },
  hydrationCritical: {
    messageKey: 'alerts.hydrationCritical.message',
    priority: 'critical',
    titleKey: 'alerts.hydrationCritical.title',
  },
  hydrationLow: {
    messageKey: 'alerts.hydrationLow.message',
    priority: 'warning',
    titleKey: 'alerts.hydrationLow.title',
  },
  moodCritical: {
    messageKey: 'alerts.moodCritical.message',
    priority: 'critical',
    titleKey: 'alerts.moodCritical.title',
  },
  moodLow: {
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

export function compareNotificationsByPriority(
  left: NotificationModel,
  right: NotificationModel,
): number {
  const priorityDelta = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return right.timestamp - left.timestamp;
}

export function notificationFromStatusAlert(
  alertType: StatusAlertType,
  timestamp: number = Date.now(),
): NotificationModel {
  const template = ALERT_TEMPLATES[alertType];

  return {
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
): NotificationModel {
  return {
    id: createNotificationId(),
    message: pokemonName,
    priority: 'achievement',
    read: false,
    timestamp,
    title: 'evolution.readyTitle',
  };
}

export function sortNotificationsByPriority(
  notifications: NotificationModel[],
): NotificationModel[] {
  return [...notifications].sort(compareNotificationsByPriority);
}
