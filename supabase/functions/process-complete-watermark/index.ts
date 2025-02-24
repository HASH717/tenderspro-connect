import { createClient } from 'npm:@supabase/supabase-js@2.38.4'
import Jimp from 'npm:jimp@0.22.10'
import { Buffer } from "node:buffer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Track active processing
const activeProcessing = new Set();

async function processSingleTender(supabaseClient: any, tenderId: string) {
  console.log(`Starting watermark processing for tender ${tenderId}`);
  let image = null;
  
  try {
    // Check if tender is already being processed
    if (activeProcessing.has(tenderId)) {
      console.log(`Tender ${tenderId} is already being processed, skipping`);
      return { success: false, message: 'Already being processed' };
    }
    activeProcessing.add(tenderId);

    // Get tender details
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .maybeSingle();

    if (tenderError) {
      throw new Error(`Failed to fetch tender: ${tenderError.message}`);
    }

    if (!tender) {
      throw new Error('Tender not found');
    }

    // Skip if already processed
    if (tender.watermarked_image_url) {
      console.log(`Tender ${tenderId} already has watermark, skipping`);
      return { success: true, message: 'Already processed', skipped: true };
    }

    const imageUrl = tender.image_url;
    if (!imageUrl) {
      throw new Error('No image URL found in tender');
    }

    console.log(`Processing image for tender ${tenderId} from URL: ${imageUrl}`);

    // Store original image URL if not already stored
    if (!tender.original_image_url) {
      await supabaseClient
        .from('tenders')
        .update({ original_image_url: imageUrl })
        .eq('id', tenderId);
    }

    // Use codetabs proxy for the image URL
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(imageUrl)}`;
    console.log('Fetching image from proxied URL:', proxyUrl);
    
    const imageResponse = await fetch(proxyUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();
    const formData = new FormData();
    formData.append('image', imageBlob);

    console.log('Removing existing watermark...');
    const removeWatermarkResponse = await fetch('https://app.imggen.ai/v1/remove-watermark', {
      method: 'POST',
      headers: {
        'X-IMGGEN-KEY': Deno.env.get('IMGGEN_API_KEY') ?? '',
      },
      body: formData
    });

    if (!removeWatermarkResponse.ok) {
      const errorText = await removeWatermarkResponse.text();
      console.error('Watermark removal error response:', errorText);
      
      // Check for credit limit error
      if (errorText.includes('Credit limit exceeded')) {
        return {
          success: false,
          error: 'Credit limit exceeded',
          stopProcessing: true // Signal to stop processing further images
        };
      }
      
      throw new Error(`Failed to remove watermark: ${removeWatermarkResponse.statusText}`);
    }

    const result = await removeWatermarkResponse.json();
    console.log('Watermark removal API response:', result);

    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error('No processed image received from watermark removal service');
    }

    // Convert base64 to buffer
    const watermarkRemoved = Buffer.from(result.images[0], 'base64');
    
    // Process with Jimp
    console.log('Processing cleaned image with Jimp...');
    image = await Jimp.default.read(watermarkRemoved);
    
    // Add watermark text
    const font = await Jimp.default.loadFont(Jimp.default.FONT_SANS_64_BLACK);
    
    const watermarkText = 'TENDERSPRO.CO';
    const maxWidth = image.getWidth() * 0.8;
    
    // Calculate position - now placing at 85% of the height instead of center
    const textWidth = Jimp.default.measureText(font, watermarkText);
    const x = (image.getWidth() - textWidth) / 2;
    const y = Math.floor(image.getHeight() * 0.85); // Position at 85% of height

    // Reduced opacity to 8% (0.08) from 15%
    image.opacity(0.08);
    image.print(
      font,
      x,
      y,
      {
        text: watermarkText,
        alignmentX: Jimp.default.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.default.VERTICAL_ALIGN_MIDDLE
      },
      maxWidth
    );
    image.opacity(1);

    // Set quality and get buffer
    image.quality(70);
    const processedImageBuffer = await image.getBufferAsync(Jimp.default.MIME_JPEG);

    // Generate filename and upload
    const filename = `${tenderId}-${Date.now()}.jpg`;
    
    const { error: uploadError } = await supabaseClient
      .storage
      .from('tender-documents')
      .upload(filename, processedImageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Failed to upload processed image: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('tender-documents')
      .getPublicUrl(filename);

    console.log(`Updating tender record with new image URL: ${publicUrl}`);
    const { error: updateError } = await supabaseClient
      .from('tenders')
      .update({ 
        watermarked_image_url: publicUrl,
        processed_at: new Date().toISOString()
      })
      .eq('id', tenderId);

    if (updateError) {
      throw new Error(`Failed to update tender record: ${updateError.message}`);
    }

    return { success: true, message: 'Processing completed', url: publicUrl };

  } catch (error) {
    console.error(`Error processing tender ${tenderId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      tenderId 
    };
  } finally {
    // Cleanup
    if (image) {
      image.bitmap?.data && (image.bitmap.data = null);
      image = null;
    }
    activeProcessing.delete(tenderId);
    console.log(`Removed tender ${tenderId} from active processing`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all unprocessed tenders with images
    const { data: tenders, error: fetchError } = await supabaseClient
      .from('tenders')
      .select('id')
      .is('watermarked_image_url', null)
      .not('image_url', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch tenders: ${fetchError.message}`);
    }

    console.log(`Found ${tenders?.length || 0} unprocessed tenders`);

    if (!tenders?.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No unprocessed tenders found' 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }

    // Process the first tender if specific ID is provided
    const { tenderId } = await req.json().catch(() => ({ tenderId: null }));
    if (tenderId) {
      const result = await processSingleTender(supabaseClient, tenderId);
      return new Response(
        JSON.stringify(result),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );
    }

    // Process all unprocessed tenders
    const results = [];
    for (const tender of tenders) {
      const result = await processSingleTender(supabaseClient, tender.id);
      results.push(result);
      
      // Check if we hit the credit limit
      if (result.stopProcessing) {
        console.log('Credit limit reached, stopping further processing');
        break;
      }
    }

    // Calculate successful and skipped counts
    const processedCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.success && r.skipped).length;
    const errorCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedCount} tenders, skipped ${skippedCount}, errors: ${errorCount}`,
        creditLimitReached: results.some(r => r.stopProcessing),
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in process-complete-watermark function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
