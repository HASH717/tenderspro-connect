
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    console.log(`Processing watermark for tender ${tenderId}: ${imageUrl}`)

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
        // Download the image
        console.log(`Fetching image from URL: ${imageUrl}`);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        // Get and log response headers
        const headers = Object.fromEntries(imageResponse.headers.entries());
        console.log('Image response headers:', headers);

        // Get the file extension from Content-Type or URL
        const contentType = imageResponse.headers.get('content-type') || '';
        const fileExtension = contentType.split('/')[1] || 'png';
        console.log(`Content-Type: ${contentType}, File Extension: ${fileExtension}`);

        // Convert image to blob and log its properties
        const imageBlob = await imageResponse.blob();
        console.log('Image blob details:', {
          size: imageBlob.size,
          type: imageBlob.type
        });
        
        // Create a File object with the correct content-type
        const fileType = `image/${fileExtension}`;
        const file = new File(
          [imageBlob],
          `image-${Date.now()}.${fileExtension}`,
          { type: fileType }
        );

        console.log('Created File object:', {
          name: file.name,
          type: file.type,
          size: file.size
        });

        // Create FormData for imggen.ai API with correct field name
        const formData = new FormData();
        formData.append('image', file);

        console.log('Sending request to imggen.ai with file:', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });

        // Call imggen.ai API to remove watermark
        const removeWatermarkResponse = await fetch('https://app.imggen.ai/v1/remove-watermark', {
          method: 'POST',
          headers: {
            'X-IMGGEN-KEY': Deno.env.get('IMGGEN_API_KEY') ?? '',
          },
          body: formData,
        });

        if (!removeWatermarkResponse.ok) {
          const errorText = await removeWatermarkResponse.text();
          console.error('Imggen.ai API error response:', {
            status: removeWatermarkResponse.status,
            statusText: removeWatermarkResponse.statusText,
            response: errorText
          });
          throw new Error(`Failed to remove watermark: ${removeWatermarkResponse.statusText}`);
        }

        const result = await removeWatermarkResponse.json();
        console.log('Imggen.ai API response:', result);
        
        if (!result.success || !result.images?.[0]) {
          throw new Error('Failed to process image with imggen.ai');
        }

        // Convert base64 to buffer
        const imageBuffer = Uint8Array.from(atob(result.images[0]), c => c.charCodeAt(0));

        // Generate a unique filename
        const filename = `${tenderId}-processed-${Date.now()}.png`;
        
        // Upload the processed image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('tender-documents')
          .upload(filename, imageBuffer, {
            contentType: 'image/png',
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
        // Remove from active processing when done
        activeProcessing.delete(tenderId);
      }
    };

    // Start the processing in the background
    const processingPromise = processImage();
    
    // Use EdgeRuntime.waitUntil to ensure the function runs to completion
    EdgeRuntime.waitUntil(processingPromise);

    // Wait for the initial processing result
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
