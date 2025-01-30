import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

export const AdminScraper = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { t } = useTranslation();

  const handleScrape = async () => {
    setIsLoading(true);
    setProgress(25);

    try {
      console.log('Starting scraping process...');
      
      const { data, error } = await supabase.functions.invoke('scrape-tenders', {
        body: { 
          batchSize: 5, // Start with a smaller batch size for testing
          startPage: 1,
          maxPages: 10 // Test with fewer pages first
        },
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (error) {
        console.error('Detailed error:', error);
        let errorMessage = t("scraper.errorDescription");
        
        try {
          if (typeof error.message === 'string') {
            const errorBody = JSON.parse(error.message);
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          }
        } catch {
          errorMessage = error.message || t("scraper.errorDescription");
        }
        
        // Add specific handling for network errors
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          errorMessage = t("scraper.networkError");
          console.error('Network error details:', error);
        }
        
        throw new Error(errorMessage);
      }
      
      setProgress(100);
      toast({
        title: t("scraper.success"),
        description: t("scraper.successDescription", { count: data?.count || 0 }),
      });
      
      console.log('Scraping completed successfully:', data);
    } catch (error) {
      console.error('Error in scraping process:', error);
      let errorMessage = error instanceof Error ? error.message : t("scraper.errorDescription");
      
      toast({
        title: t("scraper.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">{t("scraper.title")}</h2>
      <div className="space-y-4">
        <Button 
          onClick={handleScrape} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? t("scraper.loading") : t("scraper.start")}
        </Button>
        {isLoading && (
          <Progress value={progress} className="w-full" />
        )}
      </div>
    </Card>
  );
};