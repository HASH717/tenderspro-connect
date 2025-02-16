
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "./types";
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const NotificationManager = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Initialize push notifications
  const initializePushNotifications = async () => {
    if (!isNative) {
      console.log('Not a native platform, push notifications unavailable');
      return;
    }

    try {
      // Request permission
      const permissionStatus = await PushNotifications.requestPermissions();
      console.log('Permission status:', permissionStatus.receive);
      
      if (permissionStatus.receive === 'granted') {
        // Register with FCM
        await PushNotifications.register();
        setHasPermission(true);
        
        // Show success message
        toast({
          title: "Notifications Enabled",
          description: "You will now receive notifications for new tenders",
        });
      } else {
        console.log('Push notification permission denied');
        toast({
          title: "Notifications Disabled",
          description: "Please enable notifications in your device settings to receive tender updates",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      toast({
        title: "Notification Error",
        description: "Failed to initialize push notifications",
        variant: "destructive",
      });
    }
  };

  // Set up push notification handlers
  useEffect(() => {
    if (!isNative) return;

    // Registration success event
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success:', token.value);
      // Here you would typically send this token to your backend
    });

    // Registration error event
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Push notification received event
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      // Handle the notification when the app is in foreground
      toast({
        title: notification.title || "New Tender Match",
        description: notification.body,
      });
    });

    // Push notification action clicked event
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed:', notification);
      // Handle notification click - e.g., navigate to specific tender
      if (notification.notification.data.tenderId) {
        window.location.href = `/tenders/${notification.notification.data.tenderId}`;
      }
    });

    return () => {
      // Clean up listeners
      PushNotifications.removeAllListeners();
    };
  }, [toast]);

  // Set up realtime subscription for new tender notifications
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
          
          // Fetch the tender details
          const { data: tender } = await supabase
            .from('tenders')
            .select('*')
            .eq('id', payload.new.tender_id)
            .single();

          if (!tender) {
            console.log('No tender found for id:', payload.new.tender_id);
            return;
          }

          // Fetch the alert details
          const { data: alert } = await supabase
            .from('alerts')
            .select('*')
            .eq('id', payload.new.alert_id)
            .single();

          if (!alert) {
            console.log('No alert found for id:', payload.new.alert_id);
            return;
          }

          const preferences = alert.notification_preferences as Alert['notification_preferences'];
          const inAppEnabled = preferences?.in_app ?? true;

          // Show in-app notification if enabled
          if (inAppEnabled) {
            toast({
              title: "New Tender Match!",
              description: `A new tender matching your alert "${alert.name}": ${tender.title}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, toast]);

  // Only show the button if we're on a native platform and don't have permission yet
  if (!isNative || hasPermission) return null;

  return (
    <Button
      onClick={initializePushNotifications}
      variant="outline"
      size="sm"
      className="gap-2 whitespace-nowrap"
    >
      <Bell className="h-4 w-4" />
      Enable Notifications
    </Button>
  );
};
