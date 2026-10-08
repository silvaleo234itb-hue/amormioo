import { AppNotification } from '../types/letter';
import { romanticAudio } from './audio';

const NOTIFICATIONS_STORAGE_KEY = 'amor_notifications_v1';
const PUSH_ENABLED_KEY = 'amor_push_notifications_enabled';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermissionStatus(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export function isPushEnabledByUser(): boolean {
  if (!isPushSupported()) return false;
  const saved = localStorage.getItem(PUSH_ENABLED_KEY);
  return saved === 'true' && Notification.permission === 'granted';
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    localStorage.setItem(PUSH_ENABLED_KEY, granted ? 'true' : 'false');
    if (granted) {
      sendBrowserNotification('Notificações Ativadas! 💖', {
        body: 'Você receberá alertas sempre que uma nova carta ou momento for compartilhado.',
      });
    }
    return granted;
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificação:', err);
    return false;
  }
}

export function disablePushNotifications(): void {
  localStorage.setItem(PUSH_ENABLED_KEY, 'false');
}

export function sendBrowserNotification(
  title: string,
  options?: { body?: string; icon?: string; tag?: string }
): void {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, {
      body: options?.body || 'Abra o álbum para conferir!',
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag || 'amor-notification',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.warn('Erro ao disparar notificação do navegador:', err);
  }
}

export function loadSavedNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 30)));
  } catch {}
}

export function triggerLoveAlert(
  notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): AppNotification {
  const fullNotification: AppNotification = {
    ...notification,
    id: 'notif-' + Date.now(),
    timestamp: new Date().toISOString(),
    read: false,
  };

  // 1. Play sweet notification chime
  romanticAudio.playNotificationChime();

  // 2. Trigger browser native notification if permitted
  if (isPushEnabledByUser()) {
    sendBrowserNotification(fullNotification.title, {
      body: fullNotification.message,
    });
  }

  // 3. Save into local history
  const current = loadSavedNotifications();
  const updated = [fullNotification, ...current].slice(0, 30);
  saveNotifications(updated);

  return fullNotification;
}
