import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useScraper = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastProcessedPage, setLastProcessedPage] = useState(0);

  const handleScrape = async () => {
    try {
      setIsLoading(true);
      setProgress(0);

      const { data, error } = await supabase.functions.invoke('check-new-tenders', {
        method: 'POST',
      });

      if (error) {
        console.error('Error checking new tenders:', error);
        throw error;
      }

      console.log('Check new tenders response:', data);
      setProgress(100);

    } catch (error) {
      console.error('Error in handleScrape:', error);
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