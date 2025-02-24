
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
          .or('status.eq.active,status.eq.trial')
          .maybeSingle();

        if (subscriptionError) {
          console.error('Error fetching subscription:', subscriptionError);
          return null;
        }

        if (!subscription) return null;

        // Check if subscription has expired
        if (new Date(subscription.current_period_end) <= new Date()) {
          return null;
        }

        // Trial users or Enterprise plan users get full access
        if (subscription.status === 'trial' || subscription.plan === 'Enterprise') {
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
        .select('*')
        .order('publication_date', { ascending: false });

      // Apply search filter
      if (filters.search?.trim()) {
        query = query.ilike('title', `%${filters.search.trim()}%`);
      }

      // Apply wilaya (region) filter
      if (filters.wilaya) {
        // Extract wilaya name from the format "number - name"
        const wilayaName = filters.wilaya.split(' - ')[1];
        if (wilayaName) {
          query = query.eq('wilaya', wilayaName);
        }
      }

      // Apply tender type filter
      if (filters.tenderType?.trim()) {
        query = query.ilike('type', filters.tenderType.trim());
      }

      // Apply category filter
      if (filters.category?.trim()) {
        query = query.ilike('category', filters.category.trim());
      }

      const { data: tenders, error } = await query;
      
      if (error) {
        console.error('Error fetching tenders:', error);
        toast.error('Failed to load tenders');
        return [];
      }

      // If user is not logged in or has no active/trial subscription, blur all tenders except first 3
      if (!session?.user?.id || !subscriptionData?.subscription) {
        return tenders.map((tender, index) => ({
          ...tender,
          isBlurred: index >= 3
        }));
      }

      // If user has a trial subscription or Enterprise plan, show all tenders
      if (subscriptionData.subscription.status === 'trial' || 
          subscriptionData.subscription.plan === 'Enterprise') {
        return tenders.map(tender => ({
          ...tender,
          isBlurred: false
        }));
      }

      // For other subscriptions, check category restrictions
      if (subscriptionData.categories) {
        return tenders.map(tender => ({
          ...tender,
          isBlurred: !subscriptionData.categories.includes(tender.category)
        }));
      }

      return tenders || [];
    }
  });
};
