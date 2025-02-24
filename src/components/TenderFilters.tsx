import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { SearchInput } from "./filters/SearchInput";
import { FilterGrid } from "./filters/FilterGrid";
import { FilterActions } from "./filters/FilterActions";

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
      <FilterGrid filters={filters} onFilterChange={handleFilterChange} />
      <Separator className="my-4 bg-muted/30" />
      <FilterActions onClear={handleClearFilters} />
    </div>
  );
};

export default TenderFilters;
