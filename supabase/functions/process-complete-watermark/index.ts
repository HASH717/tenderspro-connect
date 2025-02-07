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
    return new Response(null, { headers: corsHeaders })
  }

  let tenderId = null;
  try {
    const { tenderId: id } = await req.json()
    tenderId = id;
    console.log(`Processing complete watermark flow for tender ${tenderId}`)

    if (!tenderId) {
      throw new Error('No tender ID provided')
    }

    // Track this processing
    activeProcessing.add(tenderId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get tender details
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .maybeSingle();

    if (tenderError || !tender) {
      throw new Error(`Failed to fetch tender: ${tenderError?.message || 'Tender not found'}`);
    }

    const imageUrl = tender.image_url;
    if (!imageUrl) {
      throw new Error('No image URL found in tender');
    }

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

    const processImage = async () => {
      try {
        // Use codetabs.com proxy to bypass CORS
        const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';
        const targetUrl = imageUrl;
        
        console.log(`Fetching image through proxy from URL: ${targetUrl}`);
        const imageResponse = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
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
        
        // Step 2: Process with Jimp
        console.log('Processing image with Jimp...');
        const image = await Jimp.default.read(Buffer.from(imageArrayBuffer));
        
        if (!image) {
          throw new Error('Failed to process image with Jimp');
        }

        // Add watermark text
        const FONT_SIZE = Math.min(image.getWidth(), image.getHeight()) / 20;
        const font = await Jimp.default.loadFont(Jimp.default.FONT_SANS_64_BLACK);
        
        const watermarkText = 'TENDERSPRO.CO';
        const maxWidth = image.getWidth() * 0.8; // 80% of image width
        
        // Calculate text position (center)
        const textWidth = Jimp.default.measureText(font, watermarkText);
        const x = (image.getWidth() - textWidth) / 2;
        const y = (image.getHeight() - 64) / 2; // 64 is the font height
        
        // Add semi-transparent watermark with 30% opacity
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

        // Keep original format by checking the URL extension
        const fileExtension = imageUrl.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = fileExtension === 'gif' ? Jimp.default.MIME_GIF :
                        fileExtension === 'png' ? Jimp.default.MIME_PNG :
                        Jimp.default.MIME_JPEG;

        // Convert to buffer maintaining original format
        const processedImageBuffer = await image.getBufferAsync(mimeType);

        // Generate a unique filename with original extension
        const filename = `${tenderId}-processed-${Date.now()}.${fileExtension}`;
        
        // Upload the processed image to Supabase Storage
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

        // Get the public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('tender-documents')
          .getPublicUrl(filename);

        // Update the tender record
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

        return publicUrl;
      } catch (error) {
        console.error(`Error in image processing for tender ${tenderId}:`, error);
        throw error;
      } finally {
        // Remove from active processing
        if (tenderId) activeProcessing.delete(tenderId);
      }
    };

    // Start the processing and wait for it to complete
    const publicUrl = await processImage();

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

  } catch (error) {
    console.error('Error in process-complete-watermark function:', error);
    // Ensure we clean up in case of error
    if (tenderId) {
      activeProcessing.delete(tenderId);
    }
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
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
