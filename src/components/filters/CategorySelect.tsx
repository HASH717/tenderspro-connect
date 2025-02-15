
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
import { Separator } from "@/components/ui/separator";

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
        .neq('category', '');

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
        return [];
      }

      const uniqueCategories = Array.from(new Set(data.map(tender => tender.category)))
        .filter(Boolean)
        .sort();

      return uniqueCategories;
    }
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-data', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      try {
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscriptionError) throw subscriptionError;

        if (!subscription) {
          const { data: trialSub, error: trialError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'trial')
            .maybeSingle();

          if (trialError) throw trialError;
          if (!trialSub) return null;

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('preferred_categories')
            .eq('id', session.user.id)
            .single();

          if (profileError) throw profileError;

          return {
            subscription: trialSub,
            categories: profile.preferred_categories || []
          };
        }

        if (subscription.plan === 'Enterprise') {
          return { subscription, categories: null }; // null means no restrictions
        }

        const { data: subCategories, error: categoriesError } = await supabase
          .from('subscription_categories')
          .select('categories')
          .eq('subscription_id', subscription.id)
          .maybeSingle();

        if (categoriesError) throw categoriesError;

        return {
          subscription,
          categories: subCategories?.categories || []
        };
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        return null;
      }
    }
  });

  const isCategoryAccessible = (category: string) => {
    if (!session?.user?.id) return true;
    if (!subscriptionData?.subscription) return false;
    
    if (subscriptionData.subscription.status === 'trial' || 
        subscriptionData.subscription.plan === 'Enterprise') {
      return true;
    }
    
    return subscriptionData.categories?.includes(category);
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

  // Split categories into accessible and locked
  const categorizeItems = () => {
    const accessible: string[] = [];
    const locked: string[] = [];

    allCategories.forEach(category => {
      if (isCategoryAccessible(category)) {
        accessible.push(category);
      } else {
        locked.push(category);
      }
    });

    // Move selected category to the top if it exists
    if (value && accessible.includes(value)) {
      accessible.splice(accessible.indexOf(value), 1);
      accessible.unshift(value);
    }

    return { accessible, locked };
  };

  const { accessible, locked } = categorizeItems();

  return (
    <Select value={value} onValueChange={handleCategorySelect}>
      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
        <SelectValue placeholder={t("filters.category")} />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-[300px]">
          {/* Accessible Categories */}
          {accessible.map((category) => (
            <SelectItem 
              key={category} 
              value={category}
              className="flex items-center justify-between"
            >
              <span>{category}</span>
            </SelectItem>
          ))}

          {/* Separator between accessible and locked categories */}
          {locked.length > 0 && accessible.length > 0 && (
            <Separator className="my-2" />
          )}

          {/* Locked Categories */}
          {locked.map((category) => (
            <SelectItem 
              key={category} 
              value={category}
              className="flex items-center justify-between text-muted-foreground"
              disabled
            >
              <span>{category}</span>
              <Lock className="h-4 w-4 ml-2 inline-block" />
            </SelectItem>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};
