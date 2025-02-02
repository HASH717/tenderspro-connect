import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const useScraper = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { t } = useTranslation();
  const [lastProcessedPage, setLastProcessedPage] = useState(0);

  const handleScrape = async (startPage?: number) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setProgress(0);
    let currentPage = startPage || 1;
    const TOTAL_PAGES = 667;

    try {
      while (currentPage <= TOTAL_PAGES) {
        console.log(`Starting to scrape page ${currentPage}`);
        
        const { data, error } = await supabase.functions.invoke('scrape-tenders', {
          body: { page: currentPage },
        });

        if (error) {
          console.error(`Error on page ${currentPage}:`, error);
          toast({
            title: t("scraper.error"),
            description: error.message,
            variant: "destructive",
          });
          setLastProcessedPage(currentPage);
          break;
        }

        if (!data?.success) {
          console.error(`Failed to process page ${currentPage}:`, data?.error);
          toast({
            title: t("scraper.error"),
            description: data?.error || t("scraper.errorDescription"),
            variant: "destructive",
          });
          setLastProcessedPage(currentPage);
          break;
        }

        const progressPercentage = Math.min((currentPage / TOTAL_PAGES) * 100, 100);
        setProgress(progressPercentage);
        setLastProcessedPage(currentPage);
        
        console.log(`Successfully processed page ${currentPage}/${TOTAL_PAGES}`);
        
        if (data.errors > 0) {
          toast({
            title: t("scraper.warning"),
            description: `Page ${currentPage} completed with ${data.errors} errors. Some tenders may need to be reprocessed.`,
            variant: "destructive", // Changed from "warning" to "destructive"
          });
        } else {
          toast({
            title: t("scraper.batchSuccess"),
            description: t("scraper.batchDescription", { 
              current: currentPage,
              total: TOTAL_PAGES,
              count: data.count 
            }),
          });
        }

        currentPage++;
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      toast({
        title: t("scraper.success"),
        description: t("scraper.completedDescription", { count: currentPage - 1 }),
      });
    } catch (error) {
      console.error('Scraping process failed:', error);
      setLastProcessedPage(currentPage);
      toast({
        title: t("scraper.error"),
        description: error instanceof Error ? error.message : t("scraper.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    progress,
    handleScrape,
    lastProcessedPage
  };
};