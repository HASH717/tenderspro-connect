import { useEffect, useState } from "react";
import { TenderCard } from "@/components/TenderCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface TenderListProps {
  tenders: any[];
  isLoading: boolean;
}

export const TenderList = ({ tenders, isLoading }: TenderListProps) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Fetch user's favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('favorites')
        .select('tender_id')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      setFavorites(data.map(fav => fav.tender_id));
    };

    fetchFavorites();
  }, [session?.user?.id]);

  const toggleFavorite = async (tenderId: string) => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    const isFavorite = favorites.includes(tenderId);

    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('tender_id', tenderId);

      if (error) {
        console.error('Error removing favorite:', error);
        toast({
          title: "Error",
          description: "Failed to remove from favorites",
          variant: "destructive",
        });
        return;
      }

      setFavorites(favorites.filter(id => id !== tenderId));
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: session.user.id,
          tender_id: tenderId,
        });

      if (error) {
        console.error('Error adding favorite:', error);
        toast({
          title: "Error",
          description: "Failed to add to favorites",
          variant: "destructive",
        });
        return;
      }

      setFavorites([...favorites, tenderId]);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    );
  }

  if (!tenders.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tenders found matching your criteria
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tenders.map((tender) => (
          <TenderCard
            key={tender.id}
            id={tender.id}
            title={tender.title}
            organization={tender.organization_name || 'Unknown Organization'}
            location={tender.wilaya}
            deadline={tender.deadline}
            category={tender.category}
            publicationDate={tender.publication_date}
            isFavorite={favorites.includes(tender.id)}
            onFavorite={() => toggleFavorite(tender.id)}
            isBlurred={tender.isBlurred}
          />
        ))}
      </div>
    </div>
  );
};