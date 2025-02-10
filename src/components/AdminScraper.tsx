
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { ScraperProgress } from "./scraper/ScraperProgress";
import { useScraper } from "./scraper/useScraper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminScraper = () => {
  const { isLoading, progress, handleScrape } = useScraper();
  const { t } = useTranslation();

  const processAllTenders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-complete-watermark', {
        body: {} // No tenderId means process all
      });

      if (error) throw error;

      if (data.success) {
        if (data.creditLimitReached) {
          toast.warning('Credit limit reached. Processing stopped.');
        }
        toast.success(data.message);
      } else {
        toast.error('Failed to process tenders');
      }
    } catch (error) {
      console.error('Error processing tenders:', error);
      toast.error('Error processing tenders');
    }
  };

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

        <Button 
          onClick={processAllTenders} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Processing..." : "Process All Unprocessed Tenders"}
        </Button>
        
        <ScraperProgress progress={progress} isLoading={isLoading} />
      </div>
    </Card>
  );
};
