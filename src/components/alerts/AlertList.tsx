
import { useTranslation } from "react-i18next";
import { Bell, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "./types";

interface AlertListProps {
  alerts: Alert[];
  onEdit: (alert: Alert) => void;
  onDelete: (id: string) => void;
}

export const AlertList = ({ alerts, onEdit, onDelete }: AlertListProps) => {
  return (
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
                {alert.category.length > 0 && (
                  <span>• {alert.category.length} categories</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(alert)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(alert.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
