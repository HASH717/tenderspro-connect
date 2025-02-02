import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { ScraperProgress } from "./scraper/ScraperProgress";
import { useScraper } from "./scraper/useScraper";

export const AdminScraper = () => {
  const { isLoading, progress, handleScrape, lastProcessedPage } = useScraper();
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <Button 
          onClick={() => handleScrape()} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? t("scraper.loading") : "SYNC TENDERS"}
        </Button>
        
        {lastProcessedPage > 0 && !isLoading && (
          <Button 
            onClick={() => handleScrape(lastProcessedPage)} 
            variant="outline"
            className="w-full"
          >
            Resume from page {lastProcessedPage}
          </Button>
        )}
        
        <ScraperProgress progress={progress} isLoading={isLoading} />
      </div>
    </Card>
  );
};