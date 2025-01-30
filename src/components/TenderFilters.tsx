import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  marketType: string;
  announcementType: string;
  category: string;
  region: string;
  microEnterprises: boolean;
  publicationDate: string;
}

const TenderFilters = ({ onSearch }: TenderFiltersProps) => {
  const [filters, setFilters] = useState<TenderFilters>({
    search: "",
    announcers: "",
    marketType: "",
    announcementType: "",
    category: "",
    region: "",
    microEnterprises: false,
    publicationDate: "",
  });

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
            placeholder="Search"
            className="pl-10 bg-white"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
        <Input
          placeholder="Announcers"
          className="bg-white"
          value={filters.announcers}
          onChange={(e) => handleFilterChange("announcers", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={filters.marketType}
          onValueChange={(value) => handleFilterChange("marketType", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Market type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.announcementType}
          onValueChange={(value) => handleFilterChange("announcementType", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Announcement type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tender">Tender</SelectItem>
            <SelectItem value="auction">Auction</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="construction">Construction</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="supplies">Supplies</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.region}
          onValueChange={(value) => handleFilterChange("region", value)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="algiers">Algiers</SelectItem>
            <SelectItem value="oran">Oran</SelectItem>
            <SelectItem value="constantine">Constantine</SelectItem>
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
            <Label htmlFor="micro-enterprises">Micro-enterprises</Label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Input
            type="date"
            value={filters.publicationDate}
            onChange={(e) => handleFilterChange("publicationDate", e.target.value)}
            className="w-full sm:w-auto bg-white"
          />
          <Button 
            onClick={() => onSearch(filters)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
          >
            Search
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TenderFilters;