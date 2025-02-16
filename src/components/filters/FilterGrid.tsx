
import { TenderTypeSelect } from "./TenderTypeSelect";
import { CategorySelect } from "./CategorySelect";
import { WilayaSelect } from "./WilayaSelect";
import { TenderFilters } from "../TenderFilters";

interface FilterGridProps {
  filters: TenderFilters;
  onFilterChange: (key: keyof TenderFilters, value: any) => void;
}

export const FilterGrid = ({ filters, onFilterChange }: FilterGridProps) => {
  // Ensure category value is a string
  const categoryValue = typeof filters.category === 'object' && filters.category !== null 
    ? (filters.category as any).value || ''  // Extract value if it's an object
    : filters.category || '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      <TenderTypeSelect
        value={filters.tenderType}
        onChange={(value) => onFilterChange("tenderType", value)}
      />
      <CategorySelect
        value={categoryValue}
        onChange={(value) => onFilterChange("category", value)}
      />
      <WilayaSelect
        value={filters.wilaya}
        onChange={(value) => onFilterChange("wilaya", value)}
      />
    </div>
  );
};
