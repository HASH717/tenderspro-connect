
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Track active conversions
const activeConversions = new Set();

// Handle shutdown gracefully
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown initiated due to:', ev.detail?.reason);
  // Log remaining active conversions
  if (activeConversions.size > 0) {
    console.log(`${activeConversions.size} conversions were still in progress`);
  }
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { imageUrl, tenderId } = await req.json()
    console.log(`Converting image for tender ${tenderId}: ${imageUrl}`)

    if (!imageUrl) {
      throw new Error('No image URL provided')
    }

    // Check if image was already processed
    const { data: tender } = await supabaseClient
      .from('tenders')
      .select('png_image_url')
      .eq('id', tenderId)
      .single()

    if (tender?.png_image_url) {
      console.log('Image already processed, skipping conversion');
      return new Response(
        JSON.stringify({ 
          success: true, 
          pngUrl: tender.png_image_url,
          skipped: true 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    }

    // Track this conversion
    activeConversions.add(tenderId);

    // Define the conversion process
    const convertImage = async () => {
      try {
        // Download the image
        console.log(`Fetching image from URL: ${imageUrl}`);
        const imageResponse = await fetch(imageUrl);
        
        if (!imageResponse.ok) {
          console.error(`Failed to fetch image, status: ${imageResponse.status}`);
          throw new Error(`Failed to fetch image: ${imageResponse.statusText || 'Unknown error'}`);
        }

        console.log('Image fetch successful, status:', imageResponse.status);

        // Convert image to blob and validate type
        const imageBlob = await imageResponse.blob();
        console.log('Image blob details:', {
          size: imageBlob.size,
          type: imageBlob.type
        });

        // Convert to ArrayBuffer to check magic bytes
        const imageBuffer = await imageBlob.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);

        // First 12 bytes for format detection
        const firstBytes = Array.from(uint8Array.slice(0, 12))
          .map(b => b.toString(16).padStart(2, '0'));
        console.log('First 12 bytes:', firstBytes);

        // Check magic bytes for supported formats
        let isPNG = false;
        let isJPEG = false;
        let isWEBP = false;

        // First check if we have enough bytes
        if (uint8Array.length >= 12) {
          // PNG check (first 8 bytes)
          isPNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
            .every((byte, i) => uint8Array[i] === byte);

          // JPEG check (first 2 bytes)
          isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8;

          // WEBP check (RIFF header + WEBP marker)
          isWEBP = 
            [0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) && // "RIFF"
            [0x57, 0x45, 0x42, 0x50].every((byte, i) => uint8Array[i + 8] === byte); // "WEBP"
        }

        console.log('Image format detection:', { isPNG, isJPEG, isWEBP });

        // Generate a unique filename
        const filename = `${tenderId}-${Date.now()}.png`
        
        // Upload the image data directly to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('tender-documents')
          .upload(filename, imageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600'
          })

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload converted image: ${uploadError.message}`)
        }

        // Get the public URL of the uploaded file
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('tender-documents')
          .getPublicUrl(filename)

        // Update the tender record with the new PNG URL
        const { error: updateError } = await supabaseClient
          .from('tenders')
          .update({ png_image_url: publicUrl })
          .eq('id', tenderId)

        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Failed to update tender record: ${updateError.message}`)
        }

        return publicUrl;
      } catch (error) {
        console.error(`Error in conversion process for tender ${tenderId}:`, error);
        throw error;
      } finally {
        // Remove from active conversions when done
        activeConversions.delete(tenderId);
      }
    };

    // Start the conversion process in the background
    const conversionPromise = convertImage();
    
    // Use EdgeRuntime.waitUntil to ensure the function runs to completion
    EdgeRuntime.waitUntil(conversionPromise);

    // Wait for the initial conversion result
    const pngUrl = await conversionPromise;

    return new Response(
      JSON.stringify({ 
        success: true, 
        pngUrl 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in convert-to-png function:', error);
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
    )
  }
})
