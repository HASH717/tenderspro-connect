
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

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsPermission(Notification.permission);
    }
  }, []);

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
          console.log('New notification received:', payload);
          
          // Fetch the tender details
          const { data: tender } = await supabase
            .from('tenders')
            .select('*')
            .eq('id', payload.new.tender_id)
            .single();

          if (!tender) return;

          // Fetch the alert details to check email preferences
          const { data: alert } = await supabase
            .from('alerts')
            .select('*')
            .eq('id', payload.new.alert_id)
            .single();

          if (!alert) return;

          const preferences = alert.notification_preferences as Alert['notification_preferences'];
          const emailEnabled = preferences?.email ?? false;

          if (emailEnabled) {
            try {
              const { data, error } = await supabase.functions.invoke('send-alert-email', {
                body: {
                  to: session.user.email,
                  subject: `New Tender Match: ${tender.title}`,
                  html: `
                    <h1>New Tender Match</h1>
                    <p>A new tender matching your alert "${alert.name}" has been found:</p>
                    <h2>${tender.title}</h2>
                    <p><strong>Category:</strong> ${tender.category}</p>
                    <p><strong>Region:</strong> ${tender.wilaya}</p>
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
                toast({
                  title: "Failed to Send Email",
                  description: "There was an error sending the email notification.",
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error('Error invoking send-alert-email function:', error);
            }
          }

          // Show browser notification if enabled
          if (notificationsPermission === "granted") {
            const notification = new Notification("New Tender Match!", {
              body: `A new tender matching your alert: ${tender.title}`,
              icon: "/favicon.ico",
            });

            notification.onclick = () => {
              window.focus();
            };
          }

          // Show toast notification
          toast({
            title: "New Tender Match!",
            description: `A new tender matching your alert: ${tender.title}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, notificationsPermission, toast]);

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

  if (notificationsPermission !== "default") return null;

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

