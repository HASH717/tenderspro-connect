
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
  let imageArrayBuffer = null;
  
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

    // 2. Fetch and process image with optimizations
    try {
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

      imageArrayBuffer = await imageResponse.arrayBuffer();
      if (!imageArrayBuffer || imageArrayBuffer.byteLength === 0) {
        throw new Error('Received empty image data');
      }

      const fileExtension = imageUrl.split('.').pop()?.toLowerCase() || 'jpg';
      console.log(`File extension detected: ${fileExtension}`);

      // Check file size before processing
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (imageArrayBuffer.byteLength > MAX_FILE_SIZE) {
        console.log(`Large file detected (${imageArrayBuffer.byteLength} bytes), applying stricter size limits`);
      }

      console.log('Creating Jimp instance...');
      image = await Jimp.default.read(Buffer.from(imageArrayBuffer));
      
      // More aggressive scaling for larger images
      const MAX_SIZE = imageArrayBuffer.byteLength > MAX_FILE_SIZE ? 800 : 1024;
      if (image.getWidth() > MAX_SIZE || image.getHeight() > MAX_SIZE) {
        console.log(`Scaling image from ${image.getWidth()}x${image.getHeight()} to fit within ${MAX_SIZE}x${MAX_SIZE}`);
        image.scaleToFit(MAX_SIZE, MAX_SIZE);
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

      // Set correct mime type based on original format
      const mimeType = fileExtension === 'gif' ? Jimp.default.MIME_GIF :
                      fileExtension === 'png' ? Jimp.default.MIME_PNG :
                      Jimp.default.MIME_JPEG;

      console.log(`Processing with mime type: ${mimeType}`);
      const processedImageBuffer = await image.getBufferAsync(mimeType);
      const filename = `${tenderId}-${Date.now()}.${fileExtension}`;

      console.log(`Uploading processed image as ${filename} (${processedImageBuffer.length} bytes)`);
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
    // Aggressive cleanup
    if (image) {
      if (image.bitmap && image.bitmap.data) {
        image.bitmap.data = null;
      }
      image = null;
    }
    if (imageArrayBuffer) {
      imageArrayBuffer = null;
    }
    
    if (tenderId) {
      activeProcessing.delete(tenderId);
      console.log(`Removed tender ${tenderId} from active processing`);
    }

    // Force garbage collection if available
    if (typeof global.gc === 'function') {
      global.gc();
    }
  }
});
