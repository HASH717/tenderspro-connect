
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationManager } from "./alerts/NotificationManager";
import { AlertForm } from "./alerts/AlertForm";
import { AlertList } from "./alerts/AlertList";
import { Alert, mapDbToFilters } from "./alerts/types";

export const AlertsConfig = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { session } = useAuth();
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | undefined>();

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
