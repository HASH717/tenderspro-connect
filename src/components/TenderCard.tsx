import { Calendar, MapPin, Building, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TenderCardProps {
  title: string;
  organization: string;
  location: string;
  deadline: string;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

const TenderCard = ({
  title,
  organization,
  location,
  deadline,
  onFavorite,
  isFavorite = false,
}: TenderCardProps) => {
  return (
    <Card className="p-4 mb-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
          <div className="space-y-2">
            <div className="flex items-center text-gray-600">
              <Building className="w-4 h-4 mr-2" />
              <span className="text-sm">{organization}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="text-sm">{location}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-sm">Deadline: {deadline}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onFavorite}
          className={`p-2 rounded-full ${
            isFavorite ? "text-red-500" : "text-gray-400"
          }`}
        >
          <Heart className="w-6 h-6" />
        </button>
      </div>
    </Card>
  );
};

export default TenderCard;