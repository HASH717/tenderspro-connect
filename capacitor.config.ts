
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.tenderspro',
  appName: 'tenderspro-connect',
  webDir: 'dist',
  server: {
    url: 'https://74bd72ef-c253-4d7f-87d7-ab46b197b9e5.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  bundledWebRuntime: false
};

export default config;
