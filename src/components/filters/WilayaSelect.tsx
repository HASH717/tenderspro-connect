import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <SelectItem value="adrar">{t("tender.locations.adrar")}</SelectItem>
        <SelectItem value="alger">{t("tender.locations.alger")}</SelectItem>
        <SelectItem value="annaba">{t("tender.locations.annaba")}</SelectItem>
        <SelectItem value="batna">{t("tender.locations.batna")}</SelectItem>
        <SelectItem value="biskra">{t("tender.locations.biskra")}</SelectItem>
        <SelectItem value="blida">{t("tender.locations.blida")}</SelectItem>
        <SelectItem value="bouira">{t("tender.locations.bouira")}</SelectItem>
        <SelectItem value="tlemcen">{t("tender.locations.tlemcen")}</SelectItem>
        <SelectItem value="tizi_ouzou">{t("tender.locations.tizi_ouzou")}</SelectItem>
        <SelectItem value="djelfa">{t("tender.locations.djelfa")}</SelectItem>
        <SelectItem value="setif">{t("tender.locations.setif")}</SelectItem>
        <SelectItem value="saida">{t("tender.locations.saida")}</SelectItem>
        <SelectItem value="skikda">{t("tender.locations.skikda")}</SelectItem>
        <SelectItem value="constantine">{t("tender.locations.constantine")}</SelectItem>
        <SelectItem value="oran">{t("tender.locations.oran")}</SelectItem>
      </SelectContent>
    </Select>
  );
};