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
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let totalSuccessCount = 0;

    try {
      while (retryCount < MAX_RETRIES) {
        try {
          console.log(`Scraping page ${currentPage}`);
          const { data, error } = await supabase.functions.invoke('scrape-tenders', {
            body: { page: currentPage },
            headers: { 'Content-Type': 'application/json' }
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'Unknown error occurred');

          totalSuccessCount += data.count || 0;
          const progressPercentage = Math.min((currentPage / data.totalPages) * 100, 100);
          setProgress(progressPercentage);
          
          if (currentPage < data.totalPages) {
            toast({
              title: t("scraper.batchSuccess"),
              description: t("scraper.batchDescription", { 
                current: currentPage,
                total: data.totalPages,
                count: data.count 
              }),
            });

            // Increment page before next iteration
            currentPage++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            toast({
              title: t("scraper.success"),
              description: t("scraper.completedDescription", { count: totalSuccessCount }),
            });
            setIsLoading(false);
            setProgress(0);
            break;
          }

          retryCount = 0;
        } catch (error) {
          console.error('Batch error:', error);
          retryCount++;
          
          if (retryCount >= MAX_RETRIES) {
            throw new Error(`Failed after ${MAX_RETRIES} retries`);
          }
          
          toast({
            title: t("scraper.retrying"),
            description: t("scraper.retryDescription", { attempt: retryCount }),
          });
          
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.error('Scraping process failed:', error);
      toast({
        title: t("scraper.error"),
        description: error instanceof Error ? error.message : t("scraper.errorDescription"),
        variant: "destructive",
      });
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