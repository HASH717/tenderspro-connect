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
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
        return null;
      }

      // Get profile with preferred categories
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

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

      if (filters.tenderType) {
        query = query.eq('type', filters.tenderType);
      }

      // Category filtering based on subscription
      if (session?.user?.id && userSubscriptionData?.subscription) {
        const { preferredCategories } = userSubscriptionData;
        
        // If user has preferred categories, filter by them
        if (preferredCategories && preferredCategories.length > 0) {
          query = query.in('category', preferredCategories);
          
          if (filters.category) {
            // Additional category filter if specified
            query = query.eq('category', filters.category);
          }
        }
      } else if (filters.category) {
        // For non-subscribed users or when no subscription is active
        query = query.eq('category', filters.category);
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