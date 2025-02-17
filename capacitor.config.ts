
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tenderspro.app',
  appName: 'TendersPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.lovableproject.com'
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
      android: {
        smallIcon: "ic_launcher_foreground",
        sound: "notification_sound",
        vibrate: true,
        importance: "high",
        channelId: "tenders-notifications",
        channelName: "Tender Notifications"
      }
    }
  }
};

export default config;
