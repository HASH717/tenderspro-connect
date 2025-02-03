import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PreferencesTabProps {
  currentLanguage: string;
  onLanguageChange: (value: 'en' | 'fr' | 'ar') => void;
  preferredCategories?: string[];
}

export const PreferencesTab = ({ currentLanguage, onLanguageChange, preferredCategories }: PreferencesTabProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-lg border space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
          {t("profile.preferences.language")}
        </h3>
        <RadioGroup
          value={currentLanguage}
          onValueChange={(value: 'en' | 'fr' | 'ar') => onLanguageChange(value)}
          className="flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="en" id="en" />
            <Label htmlFor="en">English</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fr" id="fr" />
            <Label htmlFor="fr">Français</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ar" id="ar" />
            <Label htmlFor="ar">العربية</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
          {t("profile.preferences.categories")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {preferredCategories?.map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}
          {(!preferredCategories || preferredCategories.length === 0) && (
            <p className="text-sm text-muted-foreground">
              {t("profile.preferences.no_categories")}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/onboarding')}
          className="mt-2"
        >
          {t("profile.preferences.update_categories")}
        </Button>
      </div>
    </div>
  );
};