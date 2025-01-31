import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { TenderList } from "@/components/TenderList";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

const Favorites = () => {
  const { session } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const { data: favorites = [], isLoading: isFavoritesLoading } = useQuery({
    queryKey: ['favorites', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data: favorites, error: favoritesError } = await supabase
        .from('favorites')
        .select('tender_id')
        .eq('user_id', session?.user?.id);

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        return [];
      }

      return favorites.map(f => f.tender_id).filter(Boolean);
    }
  });

  const { data: tenders = [], isLoading: isTendersLoading } = useQuery({
    queryKey: ['favorited-tenders', favorites],
    enabled: favorites.length > 0,
    queryFn: async () => {
      if (!favorites.length) return [];
      
      const { data: tenders, error: tendersError } = await supabase
        .from('tenders')
        .select('*')
        .in('id', favorites);

      if (tendersError) {
        console.error('Error fetching tenders:', tendersError);
        return [];
      }

      return tenders || [];
    }
  });

  const isLoading = isFavoritesLoading || isTendersLoading;

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl font-bold text-primary mb-4">{t("pages.favorites")}</h1>
            <div className="flex flex-col items-center justify-center mt-20">
              <Heart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">{t("pages.pleaseLogin")}</p>
            </div>
          </div>
        </div>
        <div className="mt-20">
          <Footer />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl font-bold text-primary mb-4">{t("pages.favorites")}</h1>
            <div className="text-center py-8">Loading favorites...</div>
          </div>
        </div>
        <div className="mt-20">
          <Footer />
        </div>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl font-bold text-primary mb-4">{t("pages.favorites")}</h1>
            <div className="flex flex-col items-center justify-center mt-20">
              <Heart className="w-16 h-6 text-gray-300 mb-4" />
              <p className="text-gray-500">{t("pages.noFavorites")}</p>
            </div>
          </div>
        </div>
        <div className="mt-20">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-primary mb-4">{t("pages.favorites")}</h1>
          <TenderList 
            tenders={tenders} 
            isLoading={isLoading}
          />
        </div>
      </div>
      <div className="mt-20">
        <Footer />
      </div>
    </div>
  );
};

export default Favorites;