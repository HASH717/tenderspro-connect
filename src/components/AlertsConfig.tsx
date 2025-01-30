import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Plus, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TenderFilters from "@/components/TenderFilters";
import { TenderFilters as TenderFiltersType } from "@/components/TenderFilters";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Alert extends TenderFiltersType {
  id: string;
  name: string;
}

const mapFiltersToDb = (filters: TenderFiltersType & { name: string }, userId: string) => {
  return {
    user_id: userId,
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
  const { session } = useAuth();
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [currentFilters, setCurrentFilters] = useState<TenderFiltersType | null>(null);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);

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

  const handleSaveAlert = async () => {
    if (!session?.user) {
      toast({
        title: t("alerts.authError"),
        description: t("alerts.loginRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!alertName.trim()) {
      toast({
        title: t("alerts.nameRequired"),
        description: t("alerts.enterName"),
        variant: "destructive",
      });
      return;
    }

    if (!currentFilters) {
      return;
    }

    const { error } = await supabase
      .from("alerts")
      .upsert(mapFiltersToDb(
        { ...currentFilters, name: alertName },
        session.user.id
      ));

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
    setCurrentFilters(null);
    setEditingAlertId(null);
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

  const handleEditAlert = (alert: Alert) => {
    setEditingAlertId(alert.id);
    setAlertName(alert.name);
    setCurrentFilters({
      search: alert.search,
      announcers: alert.announcers,
      tenderType: alert.tenderType,
      announcementType: alert.announcementType,
      category: alert.category,
      wilaya: alert.wilaya,
      priceRange: alert.priceRange,
      microEnterprises: alert.microEnterprises,
      publicationDate: alert.publicationDate,
      deadlineDate: alert.deadlineDate,
    });
    setShowNewAlert(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">{t("alerts.configuration")}</h2>
        <Button
          onClick={() => {
            setShowNewAlert(true);
            setEditingAlertId(null);
            setAlertName("");
            setCurrentFilters(null);
          }}
          className="gap-2"
          variant={showNewAlert ? "secondary" : "default"}
        >
          <Plus className="h-4 w-4" />
          {t("alerts.new")}
        </Button>
      </div>

      {showNewAlert && (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Label htmlFor="alert-name">{t("alerts.name")}</Label>
              <Input
                id="alert-name"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                placeholder={t("alerts.namePlaceholder")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowNewAlert(false);
                setEditingAlertId(null);
                setAlertName("");
                setCurrentFilters(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <TenderFilters
            onSearch={setCurrentFilters}
            initialFilters={currentFilters}
          />
          <div className="flex justify-end">
            <Button onClick={handleSaveAlert}>
              {editingAlertId ? t("common.save") : t("common.create")}
            </Button>
          </div>
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
                  {alert.category && `${t("filters.category")}: ${alert.category}`}
                  {alert.wilaya && ` • ${t("filters.wilaya")}: ${alert.wilaya}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditAlert(alert)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteAlert(alert.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};