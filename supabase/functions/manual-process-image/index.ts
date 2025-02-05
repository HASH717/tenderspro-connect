
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
      throw new Error('Failed to get tender or image URL')
    }

    // Ensure the URL is absolute by adding the base URL if needed
    const imageUrl = tender.original_image_url.startsWith('http') 
      ? tender.original_image_url 
      : `https://old.dztenders.com/${tender.original_image_url}`

    console.log('Processing image URL:', imageUrl)

    // Call the process-image function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageUrl,
        tenderId 
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to process image: ${error}`)
    }

    const result = await response.json()

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
