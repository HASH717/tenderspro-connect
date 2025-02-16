
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface CategorySelectorProps {
  selectedCategories: string[];
  onCategorySelect: (category: string) => void;
  maxCategories: number | null;
}

export const CategorySelector = ({
  selectedCategories,
  onCategorySelect,
  maxCategories,
}: CategorySelectorProps) => {
  const { data: categories = [] } = useQuery({
    queryKey: ['all-tender-categories'],
    queryFn: async () => {
      // Using a specific query to get unique categories
      const { data, error } = await supabase
        .from('tenders')
        .select('category')
        .not('category', 'is', null)
        .not('category', 'eq', '');

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
        return [];
      }

      // Extract unique categories and sort them, with proper type assertions
      const uniqueCategories = Array.from(
        new Set(
          data
            .map(row => row.category)
            .filter((category): category is string => 
              typeof category === 'string' && category.length > 0
            )
        )
      ).sort();

      return uniqueCategories;
    }
  });

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">
        Select your preferred categories
        {maxCategories && (
          <span className="text-sm text-muted-foreground ml-2">
            (Max {maxCategories})
          </span>
        )}
      </h3>
      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category: string) => (
            <div
              key={category}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
            >
              <Checkbox
                id={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => onCategorySelect(category)}
              />
              <label
                htmlFor={category}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {category}
              </label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
