
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { ScraperProgress } from "./scraper/ScraperProgress";
import { useScraper } from "./scraper/useScraper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AdminScraper = () => {
  const { isLoading, progress, handleScrape, convertExistingImages, processWatermarks } = useScraper();
  const { t } = useTranslation();

  const processSpecificTender = async () => {
    try {
      const tenderId = "358ea8b8-6fc7-44d1-bc45-64aeb11af376";
      
      const { data, error } = await supabase.functions.invoke('process-complete-watermark', {
        body: { tenderId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Tender processed successfully');
      } else {
        toast.error('Failed to process tender');
      }
    } catch (error) {
      console.error('Error processing tender:', error);
      toast.error('Error processing tender');
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
          onClick={convertExistingImages} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Converting..." : "Convert Existing Images to PNG"}
        </Button>

        <Button 
          onClick={processWatermarks} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Processing..." : "Process Watermarks"}
        </Button>

        <Button 
          onClick={processSpecificTender} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Processing..." : "Process Specific Tender"}
        </Button>
        
        <ScraperProgress progress={progress} isLoading={isLoading} />
      </div>
    </Card>
  );
};
