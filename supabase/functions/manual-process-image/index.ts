
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { tenderId } = await req.json()
    console.log(`Manually processing image for tender ${tenderId}`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the original image URL from the tender
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('original_image_url, image_url')
      .eq('id', tenderId)
      .single()

    if (tenderError || (!tender?.original_image_url && !tender?.image_url)) {
      console.error('Failed to get tender or image URL:', tenderError)
      throw new Error('Failed to get tender or image URL')
    }

    // Try original_image_url first, then fall back to image_url
    const imageUrl = tender.original_image_url || tender.image_url
    if (!imageUrl) {
      throw new Error('No image URL available')
    }

    // Ensure the URL is absolute and properly formatted
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `https://old.dztenders.com/${imageUrl.replace(/^\//, '')}`;

    console.log('Processing image URL:', fullImageUrl)

    try {
      // Call the process-image function with the image URL
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({ 
          imageUrl: fullImageUrl,
          tenderId 
        })
      })

      const responseText = await response.text()
      console.log('Process image response:', response.status, responseText)

      if (!response.ok) {
        throw new Error(`Failed to process image: ${responseText}`)
      }

      try {
        const result = JSON.parse(responseText)
        console.log('Successfully processed image:', result)
        return new Response(
          JSON.stringify({ success: true, processedImageUrl: result.processedImageUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Invalid response from image processor')
      }
    } catch (processError) {
      console.error('Error in process-image function:', processError)
      
      // If processing fails, store and use the original image
      const imageResponse = await fetch(fullImageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch original image: ${imageResponse.statusText}`)
      }

      const imageBlob = await imageResponse.blob()
      const fileName = `${tenderId}-original-${Date.now()}.${imageBlob.type.split('/')[1] || 'png'}`
      
      const { error: uploadError } = await supabase.storage
        .from('tender-documents')
        .upload(fileName, imageBlob, {
          contentType: imageBlob.type,
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload original image: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from('tender-documents')
        .getPublicUrl(fileName)

      // Update tender with original image URL as fallback
      const { error: updateError } = await supabase
        .from('tenders')
        .update({ processed_image_url: publicUrlData.publicUrl })
        .eq('id', tenderId)

      if (updateError) {
        throw new Error(`Failed to update tender with original image: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processedImageUrl: publicUrlData.publicUrl,
          warning: 'Used original image as fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in manual image processing:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
