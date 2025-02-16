
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TenderTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const TenderTypeSelect = ({ value, onChange }: TenderTypeSelectProps) => {
  const { t } = useTranslation();

  const tenderTypes = [
    "Appel d'offres national",
    "Appel d'offres national et international",
    "Avis de vente",
    "Consultation internationale",
    "Consultation nationale",
    "Manifestation d'intérêt",
    "Présélection nationale",
    "Adjudication"
  ];

  return (
    <Select 
      value={value || undefined} 
      onValueChange={onChange}
    >
      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
        <SelectValue placeholder={t("filters.tenderType")} />
      </SelectTrigger>
      <SelectContent>
        {tenderTypes.map((type) => (
          <SelectItem 
            key={type}
            value={type}
          >
            <div className="flex items-center justify-between w-full">
              <span>{type}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
