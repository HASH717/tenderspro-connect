
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { decode } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const isValidHttpUrl = (string: string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, tenderId } = await req.json()
    console.log(`Processing image for tender ${tenderId}: ${imageUrl}`)

    if (!imageUrl || !tenderId) {
      throw new Error('Missing required parameters')
    }

    // Clean and construct full image URL if needed
    let fullImageUrl = imageUrl
    if (!isValidHttpUrl(imageUrl)) {
      // Remove any leading slashes and 'sites/default/files/' prefix
      const cleanPath = imageUrl.replace(/^\/+/, '').replace(/^sites\/default\/files\//, '')
      fullImageUrl = `https://old.dztenders.com/sites/default/files/${cleanPath}`
    }

    console.log('Using full image URL:', fullImageUrl)

    // Initialize Supabase client early so we can use it for error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
      // Try to fetch with a timeout and custom headers
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const imageResponse = await fetch(fullImageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      clearTimeout(timeout)

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`)
      }

      const contentType = imageResponse.headers.get('content-type')
      console.log('Image content type:', contentType)
      
      // Get the image data as an ArrayBuffer
      const imageBuffer = await imageResponse.arrayBuffer()
      
      // Convert image to PNG using ImageScript
      console.log('Converting image to PNG format...')
      const image = await decode(new Uint8Array(imageBuffer))
      const pngBuffer = await image.encode() // This will encode to PNG by default
      
      // Save image as PNG to Supabase storage
      const fileName = `tender-${tenderId}.png`
      
      console.log('Uploading PNG image...')
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('tender-documents')
        .upload(fileName, pngBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL of the image
      const { data: publicUrlData } = await supabase
        .storage
        .from('tender-documents')
        .getPublicUrl(fileName)

      // Update tender record with the image URL
      const { error: updateError } = await supabase
        .from('tenders')
        .update({
          image_url: publicUrlData.publicUrl
        })
        .eq('id', tenderId)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      console.log('Successfully processed and stored image')

      return new Response(
        JSON.stringify({ 
          success: true,
          imageUrl: publicUrlData.publicUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (fetchError) {
      console.error('Error fetching or processing image:', fetchError)
      // Store the error in the tender record so we can track failed processing attempts
      const { error: updateError } = await supabase
        .from('tenders')
        .update({
          image_processing_error: fetchError.message
        })
        .eq('id', tenderId)
      
      if (updateError) {
        console.error('Failed to update tender with error:', updateError)
      }
      
      throw new Error(`Failed to process image: ${fetchError.message}`)
    }

  } catch (error) {
    console.error('Error processing image:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

