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

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
        toast.error('Failed to load subscription data');
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast.error('Failed to load profile data');
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
    queryKey: ['tenders', filters, userSubscriptionData, session?.user?.id],
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
          if (filters.category) {
            // If a specific category is selected, it must be in preferred categories
            if (!preferredCategories.includes(filters.category)) {
              return []; // Return empty if selected category isn't in preferences
            }
            query = query.eq('category', filters.category);
          } else {
            // Show all tenders from preferred categories
            query = query.in('category', preferredCategories);
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