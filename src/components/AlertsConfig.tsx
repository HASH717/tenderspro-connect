import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TenderFilters from "@/components/TenderFilters";
import { TenderFilters as TenderFiltersType } from "@/components/TenderFilters";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface Alert extends TenderFiltersType {
  id: string;
  name: string;
}

// Helper function to map frontend filters to database columns
const mapFiltersToDb = (filters: TenderFiltersType & { name: string }) => {
  return {
    name: filters.name,
    search: filters.search,
    announcers: filters.announcers,
    tender_type: filters.tenderType,
    announcement_type: filters.announcementType,
    category: filters.category,
    wilaya: filters.wilaya,
    price_range: filters.priceRange,
    micro_enterprises: filters.microEnterprises,
  };
};

// Helper function to map database response to frontend types
const mapDbToFilters = (dbAlert: any): Alert => {
  return {
    id: dbAlert.id,
    name: dbAlert.name,
    search: dbAlert.search || "",
    announcers: dbAlert.announcers || "",
    tenderType: dbAlert.tender_type || "",
    announcementType: dbAlert.announcement_type || "",
    category: dbAlert.category || "",
    wilaya: dbAlert.wilaya || "",
    priceRange: dbAlert.price_range || "",
    microEnterprises: dbAlert.micro_enterprises || false,
    publicationDate: "",
    deadlineDate: "",
  };
};

export const AlertsConfig = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [alertName, setAlertName] = useState("");

  const { data: alerts, refetch } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*");
      
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
  });

  const handleCreateAlert = async (filters: TenderFiltersType) => {
    if (!alertName.trim()) {
      toast({
        title: t("alerts.nameRequired"),
        description: t("alerts.enterName"),
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("alerts")
      .insert(mapFiltersToDb({ ...filters, name: alertName }));

    if (error) {
      toast({
        title: t("alerts.createError"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("alerts.created"),
      description: t("alerts.createdDescription"),
    });

    setShowNewAlert(false);
    setAlertName("");
    refetch();
  };

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">{t("alerts.configuration")}</h2>
        <Button
          onClick={() => setShowNewAlert(true)}
          className="gap-2"
          variant={showNewAlert ? "secondary" : "default"}
        >
          <Plus className="h-4 w-4" />
          {t("alerts.new")}
        </Button>
      </div>

      {showNewAlert && (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor="alert-name">{t("alerts.name")}</Label>
            <Input
              id="alert-name"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder={t("alerts.namePlaceholder")}
            />
          </div>
          <TenderFilters onSearch={handleCreateAlert} />
        </div>
      )}

      <div className="space-y-4">
        {alerts?.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">{alert.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {alert.search && `${t("filters.search")}: ${alert.search}`}
                  {alert.category && ` • ${t("filters.category")}: ${alert.category}`}
                  {alert.wilaya && ` • ${t("filters.wilaya")}: ${alert.wilaya}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteAlert(alert.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};