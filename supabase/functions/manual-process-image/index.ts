
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
      // Try to fetch the image first to verify it exists
      console.log('Fetching image to verify existence...')
      const imageResponse = await fetch(fullImageUrl, {
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }

      const contentType = imageResponse.headers.get('content-type')
      console.log('Image content type:', contentType)

      // Store the image data
      const imageBlob = await imageResponse.blob()
      console.log('Image size:', imageBlob.size, 'bytes')

      // If it's a GIF, convert it to PNG before processing
      let processImageBlob = imageBlob
      if (contentType?.includes('image/gif')) {
        console.log('Converting GIF to PNG...')
        try {
          const image = await createImageBitmap(imageBlob)
          const canvas = new OffscreenCanvas(image.width, image.height)
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            throw new Error('Failed to get canvas context')
          }
          
          // Draw white background first
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the image
          ctx.drawImage(image, 0, 0)
          
          // Convert to PNG
          processImageBlob = await canvas.convertToBlob({ type: 'image/png' })
          console.log('Converted GIF to PNG, new size:', processImageBlob.size)
        } catch (convError) {
          console.error('Error converting GIF to PNG:', convError)
          processImageBlob = imageBlob // Fallback to original if conversion fails
        }
      }

      // Upload the original/converted image first as a fallback
      const fileName = `${tenderId}-${Date.now()}.${processImageBlob.type.split('/')[1] || 'png'}`
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('tender-documents')
        .upload(fileName, processImageBlob, {
          contentType: processImageBlob.type,
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from('tender-documents')
        .getPublicUrl(fileName)

      // Update tender with the uploaded image URL as a fallback
      const { error: updateError } = await supabase
        .from('tenders')
        .update({ processed_image_url: publicUrlData.publicUrl })
        .eq('id', tenderId)

      if (updateError) {
        console.error('Error updating tender with fallback image:', updateError)
      }

      // Now try to process the image with additional features
      try {
        console.log('Calling process-image function...')
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          body: JSON.stringify({ 
            imageUrl: publicUrlData.publicUrl, // Use the uploaded image URL instead of the original
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
          // Return the fallback image URL if processing failed
          return new Response(
            JSON.stringify({ 
              success: true, 
              processedImageUrl: publicUrlData.publicUrl,
              warning: 'Used fallback image due to processing error'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (processError) {
        console.error('Error in process-image function:', processError)
        // Return the fallback image URL
        return new Response(
          JSON.stringify({ 
            success: true, 
            processedImageUrl: publicUrlData.publicUrl,
            warning: 'Used fallback image due to processing error'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      console.error('Error processing or uploading image:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in manual image processing:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
