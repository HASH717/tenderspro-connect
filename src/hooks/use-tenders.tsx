import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenderFilters } from "@/components/TenderFilters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useTenders = (filters: TenderFilters) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['tenders', filters],
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

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching tenders:', error);
        toast.error('Failed to load tenders');
        return [];
      }

      console.log('Fetched tenders:', data);
      return data || [];
    }
  });
};