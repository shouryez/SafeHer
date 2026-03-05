import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private hasPermission = false;

  async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      this.hasPermission = finalStatus === 'granted';

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('safety-alerts', {
          name: 'Safety Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF3B30',
          sound: 'default',
        });
        await Notifications.setNotificationChannelAsync('trip-updates', {
          name: 'Trip Updates',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
      }
      return this.hasPermission;
    } catch {
      return false;
    }
  }

  async sendSOSNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🆘 SOS ACTIVATED',
        body: 'Emergency alert sent to all trusted contacts. Help is on the way.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  }

  async sendSuspiciousNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👁️ Suspicious Activity Logged',
        body: 'Silent monitoring active. Trusted contacts have been notified.',
        sound: 'default',
      },
      trigger: null,
    });
  }

  async sendRouteDeviationNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Route Deviation Detected',
        body: 'Your driver has deviated from the expected route. Stay alert.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  async sendTripStartNotification(destination: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛡️ Trip Monitoring Active',
        body: `Tracking your journey to ${destination}. Stay safe!`,
        sound: 'default',
      },
      trigger: null,
    });
  }

  async sendTripEndNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Arrived Safely',
        body: 'Your trip has ended. Glad you arrived safely!',
        sound: 'default',
      },
      trigger: null,
    });
  }

  async sendUnusualStopNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏸️ Unusual Stop Detected',
        body: 'You have been stopped for an extended time. Are you okay?',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  async sendLocationLostNotification(): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📍 Location Signal Lost',
        body: 'GPS signal lost. Trusted contacts have been notified with your last known location.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  }
}

export const notificationService = new NotificationService();
