/**
 * Push Notifications — Expo Notifications
 * ─────────────────────────────────────────
 * Handles permission requests and push token registration.
 * On physical devices, registers for remote (APNs/FCM) push tokens.
 * Falls back gracefully in Expo Go and simulators.
 *
 * Usage:
 *   import { registerForPushNotifications, addNotificationListener } from '@/lib/notifications';
 *   const token = await registerForPushNotifications();
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// How notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and retrieve the Expo push token.
 * Returns the token string on success, null on failure (permission denied / simulator).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Notifications only work on physical devices; simulators return null gracefully
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[notifications] Permission not granted');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    console.info('[notifications] Push token:', token.data);
    return token.data;
  } catch (err) {
    // Expected in Expo Go simulator — not a fatal error
    console.warn('[notifications] Could not get push token (simulator?):', err);
    return null;
  }
}

/**
 * Add a listener for incoming notifications while the app is foregrounded.
 * Returns a cleanup function.
 */
export function addNotificationListener(
  onNotification: (notification: Notifications.Notification) => void,
): () => void {
  const sub = Notifications.addNotificationReceivedListener(onNotification);
  return () => sub.remove();
}

/**
 * Add a listener for when the user taps on a notification.
 * Returns a cleanup function.
 */
export function addNotificationResponseListener(
  onResponse: (response: Notifications.NotificationResponse) => void,
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => sub.remove();
}

/**
 * Schedule a local notification (useful for testing).
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds = 1,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
  });
}
