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
      const { data, error } = await supabase.functions.invoke('scrape-tenders')
      
      if (error) {
        // Parse the error message from the response if available
        let errorMessage = t("scraper.errorDescription");
        try {
          const errorBody = JSON.parse(error.message);
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          // If parsing fails, use the raw error message
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }
      
      setProgress(100);
      toast({
        title: t("scraper.success"),
        description: t("scraper.successDescription", { count: data.count }),
      });
    } catch (error) {
      console.error('Error scraping tenders:', error);
      toast({
        title: t("scraper.error"),
        description: error instanceof Error ? error.message : t("scraper.errorDescription"),
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