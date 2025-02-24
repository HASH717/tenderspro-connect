import React, { useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label: string;
  className?: string;
  maxSelections?: number;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  label,
  className,
  maxSelections,
}: MultiSelectProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (maxSelections && selectedValues.length > maxSelections) {
      const truncatedValues = selectedValues.slice(0, maxSelections);
      onChange(truncatedValues);
      toast({
        variant: "destructive",
        title: "Selection limit exceeded",
        description: `You can only select up to ${maxSelections} categories with your current plan.`,
      });
    }
  }, [selectedValues, maxSelections, onChange, toast]);

  const handleToggle = (value: string) => {
    if (maxSelections && !selectedValues.includes(value) && selectedValues.length >= maxSelections) {
      toast({
        variant: "destructive",
        title: "Selection limit reached",
        description: `You can only select up to ${maxSelections} categories with your current plan.`,
      });
      return;
    }

    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  const handleSelectAll = () => {
    if (maxSelections && options.length > maxSelections) {
      toast({
        variant: "destructive",
        title: "Selection limit exceeded",
        description: `You can only select up to ${maxSelections} categories with your current plan.`,
      });
      return;
    }

    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSelectAll}
          className="text-xs"
        >
          Select all
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleToggle(option.value)}
            className={cn(
              "flex items-center gap-2 p-2 text-sm rounded-md border transition-colors",
              "hover:bg-muted",
              selectedValues.includes(option.value)
                ? "bg-accent text-accent-foreground hover:text-gray-800"
                : "bg-background"
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 w-4 h-4 border rounded-sm flex items-center justify-center",
                selectedValues.includes(option.value)
                  ? "bg-primary border-primary"
                  : "border-primary"
              )}
            >
              {selectedValues.includes(option.value) && (
                <Check className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
            <span className="text-left flex-1 min-w-0 break-words">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
