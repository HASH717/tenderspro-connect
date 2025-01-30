import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Plus, Trash2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const WILAYA_OPTIONS = [
  { value: "1", label: "1 - Adrar" },
  { value: "2", label: "2 - Chlef" },
  { value: "3", label: "3 - Laghouat" },
  // ... Add all other wilayas
];

const TENDER_TYPE_OPTIONS = [
  { value: "national_call", label: "National call for tenders" },
  { value: "international_call", label: "National and International Call for Tenders" },
  { value: "sale_notice", label: "Sale notice" },
  { value: "international_consultation", label: "International consultation" },
  { value: "national_consultation", label: "National consultation" },
  { value: "expressions_interest", label: "Expressions of Interest" },
  { value: "national_preselection", label: "National Preselection" },
  { value: "adjudication", label: "Adjudication" },
];

const ANNOUNCEMENT_TYPE_OPTIONS = [
  { value: "tenders", label: "Tenders" },
  { value: "results", label: "Results" },
];

interface Alert {
  id: string;
  name: string;
  wilaya: string[];
  tenderType: string[];
  announcementType: string[];
}

const mapFiltersToDb = (filters: Alert, userId: string) => {
  return {
    user_id: userId,
    name: filters.name,
    wilaya: filters.wilaya.join(","),
    tender_type: filters.tenderType.join(","),
    announcement_type: filters.announcementType.join(","),
  };
};

const mapDbToFilters = (dbAlert: any): Alert => {
  return {
    id: dbAlert.id,
    name: dbAlert.name,
    wilaya: dbAlert.wilaya ? dbAlert.wilaya.split(",") : [],
    tenderType: dbAlert.tender_type ? dbAlert.tender_type.split(",") : [],
    announcementType: dbAlert.announcement_type ? dbAlert.announcement_type.split(",") : [],
  };
};

export const AlertsConfig = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { session } = useAuth();
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [alertName, setAlertName] = useState("");
  const [selectedWilayas, setSelectedWilayas] = useState<string[]>([]);
  const [selectedTenderTypes, setSelectedTenderTypes] = useState<string[]>([]);
  const [selectedAnnouncementTypes, setSelectedAnnouncementTypes] = useState<string[]>([]);
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

    const alertData = {
      name: alertName,
      wilaya: selectedWilayas,
      tenderType: selectedTenderTypes,
      announcementType: selectedAnnouncementTypes,
    };

    const { error } = await supabase
      .from("alerts")
      .upsert({
        ...mapFiltersToDb(alertData, session.user.id),
        ...(editingAlertId ? { id: editingAlertId } : {}),
      });

    if (error) {
      toast({
        title: editingAlertId ? t("alerts.updateError") : t("alerts.createError"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: editingAlertId ? t("alerts.updated") : t("alerts.created"),
      description: editingAlertId ? t("alerts.updatedDescription") : t("alerts.createdDescription"),
    });

    setShowNewAlert(false);
    setAlertName("");
    setSelectedWilayas([]);
    setSelectedTenderTypes([]);
    setSelectedAnnouncementTypes([]);
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
    setSelectedWilayas(alert.wilaya);
    setSelectedTenderTypes(alert.tenderType);
    setSelectedAnnouncementTypes(alert.announcementType);
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
            setSelectedWilayas([]);
            setSelectedTenderTypes([]);
            setSelectedAnnouncementTypes([]);
          }}
          className="gap-2"
          variant={showNewAlert ? "secondary" : "default"}
        >
          <Plus className="h-4 w-4" />
          New Alert
        </Button>
      </div>

      {showNewAlert && (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Label htmlFor="alert-name">Alert Name</Label>
              <Input
                id="alert-name"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                placeholder="Name your alert"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowNewAlert(false);
                setEditingAlertId(null);
                setAlertName("");
                setSelectedWilayas([]);
                setSelectedTenderTypes([]);
                setSelectedAnnouncementTypes([]);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <MultiSelect
            label="Regions"
            options={WILAYA_OPTIONS}
            selectedValues={selectedWilayas}
            onChange={setSelectedWilayas}
          />

          <MultiSelect
            label="Market type"
            options={TENDER_TYPE_OPTIONS}
            selectedValues={selectedTenderTypes}
            onChange={setSelectedTenderTypes}
          />

          <MultiSelect
            label="Announcement type"
            options={ANNOUNCEMENT_TYPE_OPTIONS}
            selectedValues={selectedAnnouncementTypes}
            onChange={setSelectedAnnouncementTypes}
          />

          <div className="flex justify-end">
            <Button onClick={handleSaveAlert}>
              Save
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
                  {alert.wilaya.length > 0 && `${alert.wilaya.length} regions selected`}
                  {alert.tenderType.length > 0 && ` • ${alert.tenderType.length} market types`}
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