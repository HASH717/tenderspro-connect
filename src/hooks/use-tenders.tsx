import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenderFilters } from "@/components/TenderFilters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useTenders = (filters: TenderFilters) => {
  const { session } = useAuth();

  // First query to get user's subscription and preferred categories
  const { data: userSubscriptionData } = useQuery({
    queryKey: ['subscription-and-categories', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      // Get subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session?.user?.id)
        .eq('status', 'active')
        .single();

      // Get profile with preferred categories
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', session?.user?.id)
        .single();

      return {
        subscription,
        preferredCategories: profile?.preferred_categories || []
      };
    }
  });

  // Main query for tenders with category filtering
  return useQuery({
    queryKey: ['tenders', filters, userSubscriptionData],
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
        query = query.ilike('wilaya', `%${filters.wilaya}%`);
      }

      // Category filtering based on subscription
      if (session?.user?.id && userSubscriptionData?.subscription) {
        const { subscription, preferredCategories } = userSubscriptionData;
        
        // If user has a subscription and preferred categories, filter by them
        if (preferredCategories.length > 0) {
          query = query.in('category', preferredCategories);
        }
      }
      
      // Apply remaining filters
      if (filters.category) {
        query = query.ilike('category', `%${filters.category}%`);
      }

      if (filters.tenderType) {
        query = query.ilike('type', `%${filters.tenderType}%`);
      }

      if (filters.publicationDate) {
        query = query.eq('publication_date', filters.publicationDate);
      }

      if (filters.deadlineDate) {
        query = query.eq('deadline', filters.deadlineDate);
      }

      if (filters.priceRange) {
        const [min, max] = filters.priceRange.split('-').map(Number);
        const priceField = 'specifications_price';
        
        if (max) {
          query = query
            .gte(priceField, min.toString())
            .lte(priceField, max.toString());
        } else {
          query = query.gte(priceField, min.toString());
        }
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching tenders:', error);
        toast.error('Failed to load tenders');
        return [];
      }

      return data || [];
    }
  });
};