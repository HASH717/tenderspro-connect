
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "./types";
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

  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const info = await Device.getInfo();
        const isNative = info.platform === 'android' || info.platform === 'ios';
        console.log('Device platform:', info.platform, 'isNative:', isNative);
        setIsNativeDevice(isNative);
        
        if (isNative && session?.user?.id) {
          console.log('Setting up push notifications for native device');
          await setupPushNotifications();
        }
      } catch (error) {
        console.error('Error checking platform:', error);
        setIsNativeDevice(false);
      }
    };
    
    checkPlatform();
  }, [session?.user?.id]);

  const setupPushNotifications = async () => {
    try {
      console.log('Requesting push notification permissions');
      const result = await PushNotifications.requestPermissions();
      console.log('Push notification permission result:', result);
      
      if (result.receive === 'granted') {
        console.log('Permission granted, registering push notifications');
        await PushNotifications.register();
        console.log('Push notifications registered successfully');

        // Clear existing listeners before adding new ones
        await PushNotifications.removeAllListeners();
        console.log('Removed all existing push notification listeners');

        // Add registration listener
        PushNotifications.addListener('registration', async token => {
          console.log('Push registration success, token:', token.value);
          setPushToken(token.value);

          if (session?.user?.id) {
            try {
              const deviceInfo = await Device.getInfo();
              console.log('Storing push token for user:', session.user.id, 'device:', deviceInfo.platform);
              
              // First, check if token already exists
              const { data: existingTokens, error: checkError } = await supabase
                .from('user_push_tokens')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('push_token', token.value);

              if (checkError) {
                console.error('Error checking existing token:', checkError);
                throw checkError;
              }

              if (!existingTokens || existingTokens.length === 0) {
                const { error } = await supabase
                  .from('user_push_tokens')
                  .insert({
                    user_id: session.user.id,
                    push_token: token.value,
                    device_type: deviceInfo.platform,
                    last_updated: new Date().toISOString()
                  });

                if (error) {
                  console.error('Error storing push token:', error);
                  throw error;
                }

                console.log('Successfully stored new push token');
                toast({
                  title: "Success",
                  description: "Push notifications enabled successfully",
                });
              } else {
                console.log('Token already exists in database');
              }
            } catch (error) {
              console.error('Error in token registration process:', error);
              toast({
                title: "Error",
                description: "Failed to register for push notifications",
                variant: "destructive",
              });
            }
          }
        });

        // Add notification received listener
        PushNotifications.addListener('pushNotificationReceived', 
          (notification: PushNotificationSchema) => {
            console.log('Push notification received:', notification);
            toast({
              title: notification.title || "New Notification",
              description: notification.body,
            });
          }
        );

        // Add notification click listener
        PushNotifications.addListener('pushNotificationActionPerformed',
          (notification: ActionPerformed) => {
            console.log('Push notification action performed:', notification);
            if (notification.notification.data?.tenderId) {
              window.location.href = `/tenders/${notification.notification.data.tenderId}`;
            }
          }
        );

        console.log('Push notification listeners set up successfully');
      } else {
        console.log('Push notifications permission denied');
        toast({
          title: "Permission Required",
          description: "Please enable push notifications in your device settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
      toast({
        title: "Error",
        description: "Failed to set up push notifications",
        variant: "destructive",
      });
    }
  };

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

          if (!isNativeDevice && notificationsPermission === "granted") {
            const notification = new Notification("New Tender Match!", {
              body: `A new tender matching your alert`,
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
