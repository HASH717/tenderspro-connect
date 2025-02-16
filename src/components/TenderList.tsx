
import { TenderCard } from "@/components/TenderCard";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { LoadingState } from "./tenders/LoadingState";
import { EmptyState } from "./tenders/EmptyState";
import { ShowMoreButton } from "./tenders/ShowMoreButton";

interface TenderListProps {
  tenders: any[];
  isLoading: boolean;
}

export const TenderList = ({ tenders, isLoading }: TenderListProps) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [displayCount, setDisplayCount] = useState(10);

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

  const toggleFavorite = async (tenderId: string) => {
    if (!session?.user?.id) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      const isFavorite = favorites.includes(tenderId);
      
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('tender_id', tenderId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: session.user.id,
            tender_id: tenderId
          });

        if (error) throw error;
      }
      
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || 'Failed to update favorites');
    }
  };

  if (isLoading || isLoadingFavorites) return <LoadingState />;
  if (!tenders || tenders.length === 0) return <EmptyState />;

  const displayedTenders = tenders.slice(0, displayCount);
  const hasMore = displayCount < tenders.length;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {displayedTenders.map((tender) => (
          <TenderCard
            key={tender.id}
            id={tender.id}
            title={tender.title || ""}
            organization={tender.organization_name || tender.category || "Unknown"}
            location={tender.region || tender.wilaya || "Unknown"}
            deadline={tender.deadline || "Not specified"}
            publicationDate={tender.publication_date}
            isFavorite={favorites.includes(tender.id)}
            onFavorite={() => toggleFavorite(tender.id)}
            isBlurred={tender.isBlurred}
          />
        ))}
      </div>
      
      {hasMore && (
        <ShowMoreButton onClick={() => setDisplayCount(prev => prev + 10)} />
      )}
    </div>
  );
};
