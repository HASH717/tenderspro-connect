
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
      .select('original_image_url')
      .eq('id', tenderId)
      .single()

    if (tenderError || !tender?.original_image_url) {
      console.error('Failed to get tender or image URL:', tenderError)
      throw new Error('Failed to get tender or image URL')
    }

    // Ensure the URL is absolute by adding the base URL if needed
    const imageUrl = tender.original_image_url.startsWith('http') 
      ? tender.original_image_url 
      : `https://old.dztenders.com/${tender.original_image_url}`

    console.log('Processing image URL:', imageUrl)

    // Prepare fetch options with robust headers
    const fetchOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/gif,image/jpeg,image/png,*/*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    // First try to fetch the image to verify it exists
    const imageResponse = await fetch(imageUrl, fetchOptions);
    if (!imageResponse.ok) {
      console.error('Failed to fetch original image:', await imageResponse.text());
      throw new Error(`Failed to fetch original image: ${imageResponse.statusText}`);
    }

    // Call the process-image function with the verified image URL
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ 
        imageUrl,
        tenderId 
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Process image response error:', errorText)
      throw new Error(`Failed to process image: ${errorText}`)
    }

    const result = await response.json()
    console.log('Successfully processed image:', result)

    return new Response(
      JSON.stringify({ success: true, processedImageUrl: result.processedImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manual image processing:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
