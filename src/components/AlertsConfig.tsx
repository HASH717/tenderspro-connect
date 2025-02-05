
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
  { value: "4", label: "4 - Oum El Bouaghi" },
  { value: "5", label: "5 - Batna" },
  { value: "6", label: "6 - Béjaïa" },
  { value: "7", label: "7 - Biskra" },
  { value: "8", label: "8 - Béchar" },
  { value: "9", label: "9 - Blida" },
  { value: "10", label: "10 - Bouira" },
  { value: "11", label: "11 - Tamanrasset" },
  { value: "12", label: "12 - Tébessa" },
  { value: "13", label: "13 - Tlemcen" },
  { value: "14", label: "14 - Tiaret" },
  { value: "15", label: "15 - Tizi Ouzou" },
  { value: "16", label: "16 - Alger" },
  { value: "17", label: "17 - Djelfa" },
  { value: "18", label: "18 - Jijel" },
  { value: "19", label: "19 - Sétif" },
  { value: "20", label: "20 - Saïda" },
  { value: "21", label: "21 - Skikda" },
  { value: "22", label: "22 - Sidi Bel Abbès" },
  { value: "23", label: "23 - Annaba" },
  { value: "24", label: "24 - Guelma" },
  { value: "25", label: "25 - Constantine" },
  { value: "26", label: "26 - Médéa" },
  { value: "27", label: "27 - Mostaganem" },
  { value: "28", label: "28 - M'Sila" },
  { value: "29", label: "29 - Mascara" },
  { value: "30", label: "30 - Ouargla" },
  { value: "31", label: "31 - Oran" },
  { value: "32", label: "32 - El Bayadh" },
  { value: "33", label: "33 - Illizi" },
  { value: "34", label: "34 - Bordj Bou Arréridj" },
  { value: "35", label: "35 - Boumerdès" },
  { value: "36", label: "36 - El Tarf" },
  { value: "37", label: "37 - Tindouf" },
  { value: "38", label: "38 - Tissemsilt" },
  { value: "39", label: "39 - El Oued" },
  { value: "40", label: "40 - Khenchela" },
  { value: "41", label: "41 - Souk Ahras" },
  { value: "42", label: "42 - Tipaza" },
  { value: "43", label: "43 - Mila" },
  { value: "44", label: "44 - Aïn Defla" },
  { value: "45", label: "45 - Naâma" },
  { value: "46", label: "46 - Aïn Témouchent" },
  { value: "47", label: "47 - Ghardaïa" },
  { value: "48", label: "48 - Relizane" },
  { value: "49", label: "49 - El M'Ghair" },
  { value: "50", label: "50 - El Meniaa" },
  { value: "51", label: "51 - Ouled Djellal" },
  { value: "52", label: "52 - Bordj Baji Mokhtar" },
  { value: "53", label: "53 - Béni Abbès" },
  { value: "54", label: "54 - Timimoun" },
  { value: "55", label: "55 - Touggourt" },
  { value: "56", label: "56 - Djanet" },
  { value: "57", label: "57 - In Salah" },
  { value: "58", label: "58 - In Guezzam" },
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

interface Alert {
  id: string;
  name: string;
  wilaya: string[];
  tenderType: string[];
  category: string[];
}

const mapFiltersToDb = (filters: Partial<Alert>, userId: string) => {
  return {
    user_id: userId,
    name: filters.name,
    wilaya: filters.wilaya?.join(","),
    tender_type: filters.tenderType?.join(","),
    category: filters.category?.join(","),
  };
};

const mapDbToFilters = (dbAlert: any): Alert => {
  return {
    id: dbAlert.id,
    name: dbAlert.name,
    wilaya: dbAlert.wilaya ? dbAlert.wilaya.split(",") : [],
    tenderType: dbAlert.tender_type ? dbAlert.tender_type.split(",") : [],
    category: dbAlert.category ? dbAlert.category.split(",") : [],
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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

  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['all-tender-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenders')
        .select('category')
        .not('category', 'is', null)
        .not('category', 'eq', '');

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
        return [];
      }

      const uniqueCategories = Array.from(new Set(data.map(tender => tender.category)))
        .filter(category => category)
        .sort()
        .map(category => ({
          value: category,
          label: category
        }));

      return uniqueCategories;
    }
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
      category: selectedCategories,
      ...(editingAlertId ? { id: editingAlertId } : {}),
    };

    const { error } = await supabase
      .from("alerts")
      .upsert(mapFiltersToDb(alertData, session.user.id));

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
    setSelectedCategories([]);
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
    setSelectedCategories(alert.category || []);
    setShowNewAlert(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">{t("pages.alerts")}</h1>
        <Button
          onClick={() => {
            setShowNewAlert(true);
            setEditingAlertId(null);
            setAlertName("");
            setSelectedWilayas([]);
            setSelectedTenderTypes([]);
            setSelectedCategories([]);
          }}
          className="gap-2"
          variant={showNewAlert ? "secondary" : "default"}
        >
          <Plus className="h-4 w-4" />
          New Alert
        </Button>
      </div>

      {showNewAlert && (
        <div className="space-y-4 border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Label htmlFor="alert-name" className="text-sm font-medium">Alert Name</Label>
              <Input
                id="alert-name"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                placeholder="Name your alert"
                className="max-w-md"
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
                setSelectedCategories([]);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-6">
            <MultiSelect
              label="Regions"
              options={WILAYA_OPTIONS}
              selectedValues={selectedWilayas}
              onChange={setSelectedWilayas}
              className="bg-muted/50 p-4 rounded-lg"
            />

            <MultiSelect
              label="Market type"
              options={TENDER_TYPE_OPTIONS}
              selectedValues={selectedTenderTypes}
              onChange={setSelectedTenderTypes}
              className="bg-muted/50 p-4 rounded-lg"
            />

            <MultiSelect
              label="Categories"
              options={categoryOptions}
              selectedValues={selectedCategories}
              onChange={setSelectedCategories}
              className="bg-muted/50 p-4 rounded-lg"
            />
          </div>

          <div className="flex justify-end pt-4">
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
            className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">{alert.name}</h3>
                <p className="text-sm text-muted-foreground space-x-2">
                  {alert.wilaya.length > 0 && (
                    <span>{alert.wilaya.length} regions</span>
                  )}
                  {alert.tenderType.length > 0 && (
                    <span>• {alert.tenderType.length} market types</span>
                  )}
                  {alert.category?.length > 0 && (
                    <span>• {alert.category.length} categories</span>
                  )}
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
