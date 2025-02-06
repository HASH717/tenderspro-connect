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

      // First, let's check raw tenders
      const { data: allTenders, error: allTendersError } = await supabase
        .from('tenders')
        .select('id, image_url, png_image_url');

      console.log('All tenders:', allTenders?.map(t => ({
        id: t.id,
        image_url: t.image_url,
        png_url: t.png_image_url,
        originalFormat: t.image_url?.split('.')?.pop()?.toLowerCase()
      })));
      
      if (allTendersError) {
        console.error('Error fetching all tenders:', allTendersError);
        throw allTendersError;
      }

      // Let's check ONE tender with an image, ignoring PNG status
      const { data: tenders, error } = await supabase
        .from('tenders')
        .select('id, image_url, png_image_url')
        .not('image_url', 'is', null)
        .limit(1); // Just one tender for testing

      console.log('Selected tender for testing:', tenders);

      if (error) {
        console.error('Error fetching tenders:', error);
        throw error;
      }

      if (!tenders?.length) {
        console.log('No tenders found with images');
        toast.info('No images found to convert');
        return;
      }

      console.log('Found tender to convert:', tenders[0]);

      let processed = 0;
      for (const tender of tenders) {
        try {
          console.log('Converting tender:', {
            id: tender.id,
            imageUrl: tender.image_url,
            fileExtension: tender.image_url?.split('.')?.pop()?.toLowerCase(),
            hasPngVersion: !!tender.png_image_url
          });
          
          const { data, error } = await supabase.functions.invoke('convert-to-png', {
            body: { imageUrl: tender.image_url, tenderId: tender.id }
          });

          console.log('Conversion response:', data, error);
          
          if (error) throw error;
          
          processed++;
          setProgress((processed / tenders.length) * 100);
        } catch (err) {
          console.error(`Failed to convert image for tender ${tender.id}:`, err);
          toast.error(`Failed to convert tender ${tender.id}`);
          // Continue with next image even if one fails
        }
      }

      toast.success(`Checked ${processed} out of ${tenders.length} images`);
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

      // Fetch all tenders that have PNG versions but no watermarked versions
      const { data: tenders, error } = await supabase
        .from('tenders')
        .select('id, png_image_url')
        .is('watermarked_image_url', null)
        .not('png_image_url', 'is', null);

      if (error) throw error;

      if (!tenders?.length) {
        toast.info('No images need watermark processing');
        return;
      }

      let processed = 0;
      for (const tender of tenders) {
        try {
          await supabase.functions.invoke('process-watermark', {
            body: { imageUrl: tender.png_image_url, tenderId: tender.id }
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
