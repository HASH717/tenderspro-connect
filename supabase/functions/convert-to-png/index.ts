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

    // Normalize and clean URL
    const normalizedUrl = encodeURI(decodeURI(imageUrl).trim());
    console.log('Attempting to fetch image from:', normalizedUrl);

    // Define multiple proxy services to try
    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizedUrl)}`,
      `https://cors-anywhere.herokuapp.com/${normalizedUrl}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(normalizedUrl)}`
    ];

    // Custom headers for direct fetch
    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/*, */*',
      'Referer': 'https://old.dztenders.com/',
      'Origin': 'https://old.dztenders.com',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });

    // Download the image with enhanced retry logic
    let imageResponse;
    let retries = 3;
    let currentProxyIndex = 0;
    let usingProxy = true;
    
    while (retries > 0) {
      try {
        if (usingProxy) {
          console.log(`Attempting proxy ${currentProxyIndex + 1}:`, proxyUrls[currentProxyIndex]);
          imageResponse = await fetch(proxyUrls[currentProxyIndex]);
        } else {
          console.log('Attempting direct fetch');
          imageResponse = await fetch(normalizedUrl, { 
            headers,
            redirect: 'follow',
          });
        }
        
        if (imageResponse.ok) {
          console.log('Image fetch successful, status:', imageResponse.status);
          break;
        }
        
        console.log(`Failed to fetch image, status: ${imageResponse.status}`);
        
        if (usingProxy) {
          currentProxyIndex++;
          if (currentProxyIndex >= proxyUrls.length) {
            usingProxy = false;
            console.log('All proxies failed, switching to direct fetch');
          } else {
            console.log('Trying next proxy');
            continue;
          }
        }
        
        retries--;
        if (retries > 0) {
          const delay = 2000 * (4 - retries);
          console.log(`Waiting ${delay}ms before retry ${3 - retries}...`);
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (error) {
        console.error(`Fetch attempt failed:`, error);
        
        if (usingProxy) {
          currentProxyIndex++;
          if (currentProxyIndex >= proxyUrls.length) {
            usingProxy = false;
            console.log('All proxies failed, switching to direct fetch');
          } else {
            console.log('Trying next proxy');
            continue;
          }
        }
        
        retries--;
        if (retries === 0) throw error;
        const delay = 2000 * (4 - retries);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    if (!imageResponse?.ok) {
      throw new Error(`Failed to fetch image after all retries: ${imageResponse?.statusText || 'Unknown error'}`)
    }

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