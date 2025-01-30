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
  const [currentPage, setCurrentPage] = useState(1);
  const TOTAL_PAGES = 667;
  const BATCH_SIZE = 20;
  const PAGES_PER_BATCH = 5;
  const { t } = useTranslation();

  const handleScrape = async () => {
    if (!isLoading) {
      setIsLoading(true);
    }
    
    let successCount = 0;
    let failedAttempts = 0;
    const MAX_RETRIES = 3;

    try {
      console.log('Starting scraping process from page:', currentPage);
      
      // Calculate end page for this batch
      const endPage = Math.min(currentPage + PAGES_PER_BATCH - 1, TOTAL_PAGES);
      
      const { data, error } = await supabase.functions.invoke('scrape-tenders', {
        body: { 
          batchSize: BATCH_SIZE,
          startPage: currentPage,
          maxPages: PAGES_PER_BATCH
        },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.error('Detailed error:', error);
        let errorMessage = t("scraper.errorDescription");
        
        try {
          if (error.message && typeof error.message === 'string') {
            if (error.message.includes('{') && error.message.includes('}')) {
              const errorBody = JSON.parse(error.message);
              if (errorBody.error) {
                errorMessage = errorBody.error;
              }
            } else {
              errorMessage = error.message;
            }
          }
        } catch (parseError) {
          console.error('Error parsing error message:', parseError);
          errorMessage = error.message || t("scraper.errorDescription");
        }
        
        throw new Error(errorMessage);
      }
      
      // Update progress
      const progressPercentage = (endPage / TOTAL_PAGES) * 100;
      setProgress(progressPercentage);
      
      // Update current page for next batch
      setCurrentPage(endPage + 1);
      
      successCount = data?.count || 0;
      
      const isComplete = endPage >= TOTAL_PAGES;
      
      if (isComplete) {
        toast({
          title: t("scraper.success"),
          description: t("scraper.completedDescription", { count: successCount }),
        });
        setCurrentPage(1); // Reset for next full run
        setIsLoading(false);
        setProgress(0);
      } else {
        toast({
          title: t("scraper.batchSuccess"),
          description: t("scraper.batchDescription", { 
            current: endPage,
            total: TOTAL_PAGES,
            count: successCount 
          }),
        });
        // Add delay before starting next batch
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Continue with next batch automatically
        handleScrape();
      }
      
      console.log('Batch completed successfully:', data);
    } catch (error) {
      console.error('Error in scraping process:', error);
      failedAttempts++;
      
      let errorMessage = error instanceof Error ? error.message : t("scraper.errorDescription");
      
      if (failedAttempts < MAX_RETRIES) {
        toast({
          title: t("scraper.retrying"),
          description: t("scraper.retryDescription", { attempt: failedAttempts }),
        });
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        return handleScrape();
      }
      
      toast({
        title: t("scraper.error"),
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">{t("scraper.title")}</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {currentPage > 1 ? 
              t("scraper.progress", { current: currentPage - 1, total: TOTAL_PAGES }) :
              t("scraper.ready")}
          </span>
        </div>
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