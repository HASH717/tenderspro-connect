
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const REMOVE_BG_API_KEY = Deno.env.get('REMOVE_BG_API_KEY')
    if (!REMOVE_BG_API_KEY) {
      throw new Error('RemoveBG API key not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get request body
    const { imageUrl, tenderId } = await req.json()
    
    if (!imageUrl || !tenderId) {
      throw new Error('Image URL and tender ID are required')
    }

    console.log(`Processing image for tender ${tenderId}`)

    // Call RemoveBG API
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        size: 'auto',
        format: 'auto',
        type: 'document'
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('RemoveBG API error:', error)
      throw new Error(`Failed to process image: ${error}`)
    }

    // Get the processed image as a buffer
    const imageBuffer = await response.arrayBuffer()

    // Generate a unique filename
    const filename = `${tenderId}-processed-${Date.now()}.png`
    
    // Upload processed image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('tender-documents')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading processed image:', uploadError)
      throw uploadError
    }

    // Get public URL for the uploaded image
    const { data: publicUrlData } = supabase
      .storage
      .from('tender-documents')
      .getPublicUrl(filename)

    const processedImageUrl = publicUrlData.publicUrl

    // Update tender with processed image URL
    const { error: updateError } = await supabase
      .from('tenders')
      .update({ processed_image_url: processedImageUrl })
      .eq('id', tenderId)

    if (updateError) {
      console.error('Error updating tender:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedImageUrl,
        message: 'Image processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing image:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
