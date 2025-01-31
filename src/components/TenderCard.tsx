import { Calendar, MapPin, Building, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface TenderCardProps {
  id: string;
  title: string;
  organization: string;
  location: string;
  deadline: string;
  publicationDate?: string;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

export const TenderCard = ({
  id,
  title,
  organization,
  location,
  deadline,
  publicationDate,
  onFavorite,
  isFavorite = false,
}: TenderCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getCategoryTranslation = (org: string) => {
    const categoryMap: { [key: string]: string } = {
      "Construction": "construction",
      "Transport": "transport",
      "Education": "education",
      "Chemical Supply": "chemical"
    };
    const category = categoryMap[org];
    return category ? t(`tender.categories.${category}`) : org;
  };

  const getTitleTranslation = (title: string) => {
    const titleMap: { [key: string]: string } = {
      "Travaux de réalisation en tce 300 lpa et 48 lpl": "tender1",
      "Réalisation des 08 logements promotionnels tce + vrd": "tender2",
      "Micro-entreprises Travaux de réalisation d'un lycée type 1000 en 04 lots": "tender3",
      "Transport de matériaux": "tender4",
      "Fourniture et transport d'une quantité minimale de 1300 tonnes et quantité de 2500 tonnes de sulfate d'alumine granulé": "tender5"
    };
    const titleKey = titleMap[title];
    return titleKey ? t(`tender.titles.${titleKey}`) : title;
  };

  const getLocationTranslation = (loc: string) => {
    const locationMap: { [key: string]: string } = {
      "Mascara": "mascara",
      "Sidi-Bel-Abbès": "sidi_bel_abbes",
      "Tizi-Ouzou": "tizi_ouzou",
      "Algiers": "algiers",
      "Annaba": "annaba"
    };
    const locationKey = locationMap[loc];
    return locationKey ? t(`tender.locations.${locationKey}`) : loc;
  };

  return (
    <Card 
      className="p-4 mb-4 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white via-white to-muted/30 backdrop-blur-sm border border-muted/50"
      onClick={() => navigate(`/tender/${id}`)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
            {getTitleTranslation(title)}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center text-[#166534]">
              <Building className="w-4 h-4 mr-2" />
              <span className="text-sm">{getCategoryTranslation(organization)}</span>
            </div>
            <div className="flex items-center text-accent">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="text-sm">{getLocationTranslation(location)}</span>
            </div>
            <div className="flex items-center text-[#F97316]">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-sm">{t('tender.deadline')}: {deadline}</span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.();
          }}
          className={`p-2 rounded-full transition-colors ${
            isFavorite ? "text-secondary hover:text-secondary/80" : "text-gray-400 hover:text-gray-500"
          }`}
        >
          <Heart className={`w-6 h-6 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>
    </Card>
  );
};