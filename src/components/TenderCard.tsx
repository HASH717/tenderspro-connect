import { Card } from "@/components/ui/card";
import { Building, Calendar, MapPin, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface TenderCardProps {
  id: string;
  title: string;
  organization: string;
  location: string;
  deadline: string;
  category?: string;
  isFavorite?: boolean;
  publicationDate?: string;
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
  publicationDate,
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
    <Card className="hover:shadow-md transition-shadow duration-200 bg-white">
      <div className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <Link
              to={isSubscribed ? `/tenders/${id}` : '/subscriptions'}
              className="block"
            >
              <h3 className="text-lg font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2 mb-2">
                {title}
              </h3>
            </Link>
            {category && (
              <div className="text-emerald-700 text-sm mb-4 font-medium">
                {category}
              </div>
            )}
          </div>
          <button
            onClick={onFavorite}
            className="flex-shrink-0 text-gray-400 group transition-colors"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className="h-5 w-5 transition-colors group-hover:fill-red-500 group-hover:text-red-500"
              fill={isFavorite ? "#ef4444" : "none"}
              style={{ fill: isFavorite ? "#ef4444" : "none" }}
            />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <Building className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{organization}</span>
          </div>
          
          <div className="flex items-center gap-2 text-blue-600">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </div>

          <div className="flex items-center gap-2 text-orange-600">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {t('tender.deadline', 'Deadline')}: {formatDate(deadline)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};