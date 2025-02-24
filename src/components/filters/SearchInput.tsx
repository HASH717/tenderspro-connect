import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchInput = ({ value, onChange }: SearchInputProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Input
        placeholder={t("filters.search")}
        className="bg-white/80 backdrop-blur-sm border-muted/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
