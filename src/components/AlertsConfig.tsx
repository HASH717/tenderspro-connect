
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationManager } from "./alerts/NotificationManager";
import { AlertForm } from "./alerts/AlertForm";
import { AlertList } from "./alerts/AlertList";
import { Alert, mapDbToFilters } from "./alerts/types";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export const AlertsConfig = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | undefined>();

  const { data: subscription } = useQuery({
    queryKey: ["subscription", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq('user_id', session?.user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: alerts = [], refetch } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq('user_id', session?.user?.id);
      
      if (error) {
        toast({
          title: t("alerts.fetchError"),
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      return data.map(mapDbToFilters);
    },
    enabled: !!session?.user?.id,
  });

  const handleDeleteAlert = async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: t("alerts.deleteError"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("alerts.deleted"),
      description: t("alerts.deletedDescription"),
    });

    refetch();
  };

  const hasActiveSubscription = subscription && 
    (subscription.status === 'active' || subscription.status === 'trial') &&
    new Date(subscription.current_period_end) > new Date();

  if (!hasActiveSubscription) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-primary">{t("pages.alerts")}</h1>
        <Card className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Unlock Alerts Feature</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get instant notifications for new tenders matching your criteria. Upgrade your subscription to access this powerful feature.
          </p>
          <Button 
            onClick={() => navigate('/subscriptions')}
            className="bg-primary text-white px-8"
          >
            Upgrade Now
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">{t("pages.alerts")}</h1>
        <div className="flex gap-2">
          <NotificationManager />
          <Button
            onClick={() => {
              setShowNewAlert(true);
              setEditingAlert(undefined);
            }}
            className="gap-2"
            variant={showNewAlert ? "secondary" : "default"}
          >
            <Plus className="h-4 w-4" />
            New Alert
          </Button>
        </div>
      </div>

      {showNewAlert && (
        <AlertForm
          onClose={() => {
            setShowNewAlert(false);
            setEditingAlert(undefined);
          }}
          onSave={refetch}
          editingAlert={editingAlert}
        />
      )}

      <AlertList
        alerts={alerts}
        onEdit={(alert) => {
          setEditingAlert(alert);
          setShowNewAlert(true);
        }}
        onDelete={handleDeleteAlert}
      />
    </div>
  );
};
