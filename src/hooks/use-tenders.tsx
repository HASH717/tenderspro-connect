import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenderFilters } from "@/components/TenderFilters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useTenders = (filters: TenderFilters) => {
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
          return null;
        }

        if (!subscription) return null;

        if (subscription.plan === 'Enterprise') {
          return { subscription, categories: null }; // null means no restrictions
        }

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

  return useQuery({
    queryKey: ['tenders', filters, session?.user?.id, subscriptionData],
    queryFn: async () => {
      console.log('Fetching tenders with filters:', filters);
      let query = supabase
        .from('tenders')
        .select('*');

      // Apply basic filters
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.wilaya) {
        query = query.eq('wilaya', filters.wilaya);
      }

      if (filters.tenderType) {
        query = query.eq('type', filters.tenderType);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data: tenders, error } = await query;
      
      if (error) {
        console.error('Error fetching tenders:', error);
        toast.error('Failed to load tenders');
        return [];
      }

      // If user is logged in and has a subscription, filter by allowed categories
      if (session?.user?.id && subscriptionData?.subscription) {
        if (subscriptionData.subscription.plan !== 'Enterprise' && subscriptionData.categories) {
          return tenders.map(tender => ({
            ...tender,
            isBlurred: !subscriptionData.categories.includes(tender.category)
          }));
        }
      }

      return tenders || [];
    }
  });
};