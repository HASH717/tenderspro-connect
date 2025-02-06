
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useScraper = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastProcessedPage, setLastProcessedPage] = useState(0);

  const convertExistingImages = async () => {
    try {
      setIsLoading(true);
      setProgress(0);

      // Fetch all tenders that don't have PNG versions
      const { data: tenders, error } = await supabase
        .from('tenders')
        .select('id, image_url')
        .is('png_image_url', null)
        .not('image_url', 'is', null);

      if (error) throw error;

      if (!tenders?.length) {
        toast.info('No images need conversion');
        return;
      }

      let processed = 0;
      for (const tender of tenders) {
        try {
          await supabase.functions.invoke('convert-to-png', {
            body: { imageUrl: tender.image_url, tenderId: tender.id }
          });
          processed++;
          setProgress((processed / tenders.length) * 100);
        } catch (err) {
          console.error(`Failed to convert image for tender ${tender.id}:`, err);
          // Continue with next image even if one fails
        }
      }

      toast.success(`Converted ${processed} out of ${tenders.length} images`);
    } catch (error) {
      console.error('Error in convertExistingImages:', error);
      toast.error('Failed to convert images');
    } finally {
      setIsLoading(false);
    }
  };

  const processWatermarks = async () => {
    try {
      setIsLoading(true);
      setProgress(0);

      // Only fetch tenders with PNG images that haven't been watermark processed
      const { data: tenders, error } = await supabase
        .from('tenders')
        .select('id, png_image_url')
        .is('watermarked_image_url', null)
        .not('png_image_url', 'is', null)
        .filter('png_image_url', 'ilike', '%.png'); // Ensure URL ends with .png

      if (error) throw error;

      if (!tenders?.length) {
        toast.info('No images need watermark processing');
        return;
      }

      let processed = 0;
      for (const tender of tenders) {
        try {
          if (!tender.png_image_url?.toLowerCase().endsWith('.png')) {
            console.warn(`Skipping tender ${tender.id} - not a PNG image`);
            continue;
          }
          
          await supabase.functions.invoke('process-watermark', {
            body: { 
              imageUrl: tender.png_image_url,
              tenderId: tender.id 
            }
          });
          processed++;
          setProgress((processed / tenders.length) * 100);
        } catch (err) {
          console.error(`Failed to process watermark for tender ${tender.id}:`, err);
          // Continue with next image even if one fails
        }
      }

      toast.success(`Processed watermarks for ${processed} out of ${tenders.length} images`);
    } catch (error) {
      console.error('Error in processWatermarks:', error);
      toast.error('Failed to process watermarks');
    } finally {
      setIsLoading(false);
    }
  };

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
    convertExistingImages,
    processWatermarks,
    lastProcessedPage
  };
};
