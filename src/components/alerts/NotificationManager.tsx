
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
      console.log('Attempting to store push token:', {
        userId: session.user.id,
        deviceType,
        tokenLength: token.length
      });

      const { data, error } = await supabase
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
        console.error('Error storing push token:', error);
        throw error;
      }

      console.log('Successfully stored push token');
      return data;
    } catch (error) {
      console.error('Failed to store push token:', error);
      throw error;
    }
  };

  const createNotificationChannel = async () => {
    try {
      const deviceInfo = await Device.getInfo();
      if (deviceInfo.platform === 'android') {
        await PushNotifications.createChannel({
          id: 'tenders-notifications',
          name: 'Tender Notifications',
          description: 'Notifications for new tender matches',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          sound: 'notification_sound'
        });
        console.log('Notification channel created');
      }
    } catch (error) {
      console.error('Error creating notification channel:', error);
    }
  };

  const setupPushNotifications = async () => {
    try {
      console.log('Starting push notification setup');
      
      // Check if we're running in a Capacitor app
      const deviceInfo = await Device.getInfo();
      console.log('Device info:', deviceInfo);
      
      if (!deviceInfo.platform || (deviceInfo.platform !== 'android' && deviceInfo.platform !== 'ios')) {
        console.log('Not a native mobile platform:', deviceInfo.platform);
        setIsNativeDevice(false);
        return;
      }

      setIsNativeDevice(true);

      // Create notification channel for Android
      if (deviceInfo.platform === 'android') {
        await createNotificationChannel();
      }
      
      // Check current permission status
      const permissionStatus = await PushNotifications.checkPermissions();
      console.log('Current permission status:', permissionStatus);
      
      if (permissionStatus.receive !== 'granted') {
        console.log('Requesting push notification permissions');
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

      // Register for push notifications
      console.log('Registering for push notifications');
      await PushNotifications.register();
      console.log('Push notifications registered');

      // Remove existing listeners to prevent duplicates
      await PushNotifications.removeAllListeners();
      console.log('Removed existing listeners');

      // Set up registration listener
      PushNotifications.addListener('registration', async (token) => {
        console.log('Got push token:', token.value);
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

      // Set up notification received listener
      PushNotifications.addListener('pushNotificationReceived', 
        (notification: PushNotificationSchema) => {
          console.log('Received push notification:', notification);
          toast({
            title: notification.title || "New Notification",
            description: notification.body,
          });
        }
      );

      // Set up notification action listener
      PushNotifications.addListener('pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push notification action performed:', notification);
          if (notification.notification.data?.tenderId) {
            window.location.href = `/tenders/${notification.notification.data.tenderId}`;
          }
        }
      );

      console.log('All push notification listeners set up');
    } catch (error) {
      console.error('Error in setupPushNotifications:', error);
      toast({
        title: "Error",
        description: "Failed to set up push notifications",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      console.log('Setting up push notifications for user:', session.user.id);
      setupPushNotifications();
    } else {
      console.log('No user session, skipping push notification setup');
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      console.log('No user session found, skipping notification setup');
      return;
    }

    console.log('Setting up real-time notifications for user:', session.user.id);

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tender_notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        async (payload) => {
          console.log('New notification received:', payload);
          
          try {
            const { error } = await supabase.functions.invoke('send-push-notification', {
              body: {
                tender_id: payload.new.tender_id,
                alert_id: payload.new.alert_id,
                user_id: session.user.id
              }
            });

            if (error) {
              console.error('Error sending push notification:', error);
              toast({
                title: "Error",
                description: "Failed to send push notification",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('Error invoking send-push-notification function:', error);
          }

          // Handle web notifications
          if (!isNativeDevice && notificationsPermission === "granted") {
            const notification = new Notification("New Tender Match!", {
              body: `A new tender matching your alert has been found`,
              icon: "/favicon.ico",
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = `/tenders/${payload.new.tender_id}`;
            };
          }

          toast({
            title: "New Tender Match!",
            description: "A new tender matching your alert has been found",
          });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, notificationsPermission, toast, isNativeDevice]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support desktop notifications",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationsPermission(permission);
      
      if (permission === "granted") {
        toast({
          title: "Notifications Enabled",
          description: "You will now receive desktop notifications for new tenders",
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission",
        variant: "destructive",
      });
    }
  };

  // Only show the button for web notifications if we're not on a native device
  const shouldShowButton = !isNativeDevice && notificationsPermission === "default";
  console.log('Should show notification button:', shouldShowButton, 'isNativeDevice:', isNativeDevice, 'pushToken:', pushToken);

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
