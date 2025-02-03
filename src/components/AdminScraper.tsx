import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { ScraperProgress } from "./scraper/ScraperProgress";
import { useScraper } from "./scraper/useScraper";

export const AdminScraper = () => {
  const { isLoading, progress, handleScrape } = useScraper();
  const { t } = useTranslation();

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <Button 
          onClick={handleScrape} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? t("scraper.loading") : "CHECK NEW TENDERS"}
        </Button>
        
        <ScraperProgress progress={progress} isLoading={isLoading} />
      </div>
    </Card>
  );
};