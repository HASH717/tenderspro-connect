
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tenderspro.app',
  appName: 'TendersPro',
  webDir: 'dist',
  server: {
    androidScheme: 'http', // Changed to http for development
    cleartext: true,
    allowNavigation: [
      'localhost',
      '*.lovableproject.com',
      '74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com'
    ],
    hostname: '0.0.0.0', // Changed this to match Vite config
    url: 'http://10.0.2.2:8080' // Use 10.0.2.2 for Android emulator
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
