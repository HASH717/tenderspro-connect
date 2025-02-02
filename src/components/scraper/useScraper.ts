import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const useScraper = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { t } = useTranslation();

  const handleScrape = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setProgress(0);
    let currentPage = 1;
    const TOTAL_PAGES = 667;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    try {
      while (currentPage <= TOTAL_PAGES) {
        if (retryCount >= MAX_RETRIES) {
          throw new Error(`Failed after ${MAX_RETRIES} retries on page ${currentPage}`);
        }

        try {
          console.log(`Attempting to scrape page ${currentPage}`);
          const { data, error } = await supabase.functions.invoke('scrape-tenders', {
            body: { page: currentPage },
            headers: { 'Content-Type': 'application/json' }
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'Unknown error occurred');

          const progressPercentage = Math.min((currentPage / TOTAL_PAGES) * 100, 100);
          setProgress(progressPercentage);
          
          console.log(`Successfully processed page ${currentPage}/${TOTAL_PAGES}`);
          
          toast({
            title: t("scraper.batchSuccess"),
            description: t("scraper.batchDescription", { 
              current: currentPage,
              total: TOTAL_PAGES,
              count: data.count 
            }),
          });

          currentPage++;
          retryCount = 0;
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error on page ${currentPage}:`, error);
          retryCount++;
          
          toast({
            title: t("scraper.retrying"),
            description: t("scraper.retryDescription", { attempt: retryCount }),
          });
          
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      toast({
        title: t("scraper.success"),
        description: t("scraper.completedDescription", { count: currentPage - 1 }),
      });
    } catch (error) {
      console.error('Scraping process failed:', error);
      toast({
        title: t("scraper.error"),
        description: error instanceof Error ? error.message : t("scraper.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return {
    isLoading,
    progress,
    handleScrape
  };
};