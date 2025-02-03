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

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
        <SelectValue placeholder={t("filters.tenderType")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="national_call">{t("filters.types.national_call")}</SelectItem>
        <SelectItem value="national_international">{t("filters.types.national_international")}</SelectItem>
        <SelectItem value="sale_notice">{t("filters.types.sale_notice")}</SelectItem>
        <SelectItem value="international_consultation">{t("filters.types.international_consultation")}</SelectItem>
        <SelectItem value="national_consultation">{t("filters.types.national_consultation")}</SelectItem>
        <SelectItem value="expression_interest">{t("filters.types.expression_interest")}</SelectItem>
        <SelectItem value="national_preselection">{t("filters.types.national_preselection")}</SelectItem>
        <SelectItem value="adjudication">{t("filters.types.adjudication")}</SelectItem>
      </SelectContent>
    </Select>
  );
};