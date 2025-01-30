import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface TenderFiltersProps {
  onSearch: (filters: TenderFilters) => void;
}

export interface TenderFilters {
  search: string;
  announcers: string;
  tenderType: string;
  announcementType: string;
  category: string;
  wilaya: string;
  priceRange: string;
  microEnterprises: boolean;
  publicationDate: string;
  deadlineDate: string;
}

const TenderFilters = ({ onSearch }: TenderFiltersProps) => {
  const [filters, setFilters] = useState<TenderFilters>({
    search: "",
    announcers: "",
    tenderType: "",
    announcementType: "",
    category: "",
    wilaya: "",
    priceRange: "",
    microEnterprises: false,
    publicationDate: "",
    deadlineDate: "",
  });

  const { t } = useTranslation();

  const handleFilterChange = (key: keyof TenderFilters, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: "",
      announcers: "",
      tenderType: "",
      announcementType: "",
      category: "",
      wilaya: "",
      priceRange: "",
      microEnterprises: false,
      publicationDate: "",
      deadlineDate: "",
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  return (
    <div className="space-y-4 bg-card p-4 rounded-lg shadow-sm">
      <div className="relative">
        <Input
          placeholder={t("filters.announcers")}
          className="bg-white"
          value={filters.announcers}
          onChange={(e) => handleFilterChange("announcers", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Select
          value={filters.tenderType}
          onValueChange={(value) => handleFilterChange("tenderType", value)}
        >
          <SelectTrigger className="bg-white">
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

        <Select
          value={filters.announcementType}
          onValueChange={(value) => handleFilterChange("announcementType", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder={t("filters.announcementType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tenders">{t("filters.announcement.tenders")}</SelectItem>
            <SelectItem value="results">{t("filters.announcement.results")}</SelectItem>
            <SelectItem value="attribution">{t("filters.announcement.attribution")}</SelectItem>
            <SelectItem value="extension">{t("filters.announcement.extension")}</SelectItem>
            <SelectItem value="fruitless">{t("filters.announcement.fruitless")}</SelectItem>
            <SelectItem value="cancellation">{t("filters.announcement.cancellation")}</SelectItem>
            <SelectItem value="update">{t("filters.announcement.update")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder={t("filters.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hydraulics">{t("tender.categories.hydraulics")}</SelectItem>
            <SelectItem value="plastic">{t("tender.categories.plastic")}</SelectItem>
            <SelectItem value="steel">{t("tender.categories.steel")}</SelectItem>
            <SelectItem value="renewable">{t("tender.categories.renewable")}</SelectItem>
            <SelectItem value="paper">{t("tender.categories.paper")}</SelectItem>
            <SelectItem value="construction">{t("tender.categories.construction")}</SelectItem>
            <SelectItem value="others">{t("tender.categories.others")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.wilaya}
          onValueChange={(value) => handleFilterChange("wilaya", value)}
        >
          <SelectTrigger className="bg-white">
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
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline"
          onClick={handleClearFilters}
          className="w-full sm:w-auto"
        >
          {t("filters.clearFilters")}
        </Button>
        
        <Button 
          onClick={() => onSearch(filters)}
          className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {t("filters.searchButton")}
        </Button>
      </div>
    </div>
  );
};

export default TenderFilters;