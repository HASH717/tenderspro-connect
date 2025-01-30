import React from "react";
import { Check } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

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
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  label,
  className,
}: MultiSelectProps) {
  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  const handleSelectAll = () => {
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
                ? "bg-accent text-accent-foreground"
                : "bg-background"
            )}
          >
            <div
              className={cn(
                "w-4 h-4 border rounded-sm flex items-center justify-center",
                selectedValues.includes(option.value)
                  ? "bg-primary border-primary"
                  : "border-primary"
              )}
            >
              {selectedValues.includes(option.value) && (
                <Check className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
            <span className="text-left">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}