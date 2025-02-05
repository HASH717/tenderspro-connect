import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Canvas from 'https://deno.land/x/canvas@v1.4.1/mod.ts'

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

    // Add custom headers to bypass potential restrictions
    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/*, */*',
      'Referer': 'https://old.dztenders.com/'
    });

    // Download the image with retry logic
    let imageResponse;
    let retries = 3;
    
    while (retries > 0) {
      try {
        imageResponse = await fetch(imageUrl, { headers });
        if (imageResponse.ok) break;
        
        console.log(`Retry ${4 - retries}: Failed to fetch image, status: ${imageResponse.status}`);
        retries--;
        if (retries > 0) await new Promise(r => setTimeout(r, 1000)); // Wait 1s between retries
      } catch (error) {
        console.error(`Fetch attempt failed:`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!imageResponse?.ok) {
      throw new Error(`Failed to fetch image after retries: ${imageResponse?.statusText || 'Unknown error'}`)
    }

    const imageBlob = await imageResponse.blob()
    console.log('Image downloaded successfully, size:', imageBlob.size);
    
    // Create a canvas and load the image
    const img = new Canvas.Image()
    img.src = await imageBlob.arrayBuffer()
    
    console.log('Image dimensions:', img.width, 'x', img.height);
    
    const canvas = Canvas.createCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    
    // Convert to PNG
    const pngBuffer = await canvas.toBuffer('image/png')
    console.log('Converted to PNG, size:', pngBuffer.byteLength);

    // Generate a unique filename
    const filename = `${tenderId}-${Date.now()}.png`
    
    // Upload the converted image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('tender-documents')
      .upload(filename, pngBuffer, {
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