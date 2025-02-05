import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Sharp from 'npm:sharp@0.32.6'
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

    // Download the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()

    // Convert to PNG using Sharp
    const pngBuffer = await Sharp(imageBuffer)
      .png()
      .toBuffer()

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
    console.error('Error in convert-to-png function:', error)
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