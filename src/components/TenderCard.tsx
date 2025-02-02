import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface TenderCardProps {
  tender: {
    id: string;
    title: string;
    deadline?: string;
    wilaya?: string;
    category?: string;
    organization_name?: string;
  };
  isFavorited?: boolean;
}

const TenderCard = ({ tender, isFavorited = false }: TenderCardProps) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session?.user?.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error('Error fetching subscription:', error);
        return null;
      }
    }
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("User not authenticated");

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('tender_id', tender.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: session.user.id,
            tender_id: tender.id
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(
        isFavorited
          ? t('tender.removedFromFavorites', 'Removed from favorites')
          : t('tender.addedToFavorites', 'Added to favorites')
      );
    },
    onError: (error) => {
      console.error('Error toggling favorite:', error);
      toast.error(t('tender.favoriteError', 'Error updating favorites'));
    }
  });

  const handleFavoriteClick = () => {
    if (!session) {
      toast.error(t('tender.loginRequired', 'Please login to add favorites'));
      return;
    }
    toggleFavorite.mutate();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const isSubscribed = subscription?.status === 'active';

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Link
            to={isSubscribed ? `/tenders/${tender.id}` : '/subscriptions'}
            className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2 flex-1"
          >
            {tender.title}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={`ml-2 ${isFavorited ? 'text-red-500' : 'text-gray-400'}`}
            onClick={handleFavoriteClick}
          >
            <Heart className="h-5 w-5" fill={isFavorited ? "currentColor" : "none"} />
          </Button>
        </div>

        <div className="space-y-2">
          {tender.organization_name && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {tender.organization_name}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2">
            {tender.deadline && (
              <Badge variant="secondary">
                {t('tender.deadline', 'Deadline')}: {formatDate(tender.deadline)}
              </Badge>
            )}
            {tender.wilaya && (
              <Badge variant="outline">{tender.wilaya}</Badge>
            )}
            {tender.category && (
              <Badge variant="outline">{tender.category}</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TenderCard;