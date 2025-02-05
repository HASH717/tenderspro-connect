import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Normalize and clean URL
    const normalizedUrl = encodeURI(decodeURI(imageUrl).trim());
    console.log('Attempting to fetch image from:', normalizedUrl);

    // Use only proxy 3 (codetabs) since it's the most reliable
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(normalizedUrl)}`;
    console.log('Using proxy:', proxyUrl);

    // Download the image
    const imageResponse = await fetch(proxyUrl);
    
    if (!imageResponse.ok) {
      console.error(`Failed to fetch image, status: ${imageResponse.status}`);
      throw new Error(`Failed to fetch image: ${imageResponse.statusText || 'Unknown error'}`);
    }

    console.log('Image fetch successful, status:', imageResponse.status);

    // Get the image data as an ArrayBuffer
    const imageBuffer = await imageResponse.arrayBuffer()
    console.log('Image downloaded successfully, size:', imageBuffer.byteLength);

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        pngUrl: publicUrl 
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