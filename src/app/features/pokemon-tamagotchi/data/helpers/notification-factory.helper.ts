import type {
  NotificationModel,
  NotificationPriority,
  NotificationText,
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

function createNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function notificationPlainText(text: string): NotificationText {
  return { kind: 'plainText', text };
}

function notificationTranslationKey(key: string): NotificationText {
  return { key, kind: 'translationKey' };
}

export function notificationFromStatusAlert(
  alertType: StatusAlertType,
  timestamp: number = Date.now(),
): NotificationModel {
  const template = ALERT_TEMPLATES[alertType];

  return {
    id: createNotificationId(),
    message: notificationTranslationKey(template.messageKey),
    priority: template.priority,
    read: false,
    timestamp,
    title: notificationTranslationKey(template.titleKey),
  };
}

export function notificationFromEvolutionReady(
  pokemonName: string,
  timestamp: number = Date.now(),
): NotificationModel {
  return {
    id: createNotificationId(),
    message: notificationPlainText(pokemonName),
    priority: 'achievement',
    read: false,
    timestamp,
    title: notificationTranslationKey('evolution.readyTitle'),
  };
}
