
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenderFilters } from "@/components/TenderFilters";

export const useTenders = (filters: TenderFilters) => {
  return useQuery({
    queryKey: ['tenders', filters],
    queryFn: async () => {
      console.log('Fetching tenders with filters:', filters);
      
      let query = supabase
        .from('tenders')
        .select('*')
        .order('publication_date', { ascending: false });

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.wilaya) {
        query = query.eq('wilaya', filters.wilaya);
      }

      if (filters.tenderType) {
        query = query.eq('type', filters.tenderType);
      }

      if (filters.announcers) {
        query = query.ilike('organization_name', `%${filters.announcers}%`);
      }

      if (filters.publicationDate) {
        query = query.gte('publication_date', filters.publicationDate);
      }

      if (filters.deadlineDate) {
        query = query.lte('deadline', filters.deadlineDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tenders:', error);
        throw error;
      }

      return data || [];
    }
  });
};
