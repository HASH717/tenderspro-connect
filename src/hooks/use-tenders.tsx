import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenderFilters } from "@/components/TenderFilters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useTenders = (filters: TenderFilters) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['tenders', filters, session?.user?.id],
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

      // If user is logged in and has selected a category, filter by their subscription status
      if (session?.user?.id && filters.category) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: trialSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'trial')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const isTrialValid = trialSub && new Date(trialSub.current_period_end) > new Date();
        const hasActiveSubscription = subscription?.status === 'active';

        if (!hasActiveSubscription && !isTrialValid) {
          return tenders.map(tender => ({
            ...tender,
            isBlurred: true
          }));
        }
      }

      return tenders || [];
    }
  });
};