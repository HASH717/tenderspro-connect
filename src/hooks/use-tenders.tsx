import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TenderFilters } from "@/components/TenderFilters";
import { toast } from "sonner";

export const useTenders = (filters: TenderFilters) => {
  return useQuery({
    queryKey: ['tenders', filters],
    queryFn: async () => {
      console.log('Fetching tenders with filters:', filters);
      let query = supabase
        .from('tenders')
        .select('*');

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.wilaya) {
        query = query.ilike('wilaya', `%${filters.wilaya}%`);
      }

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