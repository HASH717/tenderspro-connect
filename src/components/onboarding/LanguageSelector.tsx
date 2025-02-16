
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  onLanguageChange: (language: string) => void;
}

export const LanguageSelector = ({ onLanguageChange }: LanguageSelectorProps) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Select your language</h3>
      <Select onValueChange={onLanguageChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">
            <div className="flex items-center justify-between w-full">
              <span>English</span>
            </div>
          </SelectItem>
          <SelectItem value="fr">
            <div className="flex items-center justify-between w-full">
              <span>Français</span>
            </div>
          </SelectItem>
          <SelectItem value="ar">
            <div className="flex items-center justify-between w-full">
              <span>العربية</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
