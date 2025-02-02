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
  const { t } = useTranslation();

  const handleScrape = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let totalSuccessCount = 0;

    try {
      while (retryCount < MAX_RETRIES) {
        console.log('Starting scraping process from page:', currentPage);
        
        try {
          const { data, error } = await supabase.functions.invoke('scrape-tenders', {
            body: { 
              startPage: currentPage
            },
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (error) {
            console.error('Scraping error:', error);
            throw error;
          }

          if (!data?.success) {
            throw new Error(data?.error || 'Unknown error occurred');
          }

          totalSuccessCount += data.count || 0;
          
          // Update progress based on total pages
          const progressPercentage = (currentPage / data.totalPages) * 100;
          setProgress(progressPercentage);
          
          if (data.nextPage) {
            // Update page for next iteration
            setCurrentPage(data.nextPage);
            
            toast({
              title: t("scraper.batchSuccess"),
              description: t("scraper.batchDescription", { 
                current: data.currentPage,
                total: data.totalPages,
                count: data.count 
              }),
            });
            
            // Add delay before next batch
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // No more pages to process
            toast({
              title: t("scraper.success"),
              description: t("scraper.completedDescription", { count: totalSuccessCount }),
            });
            setCurrentPage(1);
            setIsLoading(false);
            setProgress(0);
            break;
          }

          // Reset retry count on successful batch
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
          
          // Wait longer between retries
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

  return (
    <Card className="p-4">
      <Button 
        onClick={handleScrape} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? t("scraper.loading") : "SYNC TENDERS"}
      </Button>
      {isLoading && (
        <Progress value={progress} className="mt-4 w-full" />
      )}
    </Card>
  );
};