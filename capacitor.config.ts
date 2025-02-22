
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
    hostname: '0.0.0.0',
    url: 'http://192.168.1.40:8080' // Updated to use your computer's IP address
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
      importance: "high",
      iconColor: "#4CAF50"
    }
  }
};

export default config;
