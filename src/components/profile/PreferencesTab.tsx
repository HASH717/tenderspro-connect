import { useTranslation } from "react-i18next";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PreferencesTabProps {
  currentLanguage: string;
  onLanguageChange: (value: 'en' | 'fr' | 'ar') => void;
  preferredCategories?: string[];
}

export const PreferencesTab = ({ currentLanguage, onLanguageChange, preferredCategories }: PreferencesTabProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-categories', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      try {
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscriptionError) {
          console.error('Error fetching subscription:', subscriptionError);
          return preferredCategories || [];
        }

        // If no active subscription or it's Enterprise plan, return preferred categories
        if (!subscription || subscription.plan === 'Enterprise') {
          return preferredCategories || [];
        }

        const { data: subCategories, error: categoriesError } = await supabase
          .from('subscription_categories')
          .select('categories')
          .eq('subscription_id', subscription.id)
          .maybeSingle();

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          return preferredCategories || [];
        }

        return Array.isArray(subCategories?.categories) ? subCategories.categories : preferredCategories || [];
      } catch (error) {
        console.error('Error in subscription data fetch:', error);
        return preferredCategories || [];
      }
    }
  });

  // Ensure we always have an array to work with, prioritizing subscription data if available
  const displayCategories = Array.isArray(subscriptionData) && subscriptionData.length > 0 
    ? subscriptionData 
    : Array.isArray(preferredCategories) ? preferredCategories : [];

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
          {displayCategories.length > 0 ? (
            displayCategories.map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No categories selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
