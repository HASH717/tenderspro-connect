
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
  const [isSettingUp, setIsSettingUp] = useState(false);

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
    if (isSettingUp) return;
    setIsSettingUp(true);

    try {
      console.log('Setting up push notifications...');
      const deviceInfo = await Device.getInfo();
      const isNative = deviceInfo.platform === 'android' || deviceInfo.platform === 'ios';
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
          importance: 5,
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
    } catch (error) {
      console.error('Error in setupPushNotifications:', error);
      toast({
        title: "Error",
        description: "Failed to set up push notifications",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // Setup push notifications when user session is available
  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      if (session?.user?.id && mounted) {
        console.log('Setting up push notifications for user:', session.user.id);
        await setupPushNotifications();
      }
    };

    setup();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  // Setup notification listeners
  useEffect(() => {
    if (!isNativeDevice) return;

    console.log('Setting up notification listeners...');
    
    // Registration success handler
    const registrationListener = PushNotifications.addListener('registration', 
      async (token) => {
        console.log('Push registration success:', token.value);
        setPushToken(token.value);

        try {
          const deviceInfo = await Device.getInfo();
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
      }
    );

    // Registration error handler
    const registrationErrorListener = PushNotifications.addListener('registrationError',
      (error) => {
        console.error('Push registration error:', error);
        toast({
          title: "Registration Error",
          description: "Failed to register for push notifications",
          variant: "destructive",
        });
      }
    );

    // Notification received handler (foreground)
    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Notification received:', notification);
        toast({
          title: notification.title || "New Notification",
          description: notification.body,
        });
      }
    );

    // Notification action handler (background/click)
    const notificationActionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Notification action performed:', action);
        const tenderId = action.notification.data?.tenderId;
        if (tenderId) {
          const baseUrl = window.location.origin;
          window.location.href = `${baseUrl}/tenders/${tenderId}`;
        }
      }
    );

    // Cleanup function
    return () => {
      console.log('Cleaning up notification listeners...');
      registrationListener.remove();
      registrationErrorListener.remove();
      notificationReceivedListener.remove();
      notificationActionListener.remove();
    };
  }, [isNativeDevice]);

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
          console.log('Received notification payload:', payload);
          try {
            const result = await supabase.functions.invoke('send-push-notification', {
              body: {
                tender_id: payload.new.tender_id,
                alert_id: payload.new.alert_id,
                user_id: session.user.id
              }
            });
            console.log('Push notification function result:', result);
          } catch (error) {
            console.error('Error invoking send-push-notification function:', error);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription...');
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

