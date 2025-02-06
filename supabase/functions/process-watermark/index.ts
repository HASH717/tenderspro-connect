
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

    // Verify PNG extension
    if (!imageUrl.toLowerCase().endsWith('.png')) {
      throw new Error('Only PNG images are supported')
    }

    // Track this processing
    activeProcessing.add(tenderId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      // Download the PNG image directly
      console.log('Downloading PNG image...');
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText} (${imageResponse.status})`);
      }

      // Log content type and response details
      const contentType = imageResponse.headers.get('content-type');
      console.log('Image response details:', {
        contentType,
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        headers: Object.fromEntries(imageResponse.headers.entries())
      });

      if (!contentType?.includes('image/png')) {
        throw new Error(`Invalid content type: ${contentType}. Only PNG images are supported.`);
      }

      // Get the image data as array buffer
      const imageBuffer = await imageResponse.arrayBuffer();
      console.log('Image downloaded, size:', imageBuffer.byteLength, 'bytes');

      // Log first few bytes for debugging
      const headerBytes = new Uint8Array(imageBuffer.slice(0, 16));
      console.log('First 16 bytes of image:', Array.from(headerBytes));

      // PNG signature validation
      const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
      const uint8Array = new Uint8Array(imageBuffer.slice(0, 8));
      const isPNG = uint8Array.every((byte, i) => byte === pngSignature[i]);
      
      if (!isPNG) {
        console.error('PNG signature mismatch. Expected:', pngSignature, 'Got:', Array.from(uint8Array));
        throw new Error('Invalid PNG file signature');
      }

      console.log('PNG signature validation passed');

      // Validate image size (20MB limit)
      if (imageBuffer.byteLength > 20 * 1024 * 1024) {
        throw new Error('Image too large (max 20MB)');
      }

      // Create a Blob first
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      console.log('Created Blob:', {
        size: blob.size,
        type: blob.type
      });

      // Create File from Blob
      const file = new File([blob], 'image.png', { type: 'image/png' });
      console.log('Created File:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Prepare form data
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

      // Generate a unique filename for the processed image
      const outputFilename = `${tenderId}-processed-${Date.now()}.png`;
      
      // Upload the processed image to Supabase Storage
      console.log('Uploading processed image to Supabase Storage...');
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

      // Get the public URL
      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('tender-documents')
        .getPublicUrl(outputFilename);

      // Update the tender record
      console.log('Updating tender record with processed image URL...');
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

      console.log('Successfully processed and stored watermarked image for tender:', tenderId);

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
      console.error(`Error in image processing for tender ${tenderId}:`, error);
      throw error;
    } finally {
      // Remove from active processing when done
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
