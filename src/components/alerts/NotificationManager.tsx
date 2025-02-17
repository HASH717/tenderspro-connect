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

  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const info = await Device.getInfo();
        const isNative = info.platform === 'android' || info.platform === 'ios';
        console.log('Device platform:', info.platform, 'isNative:', isNative);
        setIsNativeDevice(isNative);
        
        if (isNative) {
          console.log('Setting up push notifications for native device');
          await setupPushNotifications();
        }
      } catch (error) {
        console.error('Error checking platform:', error);
        setIsNativeDevice(false);
      }
    };
    
    if (session?.user?.id) {
      checkPlatform();
    }
  }, [session?.user?.id]);

  const setupPushNotifications = async () => {
    try {
      console.log('Requesting push notification permissions');
      const result = await PushNotifications.requestPermissions();
      console.log('Push notification permission result:', result);
      
      if (result.receive === 'granted') {
        console.log('Registering push notifications');
        await PushNotifications.register();

        PushNotifications.addListener('registration', async token => {
          console.log('Push registration success, token:', token.value);
          if (session?.user?.id) {
            await storePushToken(token.value);
          }
        });

        PushNotifications.addListener('pushNotificationReceived', 
          (notification: PushNotificationSchema) => {
            console.log('Push notification received:', notification);
            toast({
              title: notification.title || "New Notification",
              description: notification.body,
            });
          }
        );

        PushNotifications.addListener('pushNotificationActionPerformed',
          (notification: ActionPerformed) => {
            console.log('Push notification action performed:', notification);
            if (notification.notification.data?.tenderId) {
              window.location.href = `/tenders/${notification.notification.data.tenderId}`;
            }
          }
        );
      } else {
        console.log('Push notifications permission denied');
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  };

  const storePushToken = async (token: string) => {
    if (!session?.user?.id) return;

    try {
      const deviceInfo = await Device.getInfo();
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: session.user.id,
          push_token: token,
          device_type: deviceInfo.platform,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id,push_token'
        });

      if (error) {
        console.error('Error storing push token:', error);
      }
    } catch (error) {
      console.error('Error storing push token:', error);
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
          
          const { data: tender, error: tenderError } = await supabase
            .from('tenders')
            .select('*')
            .eq('id', payload.new.tender_id)
            .single();

          if (tenderError) {
            console.error('Error fetching tender:', tenderError);
            return;
          }

          if (!tender) {
            console.log('No tender found for id:', payload.new.tender_id);
            return;
          }

          const { data: alert, error: alertError } = await supabase
            .from('alerts')
            .select('*')
            .eq('id', payload.new.alert_id)
            .single();

          if (alertError) {
            console.error('Error fetching alert:', alertError);
            return;
          }

          if (!alert) {
            console.log('No alert found for id:', payload.new.alert_id);
            return;
          }

          const preferences = alert.notification_preferences as Alert['notification_preferences'];
          const emailEnabled = preferences?.email ?? false;

          if (emailEnabled) {
            try {
              const { error } = await supabase.functions.invoke('send-alert-email', {
                body: {
                  to: session.user.email,
                  subject: `New Tender Match: ${tender.title}`,
                  html: `
                    <h1>New Tender Match</h1>
                    <p>A new tender matching your alert "${alert.name}" has been found:</p>
                    <h2>${tender.title}</h2>
                    <p><strong>Category:</strong> ${tender.category}</p>
                    <p><strong>Wilaya:</strong> ${tender.wilaya}</p>
                    <p><strong>Deadline:</strong> ${new Date(tender.deadline).toLocaleDateString()}</p>
                    <a href="${window.location.origin}/tenders/${tender.id}">View Tender Details</a>
                  `,
                  alertId: alert.id,
                  tenderId: tender.id,
                  userId: session.user.id
                }
              });

              if (error) {
                console.error('Error sending email notification:', error);
              }
            } catch (error) {
              console.error('Error invoking send-alert-email function:', error);
            }
          }

          if (!isNativeDevice && notificationsPermission === "granted") {
            const notification = new Notification("New Tender Match!", {
              body: `A new tender matching your alert: ${tender.title}`,
              icon: "/favicon.ico",
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = `/tenders/${tender.id}`;
            };
          }

          toast({
            title: "New Tender Match!",
            description: `A new tender matching your alert: ${tender.title}`,
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
  console.log('Should show notification button:', shouldShowButton, 'isNativeDevice:', isNativeDevice);

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
