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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TenderFiltersProps {
  onSearch: (filters: TenderFilters) => void;
}

export interface TenderFilters {
  search: string;
  announcers: string;
  type: string;
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
    type: "",
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

  return (
    <div className="space-y-3 bg-card p-4 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("filters.search")}
            className="pl-10 bg-white"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
        <Input
          placeholder={t("filters.announcers")}
          className="bg-white"
          value={filters.announcers}
          onChange={(e) => handleFilterChange("announcers", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={filters.type}
          onValueChange={(value) => handleFilterChange("type", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder={t("filters.tenderType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="national_call">{t("filters.types.national_call")}</SelectItem>
            <SelectItem value="national_preselection">{t("filters.types.national_preselection")}</SelectItem>
            <SelectItem value="international_call">{t("filters.types.international_call")}</SelectItem>
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
            <SelectItem value="construction">{t("tender.categories.construction")}</SelectItem>
            <SelectItem value="hydraulic">{t("tender.categories.hydraulic")}</SelectItem>
            <SelectItem value="sanitation">{t("tender.categories.sanitation")}</SelectItem>
            <SelectItem value="petroleum">{t("tender.categories.petroleum")}</SelectItem>
            <SelectItem value="water">{t("tender.categories.water")}</SelectItem>
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
            <SelectItem value="alger">{t("tender.locations.alger")}</SelectItem>
            <SelectItem value="constantine">{t("tender.locations.constantine")}</SelectItem>
            <SelectItem value="mostaganem">{t("tender.locations.mostaganem")}</SelectItem>
            <SelectItem value="timimoun">{t("tender.locations.timimoun")}</SelectItem>
            <SelectItem value="bejaia">{t("tender.locations.bejaia")}</SelectItem>
            <SelectItem value="saida">{t("tender.locations.saida")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priceRange}
          onValueChange={(value) => handleFilterChange("priceRange", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder={t("filters.priceRange")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0-1000">0 - 1,000 DA</SelectItem>
            <SelectItem value="1000-5000">1,000 - 5,000 DA</SelectItem>
            <SelectItem value="5000-10000">5,000 - 10,000 DA</SelectItem>
            <SelectItem value="10000+">10,000+ DA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="micro-enterprises"
              checked={filters.microEnterprises}
              onCheckedChange={(checked) => handleFilterChange("microEnterprises", checked)}
            />
            <Label htmlFor="micro-enterprises">{t("filters.microEnterprises")}</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>{t("filters.publicationDate")}</Label>
            <Input
              type="date"
              value={filters.publicationDate}
              onChange={(e) => handleFilterChange("publicationDate", e.target.value)}
              className="w-full bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("filters.deadlineDate")}</Label>
            <Input
              type="date"
              value={filters.deadlineDate}
              onChange={(e) => handleFilterChange("deadlineDate", e.target.value)}
              className="w-full bg-white"
            />
          </div>
        </div>

        <Button 
          onClick={() => onSearch(filters)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
        >
          {t("filters.searchButton")}
        </Button>
      </div>
    </div>
  );
};

export default TenderFilters;