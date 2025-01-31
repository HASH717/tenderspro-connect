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
      if (!session?.user?.id) return null;

      // Get subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      // Get profile with preferred categories
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', session.user.id)
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
        query = query.eq('wilaya', filters.wilaya);
      }

      // Category filtering based on subscription
      if (session?.user?.id && userSubscriptionData?.subscription) {
        const { preferredCategories } = userSubscriptionData;
        
        // If user has preferred categories, filter by them
        if (preferredCategories && preferredCategories.length > 0) {
          if (filters.category) {
            // If a specific category is selected and it's in preferred categories
            if (preferredCategories.includes(filters.category)) {
              query = query.eq('category', filters.category);
            } else {
              return []; // Return empty if filtered category isn't in preferences
            }
          } else {
            // Show all tenders from preferred categories
            query = query.in('category', preferredCategories);
          }
        }
      } else if (filters.category) {
        // For non-subscribed users or when no subscription is active
        query = query.eq('category', filters.category);
      }
      
      // Apply remaining filters
      if (filters.tenderType) {
        query = query.eq('type', filters.tenderType);
      }

      if (filters.publicationDate) {
        query = query.eq('publication_date', filters.publicationDate);
      }

      if (filters.deadlineDate) {
        query = query.eq('deadline', filters.deadlineDate);
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