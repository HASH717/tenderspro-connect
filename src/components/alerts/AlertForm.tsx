
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { WILAYA_OPTIONS, TENDER_TYPE_OPTIONS } from "./constants";
import { Alert, mapFiltersToDb } from "./types";

interface AlertFormProps {
  onClose: () => void;
  onSave: () => void;
  editingAlert?: Alert;
}

export const AlertForm = ({ onClose, onSave, editingAlert }: AlertFormProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { session } = useAuth();
  const [alertName, setAlertName] = useState(editingAlert?.name || "");
  const [selectedWilayas, setSelectedWilayas] = useState<string[]>(editingAlert?.wilaya || []);
  const [selectedTenderTypes, setSelectedTenderTypes] = useState<string[]>(editingAlert?.tenderType || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(editingAlert?.category || []);
  const [emailNotifications, setEmailNotifications] = useState(
    editingAlert?.notification_preferences?.email || false
  );

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
        toast({
          title: t("alerts.error"),
          description: t("alerts.failedToLoadCategories"),
          variant: "destructive",
        });
        return [];
      }

      const uniqueCategories = Array.from(new Set(data
        .map(tender => tender.category)
        .filter(Boolean)))
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
      ...(editingAlert?.id && { id: editingAlert.id }),
      name: alertName,
      wilaya: selectedWilayas,
      tenderType: selectedTenderTypes,
      category: selectedCategories,
      notification_preferences: {
        email: emailNotifications,
        in_app: true
      }
    };

    const dbData = mapFiltersToDb(alertData, session.user.id);

    const { error } = await supabase
      .from("alerts")
      .upsert(dbData)
      .select();

    if (error) {
      console.error('Error saving alert:', error);
      toast({
        title: editingAlert ? t("alerts.updateError") : t("alerts.createError"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: editingAlert ? t("alerts.updated") : t("alerts.created"),
      description: editingAlert ? t("alerts.updatedDescription") : t("alerts.createdDescription"),
    });

    onSave();
    onClose();
  };

  return (
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
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6">
        <MultiSelect
          label="Wilaya"
          options={WILAYA_OPTIONS}
          selectedValues={selectedWilayas}
          onChange={setSelectedWilayas}
          className="bg-muted/50 p-4 rounded-lg [&_button:hover_span]:text-[#333333] [&_button_span]:transition-colors"
        />

        <MultiSelect
          label="Market type"
          options={TENDER_TYPE_OPTIONS}
          selectedValues={selectedTenderTypes}
          onChange={setSelectedTenderTypes}
          className="bg-muted/50 p-4 rounded-lg [&_button:hover_span]:text-[#333333] [&_button_span]:transition-colors"
        />

        <MultiSelect
          label="Categories"
          options={categoryOptions}
          selectedValues={selectedCategories}
          onChange={setSelectedCategories}
          className="bg-muted/50 p-4 rounded-lg [&_span:hover]:text-[#555555] [&_span]:transition-colors"
        />

        <div className="flex items-center space-x-2 bg-muted/50 p-4 rounded-lg">
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
          <Label htmlFor="email-notifications">Receive email notifications</Label>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveAlert}>
          Save
        </Button>
      </div>
    </div>
  );
};
