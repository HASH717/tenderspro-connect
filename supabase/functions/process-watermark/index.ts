
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Track active processing
const activeProcessing = new Set();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { tenderId, imageUrl } = await req.json()
    console.log(`Processing watermark for tender ${tenderId} with image URL: ${imageUrl}`)

    if (!imageUrl) {
      throw new Error('No image URL provided')
    }

    // Track this processing
    activeProcessing.add(tenderId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      // Download the image
      console.log('Downloading image...');
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText} (${imageResponse.status})`);
      }

      // Get content type and log it
      const contentType = imageResponse.headers.get('content-type');
      console.log('Content-Type from response:', contentType);
      
      // Get the image data
      const imageBuffer = await imageResponse.arrayBuffer();
      console.log('Image size:', imageBuffer.byteLength, 'bytes');

      // Create File object
      const file = new File([imageBuffer], 'image.png', { type: 'image/png' });
      console.log('File created:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Send to imggen.ai
      const formData = new FormData();
      formData.append('image', file);

      console.log('Sending request to imggen.ai...');
      const removeWatermarkResponse = await fetch('https://app.imggen.ai/v1/remove-watermark', {
        method: 'POST',
        headers: {
          'X-IMGGEN-KEY': Deno.env.get('IMGGEN_API_KEY') ?? '',
        },
        body: formData,
      });

      if (!removeWatermarkResponse.ok) {
        const errorText = await removeWatermarkResponse.text();
        console.error('imggen.ai API error response:', errorText);
        throw new Error(`Failed to remove watermark: ${removeWatermarkResponse.statusText} (${removeWatermarkResponse.status})`);
      }

      const result = await removeWatermarkResponse.json();
      console.log('imggen.ai API response:', result);
      
      if (!result.success || !result.images?.[0]) {
        throw new Error('Failed to process image with imggen.ai: No image returned');
      }

      // Convert base64 to buffer
      const processedImageBuffer = Uint8Array.from(atob(result.images[0]), c => c.charCodeAt(0));
      console.log('Processed image size:', processedImageBuffer.length, 'bytes');

      // Generate filename
      const outputFilename = `${tenderId}-processed-${Date.now()}.png`;
      
      // Upload to Supabase Storage
      console.log('Uploading to Supabase Storage...');
      const { error: uploadError } = await supabaseClient
        .storage
        .from('tender-documents')
        .upload(outputFilename, processedImageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Failed to upload processed image: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('tender-documents')
        .getPublicUrl(outputFilename);

      // Update tender record
      console.log('Updating tender record...');
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

      console.log('Successfully processed tender:', tenderId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          processedUrl: publicUrl 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );

    } catch (error) {
      console.error(`Error processing tender ${tenderId}:`, error);
      throw error;
    } finally {
      // Clean up
      activeProcessing.delete(tenderId);
    }

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
