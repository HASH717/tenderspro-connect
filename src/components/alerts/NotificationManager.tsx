
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

      if (error) throw error;
      
      console.log('Successfully stored push token');
    } catch (error) {
      console.error('Failed to store push token:', error);
      throw error;
    }
  };

  const setupPushNotifications = async () => {
    try {
      const deviceInfo = await Device.getInfo();
      setIsNativeDevice(deviceInfo.platform === 'android' || deviceInfo.platform === 'ios');
      
      if (!isNativeDevice) {
        console.log('Not a native mobile platform');
        return;
      }

      // Create notification channel for Android
      if (deviceInfo.platform === 'android') {
        await PushNotifications.createChannel({
          id: 'tenders',
          name: 'Tender Notifications',
          description: 'Notifications for new tender matches',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true
        });
      }
      
      const permissionStatus = await PushNotifications.checkPermissions();
      
      if (permissionStatus.receive !== 'granted') {
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive !== 'granted') {
          toast({
            title: "Permission Required",
            description: "Please enable push notifications in your device settings",
            variant: "destructive",
          });
          return;
        }
      }

      await PushNotifications.register();
      await PushNotifications.removeAllListeners();

      // Registration handler
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

      // Notification received handler (foreground)
      PushNotifications.addListener('pushNotificationReceived', 
        (notification: PushNotificationSchema) => {
          console.log('Notification received:', notification);
          toast({
            title: notification.title || "New Notification",
            description: notification.body,
          });
        }
      );

      // Notification action handler (background/click)
      PushNotifications.addListener('pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('Notification action performed:', action);
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

  // Listen for realtime notifications
  useEffect(() => {
    if (!session?.user?.id) return;

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
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                tender_id: payload.new.tender_id,
                alert_id: payload.new.alert_id,
                user_id: session.user.id
              }
            });
          } catch (error) {
            console.error('Error invoking send-push-notification function:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Handle web notifications
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
          description: "You will now receive desktop notifications",
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

