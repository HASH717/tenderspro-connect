
import { createClient } from 'npm:@supabase/supabase-js@2.38.4'
import Jimp from 'npm:jimp@0.22.10'
import { Buffer } from "node:buffer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Track active processing
const activeProcessing = new Set();

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let tenderId = null;
  let image = null;
  
  try {
    const { tenderId: id } = await req.json();
    tenderId = id;
    
    if (!tenderId) {
      throw new Error('No tender ID provided');
    }

    console.log(`Starting watermark processing for tender ${tenderId}`);
    
    // Prevent concurrent processing of the same tender
    if (activeProcessing.has(tenderId)) {
      throw new Error('This tender is already being processed');
    }
    activeProcessing.add(tenderId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get tender details
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

    try {
      // Fetch the image directly
      console.log('Fetching image from URL:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBlob = await imageResponse.blob();
      const formData = new FormData();
      formData.append('image[]', imageBlob);

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
      
      const textWidth = Jimp.default.measureText(font, watermarkText);
      const x = (image.getWidth() - textWidth) / 2;
      const y = (image.getHeight() - 64) / 2;

      image.opacity(0.3); // Set opacity to 30%
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

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Processing completed',
          url: publicUrl
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );

    } catch (processingError) {
      console.error(`Error processing image for tender ${tenderId}:`, processingError);
      throw processingError;
    }

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
  } finally {
    // Cleanup
    if (image) {
      image.bitmap?.data && (image.bitmap.data = null);
      image = null;
    }
    
    if (tenderId) {
      activeProcessing.delete(tenderId);
      console.log(`Removed tender ${tenderId} from active processing`);
    }
  }
});

