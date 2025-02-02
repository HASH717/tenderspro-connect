import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TenderCardProps {
  id: string;
  title: string;
  organization: string;
  location: string;
  deadline: string;
  publicationDate?: string;
  isFavorite: boolean;
  isBlurred?: boolean;
  onFavorite: () => void;
}

export const TenderCard = ({
  id,
  title,
  organization,
  location,
  deadline,
  publicationDate,
  isFavorite,
  isBlurred = false,
  onFavorite,
}: TenderCardProps) => {
  return (
    <Card className="relative">
      <CardContent className={`p-6 ${isBlurred ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-grow">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {title}
            </h3>
            <p className="text-muted-foreground line-clamp-1">{organization}</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              onFavorite();
            }}
            className="group flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-100"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className="h-5 w-5 transition-colors group-hover:text-red-500 group-hover:fill-red-500"
              fill={isFavorite ? "#ef4444" : "none"}
              stroke={isFavorite ? "#ef4444" : "currentColor"}
            />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="flex-1">Location: {location}</span>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <span className="flex-1">
              Deadline: {deadline}
            </span>
          </div>

          {publicationDate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="flex-1">
                Published: {formatDistanceToNow(new Date(publicationDate), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = `/tenders/${id}`}
          >
            View Details
          </Button>
        </div>
      </CardContent>
      {isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg">
          <Button
            variant="default"
            onClick={() => window.location.href = '/subscriptions'}
            className="bg-primary hover:bg-primary/90"
          >
            Upgrade to View
          </Button>
        </div>
      )}
    </Card>
  );
};