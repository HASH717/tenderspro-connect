
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

    // Track this conversion
    activeConversions.add(tenderId);

    // Define the conversion process
    const convertImage = async () => {
      try {
        // Use proxy service to fetch the image
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(imageUrl)}`;
        console.log(`Fetching image via proxy: ${proxyUrl}`);
        
        // Download the image through proxy
        const imageResponse = await fetch(proxyUrl);
        
        if (!imageResponse.ok) {
          console.error(`Failed to fetch image via proxy, status: ${imageResponse.status}`);
          throw new Error(`Failed to fetch image: ${imageResponse.statusText || 'Unknown error'}`);
        }

        console.log('Image fetch successful, status:', imageResponse.status);

        // Get the image as a blob
        const imageBlob = await imageResponse.blob();
        console.log('Image blob details:', {
          size: imageBlob.size,
          type: imageBlob.type
        });

        // Convert to ArrayBuffer
        const imageBuffer = await imageBlob.arrayBuffer();

        // Generate a unique filename
        const filename = `${tenderId}-${Date.now()}.png`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('tender-documents')
          .upload(filename, imageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload converted image: ${uploadError.message}`)
        }

        console.log('Successfully uploaded image:', filename);

        // Get the public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('tender-documents')
          .getPublicUrl(filename)

        // Update tender record
        const { error: updateError } = await supabaseClient
          .from('tenders')
          .update({ png_image_url: publicUrl })
          .eq('id', tenderId)

        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Failed to update tender record: ${updateError.message}`)
        }

        console.log('Successfully updated tender record with PNG URL');
        return publicUrl;
      } catch (error) {
        console.error(`Error in conversion process for tender ${tenderId}:`, error);
        throw error;
      } finally {
        // Remove from active conversions when done
        activeConversions.delete(tenderId);
      }
    };

    // Start conversion in background
    const conversionPromise = convertImage();
    
    // Use EdgeRuntime.waitUntil to ensure completion
    EdgeRuntime.waitUntil(conversionPromise);

    // Wait for initial conversion result
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
