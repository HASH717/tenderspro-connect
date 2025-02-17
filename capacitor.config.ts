
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tenderspro.app',
  appName: 'TendersPro',
  webDir: 'dist',
  server: {
    url: 'https://74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  bundledWebRuntime: false
};

export default config;
