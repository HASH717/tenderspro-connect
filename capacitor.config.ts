
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tenderspro.app',
  appName: 'TendersPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'localhost',
      '*.lovableproject.com',
      '74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com'
    ],
    hostname: 'localhost',
    url: 'http://localhost:8080'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
