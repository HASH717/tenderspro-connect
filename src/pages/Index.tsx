import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import TenderCard from "@/components/TenderCard";
import TenderFilters, { TenderFilters as FilterType } from "@/components/TenderFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { AdminScraper } from "@/components/AdminScraper";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [filters, setFilters] = useState<FilterType>({
    search: "",
    announcers: "",
    type: "",
    category: "",
    wilaya: "",
    priceRange: "",
    microEnterprises: false,
    publicationDate: "",
    deadlineDate: "",
  });
  
  const isMobile = useIsMobile();
  const { session } = useAuth();

  // Query to fetch tenders
  const { data: tenders = [], isLoading: isLoadingTenders } = useQuery({
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

      if (filters.type) {
        query = query.ilike('type', `%${filters.type}%`);
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

  // Query to fetch user's favorites
  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['favorites', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('tender_id')
        .eq('user_id', session?.user?.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        toast.error('Failed to load favorites');
        return [];
      }

      return data.map(fav => fav.tender_id);
    }
  });

  const handleSearch = (newFilters: FilterType) => {
    console.log('Applying filters:', newFilters);
    setFilters(newFilters);
  };

  const toggleFavorite = async (tenderId: string) => {
    if (!session?.user?.id) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      const isFavorite = favorites.includes(tenderId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('tender_id', tenderId);

        if (error) throw error;
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: session.user.id,
            tender_id: tenderId
          });

        if (error) throw error;
        toast.success('Added to favorites');
      }

      // Invalidate the favorites query to trigger a refresh
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || 'Failed to update favorites');
    }
  };

  const logoSrc = "/lovable-uploads/c1c4772c-d5f0-499c-b16f-ae8dcefaa6c3.png";

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      <Navigation />
      <div className={`${isMobile ? '' : 'mt-20'}`}>
        <div className="bg-background z-10">
          <div className="max-w-4xl mx-auto px-4">
            {isMobile && (
              <div className="flex flex-col items-center mb-4">
                <img 
                  src={logoSrc}
                  alt="TendersPro Logo" 
                  className="h-12 mb-1"
                />
              </div>
            )}
            {session?.user.email === "motraxagency@gmail.com" && (
              <div className="mb-6">
                <AdminScraper />
              </div>
            )}
            <TenderFilters onSearch={handleSearch} />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4">
          <Separator className="my-6" />
        </div>

        <div className="max-w-4xl mx-auto px-4">
          {isLoadingTenders || isLoadingFavorites ? (
            <div className="text-center py-8">Loading tenders...</div>
          ) : tenders.length === 0 ? (
            <div className="text-center py-8">No tenders found</div>
          ) : (
            tenders.map((tender) => (
              <TenderCard
                key={tender.id}
                id={tender.id}
                title={tender.title}
                organization={tender.category || "Unknown"}
                location={tender.region || tender.wilaya || "Unknown"}
                deadline={tender.deadline || "Not specified"}
                publicationDate={tender.publication_date}
                isFavorite={favorites.includes(tender.id)}
                onFavorite={() => toggleFavorite(tender.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;