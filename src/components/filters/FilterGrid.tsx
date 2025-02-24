import { TenderTypeSelect } from "./TenderTypeSelect";
import { CategorySelect } from "./CategorySelect";
import { WilayaSelect } from "./WilayaSelect";

interface FilterGridProps {
  filters: any;
  onFilterChange: (key: string, value: any) => void;
}

export const FilterGrid = ({ filters, onFilterChange }: FilterGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      <TenderTypeSelect
        value={filters.tenderType}
        onChange={(value) => onFilterChange("tenderType", value)}
      />
      <CategorySelect
        value={filters.category}
        onChange={(value) => onFilterChange("category", value)}
      />
      <WilayaSelect
        value={filters.wilaya}
        onChange={(value) => onFilterChange("wilaya", value)}
      />
    </div>
  );
};
