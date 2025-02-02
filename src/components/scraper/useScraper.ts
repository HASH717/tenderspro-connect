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
    let totalPages = 0;

    try {
      while (true) {
        if (retryCount >= MAX_RETRIES) {
          throw new Error(`Failed after ${MAX_RETRIES} retries`);
        }

        try {
          console.log(`Attempting to scrape page ${currentPage}`);
          const { data, error } = await supabase.functions.invoke('scrape-tenders', {
            body: { page: currentPage },
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'Unknown error occurred');

          console.log('Response from scraper:', data);
          
          totalSuccessCount += data.count || 0;
          totalPages = data.totalPages || totalPages;
          
          const progressPercentage = Math.min((currentPage / totalPages) * 100, 100);
          setProgress(progressPercentage);
          
          console.log(`Successfully processed page ${currentPage}/${totalPages}`);
          
          if (currentPage >= totalPages) {
            toast({
              title: t("scraper.success"),
              description: t("scraper.completedDescription", { count: totalSuccessCount }),
            });
            break;
          }

          toast({
            title: t("scraper.batchSuccess"),
            description: t("scraper.batchDescription", { 
              current: currentPage,
              total: totalPages,
              count: data.count 
            }),
          });

          // Important: Increment page before next iteration
          const nextPage = currentPage + 1;
          currentPage = nextPage;
          retryCount = 0;
          
          // Wait before next request
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error('Batch error:', error);
          retryCount++;
          
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