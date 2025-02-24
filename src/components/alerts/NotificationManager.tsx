import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed
} from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

export const NotificationManager = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [notificationsPermission, setNotificationsPermission] = useState<NotificationPermission>("default");
  const [isNativeDevice, setIsNativeDevice] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const storePushToken = async (token: string, deviceType: string) => {
    if (!session?.user?.id) {
      console.error('No user session found when storing push token');
      return;
    }

    try {
      console.log('Storing push token:', token, 'for device type:', deviceType);
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: session.user.id,
          push_token: token,
          device_type: deviceType,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id,push_token'
        });

      if (error) {
        console.error('Failed to store push token:', error);
        throw error;
      }

      console.log('Successfully stored push token');
    } catch (error) {
      console.error('Failed to store push token:', error);
      throw error;
    }
  };

  const setupPushNotifications = async () => {
    try {
      console.log('Setting up push notifications...');
      const deviceInfo = await Device.getInfo();
      const isNative = Capacitor.isNativePlatform(); // More robust check
      setIsNativeDevice(isNative);

      if (!isNative) {
        console.log('Not a native mobile platform, skipping push setup');
        return;
      }

      console.log('Device platform:', deviceInfo.platform);

      // Create notification channel for Android
      if (deviceInfo.platform === 'android') {
        console.log('Creating Android notification channel...');
        await PushNotifications.createChannel({
          id: 'tenders',
          name: 'Tender Notifications',
          description: 'Notifications for new tender matches',
          importance: 5, // High importance for background notifications
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true
        });
        console.log('Android notification channel created successfully');
      }

      console.log('Checking push notification permissions...');
      const permissionStatus = await PushNotifications.checkPermissions();
      console.log('Current permission status:', permissionStatus);

      if (permissionStatus.receive !== 'granted') {
        console.log('Requesting push notification permissions...');
        const result = await PushNotifications.requestPermissions();
        console.log('Permission request result:', result);

        if (result.receive !== 'granted') {
          console.log('Push notification permission denied');
          toast({
            title: "Permission Required",
            description: "Please enable push notifications in your device settings",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('Registering for push notifications...');
      await PushNotifications.register();

      // Remove existing listeners before adding new ones
      console.log('Removing existing listeners...');
      await PushNotifications.removeAllListeners();

      // Registration success handler
      console.log('Adding registration success listener...');
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success:', token.value);
        setPushToken(token.value);

        try {
          await storePushToken(token.value, deviceInfo.platform);
          toast({
            title: "Success",
            description: "Push notifications enabled successfully",
          });
        } catch (error) {
          console.error('Error in registration process:', error);
          toast({
            title: "Error",
            description: "Failed to register for push notifications",
            variant: "destructive",
          });
        }
      });

      // Registration error handler
      console.log('Adding registration error listener...');
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        toast({
          title: "Registration Error",
          description: "Failed to register for push notifications",
          variant: "destructive",
        });
      });

      // Notification received handler (foreground)
      console.log('Adding notification received listener...');
      PushNotifications.addListener('pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Notification received in foreground:', notification);
          toast({
            title: notification.title || "New Notification",
            description: notification.body,
          });
        }
      );

      // Notification action handler (background/click)
      console.log('Adding notification action listener...');
      PushNotifications.addListener('pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('Notification action performed in background/clicked:', action);
          const tenderId = action.notification.data?.tenderId;
          if (tenderId) {
            const baseUrl = window.location.origin;
            window.location.href = `${baseUrl}/tenders/${tenderId}`;
          }
        }
      );

    } catch (error) {
      console.error('Error in setupPushNotifications:', error);
      toast({
        title: "Error",
        description: "Failed to set up push notifications",
        variant: "destructive",
      });
    }
  };

  // Setup push notifications when user session is available
  useEffect(() => {
    if (session?.user?.id) {
      console.log('Setting up push notifications for user:', session.user.id);
      setupPushNotifications();
    }
  }, [session?.user?.id]);

  // Listen for realtime notifications - unchanged

  // Handle web notifications - unchanged

  const shouldShowButton = !isNativeDevice && notificationsPermission === "default";

  if (!shouldShowButton) return null;

  return (
    <Button
      onClick={requestNotificationPermission}
      variant="outline"
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      Enable Notifications
    </Button>
  );
};
