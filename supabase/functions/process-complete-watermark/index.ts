import { createClient } from 'npm:@supabase/supabase-js@2.38.4'
import Jimp from 'npm:jimp@0.22.10'
import { Buffer } from "node:buffer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Track active processing
const activeProcessing = new Set();

// Handle shutdown gracefully
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown initiated due to:', ev.detail?.reason);
  if (activeProcessing.size > 0) {
    console.log(`${activeProcessing.size} images were still being processed`);
  }
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let tenderId = null;
  try {
    const { tenderId: id } = await req.json();
    tenderId = id;
    
    if (!tenderId) {
      throw new Error('No tender ID provided');
    }

    console.log(`Starting watermark processing for tender ${tenderId}`);

    // Track this processing
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
      const { error: updateError } = await supabaseClient
        .from('tenders')
        .update({ original_image_url: imageUrl })
        .eq('id', tenderId);

      if (updateError) {
        console.error('Error storing original image URL:', updateError);
      }
    }

    try {
      // Use codetabs.com proxy to bypass CORS
      const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';
      console.log(`Fetching image through proxy: ${proxyUrl}${encodeURIComponent(imageUrl)}`);
      
      const imageResponse = await fetch(proxyUrl + encodeURIComponent(imageUrl), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText} (${imageResponse.status})`);
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      if (!imageArrayBuffer || imageArrayBuffer.byteLength === 0) {
        throw new Error('Received empty image data');
      }

      console.log('Successfully fetched image data, processing with Jimp...');
      
      const image = await Jimp.default.read(Buffer.from(imageArrayBuffer));
      if (!image) {
        throw new Error('Failed to process image with Jimp');
      }

      // Add watermark text
      const FONT_SIZE = Math.min(image.getWidth(), image.getHeight()) / 20;
      const font = await Jimp.default.loadFont(Jimp.default.FONT_SANS_64_BLACK);
      
      const watermarkText = 'TENDERSPRO.CO';
      const maxWidth = image.getWidth() * 0.8;
      
      const textWidth = Jimp.default.measureText(font, watermarkText);
      const x = (image.getWidth() - textWidth) / 2;
      const y = (image.getHeight() - 64) / 2;
      
      image.opacity(0.3);
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

      // Keep original format
      const fileExtension = imageUrl.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'gif' ? Jimp.default.MIME_GIF :
                      fileExtension === 'png' ? Jimp.default.MIME_PNG :
                      Jimp.default.MIME_JPEG;

      console.log(`Converting image to ${mimeType} format...`);
      const processedImageBuffer = await image.getBufferAsync(mimeType);
      const filename = `${tenderId}-processed-${Date.now()}.${fileExtension}`;

      console.log(`Uploading processed image as ${filename}...`);
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('tender-documents')
        .upload(filename, processedImageBuffer, {
          contentType: `image/${fileExtension}`,
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

      console.log(`Successfully processed image for tender ${tenderId}`);
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
    // Clean up processing tracking
    if (tenderId) {
      activeProcessing.delete(tenderId);
      console.log(`Removed tender ${tenderId} from active processing`);
    }
  }
});
