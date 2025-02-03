import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PreferencesTabProps {
  currentLanguage: string;
  onLanguageChange: (value: 'en' | 'fr' | 'ar') => void;
  preferredCategories?: string[];
}

export const PreferencesTab = ({ currentLanguage, onLanguageChange, preferredCategories }: PreferencesTabProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session?.user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  const handleCategoryUpdate = () => {
    if (subscription?.status === 'trial') {
      toast.error("Categories cannot be changed during trial period");
      return;
    }
    
    if (subscription?.status === 'active' && subscription?.plan !== 'Enterprise') {
      navigate('/subscriptions');
      return;
    }

    toast.error("Categories cannot be changed after subscription. Please contact support if you need to modify your categories.");
  };

  return (
    <div className="bg-white p-6 rounded-lg border space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold tracking-tight text-card-foreground">
          Language
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
          Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {preferredCategories?.map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}
          {(!preferredCategories || preferredCategories.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No categories selected
            </p>
          )}
        </div>
        {subscription?.plan !== 'Enterprise' && (
          <Button
            variant="outline"
            onClick={handleCategoryUpdate}
            className="mt-2"
          >
            Upgrade to Change Categories
          </Button>
        )}
      </div>
    </div>
  );
};