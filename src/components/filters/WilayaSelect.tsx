
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WILAYA_OPTIONS } from "../alerts/types";

interface WilayaSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const WilayaSelect = ({ value, onChange }: WilayaSelectProps) => {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
        <SelectValue placeholder={t("filters.wilaya")} />
      </SelectTrigger>
      <SelectContent>
        {WILAYA_OPTIONS.map((wilaya) => (
          <SelectItem 
            key={wilaya} 
            value={wilaya}
          >
            {wilaya}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
