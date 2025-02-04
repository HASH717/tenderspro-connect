import { Button } from "@/components/ui/button";

interface FilterActionsProps {
  onClear: () => void;
}

export const FilterActions = ({ onClear }: FilterActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button 
        variant="outline"
        onClick={onClear}
        className="w-full sm:w-auto bg-white/80 backdrop-blur-sm hover:bg-white/90"
      >
        Clear Filters
      </Button>
    </div>
  );
};