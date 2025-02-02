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
  id: string;
  title: string;
  organization: string;
  location: string;
  deadline: string;
  publicationDate?: string;
  isFavorite?: boolean;
  onFavorite: () => void;
}

export const TenderCard = ({ 
  id,
  title,
  organization,
  location,
  deadline,
  publicationDate,
  isFavorite = false,
  onFavorite
}: TenderCardProps) => {
  const { session } = useAuth();
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
            to={isSubscribed ? `/tenders/${id}` : '/subscriptions'}
            className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2 flex-1"
          >
            {title}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={`ml-2 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}
            onClick={onFavorite}
          >
            <Heart className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-1">
            {organization}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {t('tender.deadline', 'Deadline')}: {formatDate(deadline)}
            </Badge>
            <Badge variant="outline">{location}</Badge>
            {publicationDate && (
              <Badge variant="outline">
                {t('tender.published', 'Published')}: {formatDate(publicationDate)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};