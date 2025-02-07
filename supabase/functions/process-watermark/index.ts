
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Define Buffer for Node.js compatibility
const Buffer = {
  from: (str: string, encoding?: string) => {
    if (encoding === 'base64') {
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    throw new Error(`Unsupported encoding: ${encoding}`);
  }
};

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

serve(async (req) => {
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
        
        // Step 2: Add custom watermark using imggen.ai
        console.log('Adding custom watermark...');
        console.log('API Key available:', !!Deno.env.get('IMGGEN_API_KEY'));
        
        const watermarkFormData = new FormData();
        watermarkFormData.append('image', new Blob([imageArrayBuffer]), `${tenderId}-original.jpg`);
        watermarkFormData.append('text', 'TENDERSPRO.CO');
        watermarkFormData.append('fontSize', '48');
        watermarkFormData.append('opacity', '0.3');
        watermarkFormData.append('color', '#000000');
        watermarkFormData.append('position', 'center');

        const addWatermarkResponse = await fetch('https://api.imggen.ai/v1/add-watermark', {
          method: 'POST',
          headers: {
            'X-IMGGEN-KEY': Deno.env.get('IMGGEN_API_KEY') ?? '',
            'Accept': 'application/json',
          },
          body: watermarkFormData,
        });

        const watermarkResponseText = await addWatermarkResponse.text();
        console.log('Raw watermark API response:', watermarkResponseText);
        console.log('Response status:', addWatermarkResponse.status);
        console.log('Response headers:', Object.fromEntries(addWatermarkResponse.headers.entries()));

        if (!addWatermarkResponse.ok) {
          throw new Error(`Failed to add watermark: ${addWatermarkResponse.statusText} (${addWatermarkResponse.status})`);
        }

        let watermarkResult;
        try {
          watermarkResult = JSON.parse(watermarkResponseText);
        } catch (error) {
          console.error('Failed to parse watermark response:', error);
          throw new Error('Invalid response from watermark API');
        }

        if (!watermarkResult.success || !watermarkResult.images?.[0]) {
          throw new Error('Failed to add watermark - API response indicates failure');
        }

        // Convert base64 to buffer for final image
        const processedImageBuffer = Buffer.from(watermarkResult.images[0], 'base64');

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
