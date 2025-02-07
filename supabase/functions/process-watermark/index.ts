
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

  try {
    const { tenderId, imageUrl } = await req.json()
    console.log(`Processing watermark for tender ${tenderId}`)
    console.log(`Image URL to process: ${imageUrl}`)

    if (!imageUrl) {
      throw new Error('No image URL provided')
    }

    // Track this processing
    activeProcessing.add(tenderId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const processImage = async () => {
      try {
        // Step 1: Download the image
        console.log(`Fetching image from URL: ${imageUrl}`);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        const imageArrayBuffer = await imageResponse.arrayBuffer();
        
        // Step 2: Process with Jimp
        console.log('Processing image with Jimp...');
        const image = await Jimp.default.read(Buffer.from(imageArrayBuffer));
        
        // Add watermark text
        const FONT_SIZE = Math.min(image.getWidth(), image.getHeight()) / 20; // Adjust size based on image dimensions
        const font = await Jimp.default.loadFont(Jimp.default.FONT_SANS_64_BLACK); // Using default Jimp font
        
        const watermarkText = 'TENDERSPRO.CO';
        const maxWidth = image.getWidth() * 0.8; // 80% of image width
        
        // Calculate text position (center)
        const textWidth = Jimp.default.measureText(font, watermarkText);
        const x = (image.getWidth() - textWidth) / 2;
        const y = (image.getHeight() - 64) / 2; // 64 is the font height
        
        // Add semi-transparent watermark
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

        // Convert to buffer
        const processedImageBuffer = await image.getBufferAsync(Jimp.default.MIME_JPEG);

        // Generate a unique filename
        const filename = `${tenderId}-processed-${Date.now()}.jpg`;
        
        // Upload the processed image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('tender-documents')
          .upload(filename, processedImageBuffer, {
            contentType: 'image/jpeg',
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
        activeProcessing.delete(tenderId);
      }
    };

    // Start the processing
    const processingPromise = processImage();
    
    // Use EdgeRuntime.waitUntil to ensure completion
    EdgeRuntime.waitUntil(processingPromise);

    // Wait for initial processing result
    const processedUrl = await processingPromise;

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedUrl 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in process-watermark function:', error);
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
