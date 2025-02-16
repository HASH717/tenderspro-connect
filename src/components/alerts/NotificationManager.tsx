
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "./types";

export const NotificationManager = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [notificationsPermission, setNotificationsPermission] = useState<NotificationPermission>("default");
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Check if running on a mobile device
  useEffect(() => {
    const checkMobileDevice = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);
      return isMobile;
    };

    const isMobile = checkMobileDevice();
    
    // If on mobile device, request notification permission automatically
    if (isMobile && "Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
    }
  }, []);

  // Check notification permission on mount and when it changes
  useEffect(() => {
    if ("Notification" in window) {
      console.log('Current notification permission:', Notification.permission);
      setNotificationsPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      console.log('No user session found, skipping notification setup');
      return;
    }

    console.log('Setting up real-time notifications for user:', session.user.id);
    console.log('Current notification permission state:', notificationsPermission);

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

          console.log('Tender found:', tender);

          // Fetch the alert details
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

          console.log('Alert found:', alert);
          console.log('Alert notification preferences:', alert.notification_preferences);

          const preferences = alert.notification_preferences as Alert['notification_preferences'];
          const emailEnabled = preferences?.email ?? false;
          const inAppEnabled = preferences?.in_app ?? true;

          console.log('Notification preferences - Email:', emailEnabled, 'In-app:', inAppEnabled);

          // Handle desktop notification
          if (notificationsPermission === "granted") {
            console.log('Attempting to show desktop notification');
            try {
              // Create notification with more visible content
              const notification = new Notification("New Tender Match!", {
                body: `${tender.title}\nCategory: ${tender.category}\nWilaya: ${tender.wilaya}`,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                requireInteraction: true, // Keep notification until user interacts with it
                tag: `tender-${tender.id}`, // Unique tag to prevent duplicate notifications
              });

              // Handle notification click
              notification.onclick = (event) => {
                event.preventDefault(); // Prevent the default action
                window.focus(); // Focus the window
                window.location.href = `/tenders/${tender.id}`; // Navigate to tender details
                notification.close(); // Close the notification
              };

              console.log('Desktop notification shown successfully');
            } catch (error) {
              console.error('Error showing desktop notification:', error);
              // Fallback to toast if desktop notification fails
              toast({
                title: "New Tender Match!",
                description: `A new tender matching your alert "${alert.name}": ${tender.title}`,
              });
            }
          } else {
            console.log('Desktop notifications not granted, permission state:', notificationsPermission);
          }

          // Handle email notification
          if (emailEnabled) {
            console.log('Attempting to send email notification');
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

              if (error) throw error;
              console.log('Email notification sent successfully');
            } catch (error) {
              console.error('Error sending email notification:', error);
              toast({
                title: "Email Notification Failed",
                description: "There was an error sending the email notification.",
                variant: "destructive",
              });
            }
          }

          // Always show in-app toast notification as a fallback
          if (inAppEnabled) {
            console.log('Showing in-app toast notification');
            toast({
              title: "New Tender Match!",
              description: `A new tender matching your alert "${alert.name}": ${tender.title}`,
            });
          }
        }
      )
      .subscribe();

    console.log('Real-time channel subscribed successfully');

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, notificationsPermission, toast]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.log('Browser notifications not supported');
      toast({
        title: "Notifications Not Supported",
        description: "Your browser doesn't support desktop notifications",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Requesting notification permission');
      const permission = await Notification.requestPermission();
      console.log('Permission request result:', permission);
      
      setNotificationsPermission(permission);
      
      if (permission === "granted") {
        // Send a test notification to verify permissions
        const testNotification = new Notification("Notifications Enabled!", {
          body: "You will now receive desktop notifications for new tenders",
          icon: "/favicon.ico",
        });
        
        console.log('Test notification sent successfully');
        
        toast({
          title: "Notifications Enabled",
          description: "You will now receive desktop notifications for new tenders",
        });
      } else {
        console.log('Notification permission not granted:', permission);
        toast({
          title: "Notifications Disabled",
          description: "You will not receive desktop notifications for new tenders",
          variant: "destructive",
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

  // Only show the enable button if not on mobile and permission is in default state
  if (isMobileDevice || notificationsPermission !== "default") return null;

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
