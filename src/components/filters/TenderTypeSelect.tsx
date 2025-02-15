
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
    { id: "national_call", name: "Appel d'offres national" },
    { id: "national_international", name: "Appel d'offres national et international" },
    { id: "sale_notice", name: "Avis de vente" },
    { id: "international_consultation", name: "Consultation internationale" },
    { id: "national_consultation", name: "Consultation nationale" },
    { id: "expression_interest", name: "Manifestation d'intérêt" },
    { id: "national_preselection", name: "Présélection nationale" },
    { id: "adjudication", name: "Adjudication" }
  ];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
        <SelectValue placeholder={t("filters.tenderType")} />
      </SelectTrigger>
      <SelectContent>
        {tenderTypes.map((type) => (
          <SelectItem 
            key={type.id} 
            value={type.id}
          >
            {t(`filters.types.${type.id}`, type.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
