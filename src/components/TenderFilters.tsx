import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SearchInput } from "./filters/SearchInput";
import { CategorySelect } from "./filters/CategorySelect";
import { WilayaSelect } from "./filters/WilayaSelect";
import { TenderTypeSelect } from "./filters/TenderTypeSelect";

interface TenderFiltersProps {
  onSearch: (filters: TenderFilters) => void;
  initialFilters?: TenderFilters | null;
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

const TenderFilters = ({ onSearch, initialFilters }: TenderFiltersProps) => {
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

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

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
    <div className="space-y-4 bg-gradient-accent p-6 rounded-lg shadow-sm border border-muted/50">
      <SearchInput 
        value={filters.search}
        onChange={(value) => handleFilterChange("search", value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <TenderTypeSelect
          value={filters.tenderType}
          onChange={(value) => handleFilterChange("tenderType", value)}
        />

        <CategorySelect
          value={filters.category}
          onChange={(value) => handleFilterChange("category", value)}
        />

        <WilayaSelect
          value={filters.wilaya}
          onChange={(value) => handleFilterChange("wilaya", value)}
        />
      </div>

      <Separator className="my-4 bg-muted/30" />

      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline"
          onClick={handleClearFilters}
          className="w-full sm:w-auto bg-white/80 backdrop-blur-sm hover:bg-white/90"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default TenderFilters;