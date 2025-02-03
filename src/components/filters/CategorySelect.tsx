import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const CategorySelect = ({ value, onChange }: CategorySelectProps) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();

  const { data: allCategories = [] } = useQuery({
    queryKey: ['all-tender-categories'],
    queryFn: async () => {
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

      const uniqueCategories = Array.from(new Set(data.map(tender => tender.category)))
        .filter(category => category)
        .sort();

      return uniqueCategories;
    }
  });

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
          return null;
        }

        if (!subscription) return null;

        const { data: subCategories, error: categoriesError } = await supabase
          .from('subscription_categories')
          .select('categories')
          .eq('subscription_id', subscription.id)
          .maybeSingle();

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          return {
            subscription,
            categories: []
          };
        }

        return {
          subscription,
          categories: subCategories?.categories || []
        };
      } catch (error) {
        console.error('Error in subscription data fetch:', error);
        return null;
      }
    }
  });

  const isCategoryAccessible = (category: string) => {
    if (!session?.user?.id) return true;
    if (!subscriptionData?.subscription) return false;
    
    if (subscriptionData.subscription.plan === 'Enterprise') return true;
    
    return subscriptionData.categories.includes(category);
  };

  const handleCategorySelect = (category: string) => {
    if (!session?.user?.id) {
      toast.error('Please login to filter by category');
      return;
    }

    if (!isCategoryAccessible(category)) {
      toast.error("This category is not included in your current plan", {
        action: {
          label: "Upgrade",
          onClick: () => navigate('/subscriptions')
        }
      });
      return;
    }

    onChange(category);
  };

  return (
    <Select value={value} onValueChange={handleCategorySelect}>
      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
        <SelectValue placeholder={t("filters.category")} />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-[300px]">
          {allCategories.map((category) => (
            <SelectItem 
              key={category} 
              value={category}
              className="flex items-center justify-between"
              disabled={!isCategoryAccessible(category)}
            >
              <span>{category}</span>
              {!isCategoryAccessible(category) && (
                <Lock className="h-4 w-4 ml-2 inline-block text-muted-foreground" />
              )}
            </SelectItem>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};