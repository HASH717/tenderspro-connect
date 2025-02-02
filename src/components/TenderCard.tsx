import { Card } from "@/components/ui/card";
import { Heart, Calendar, MapPin, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface TenderCardProps {
  id: string;
  title: string;
  organization: string;
  location: string;
  deadline: string;
  category?: string;
  isFavorite?: boolean;
  onFavorite: () => void;
}

export const TenderCard = ({ 
  id,
  title,
  organization,
  location,
  deadline,
  category,
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trial';

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <Link
            to={isSubscribed ? `/tenders/${id}` : '/subscriptions'}
            className="flex-1"
          >
            <h3 className="text-lg font-medium text-gray-900 hover:text-primary transition-colors">
              {title}
            </h3>
          </Link>
          <button
            onClick={onFavorite}
            className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart 
              className="h-5 w-5" 
              fill={isFavorite ? "currentColor" : "none"}
            />
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          {category && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <span>{category}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{location}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {t('tender.deadline', 'Deadline')}: {formatDate(deadline)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};