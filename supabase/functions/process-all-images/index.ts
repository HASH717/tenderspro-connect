
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all tenders with original_image_url but no processed image
    const { data: tenders, error: fetchError } = await supabase
      .from('tenders')
      .select('id, original_image_url')
      .is('image_url', null)
      .not('original_image_url', 'is', null)
      .limit(10) // Process in batches to avoid timeouts

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${tenders?.length || 0} tenders to process`)

    const results = []
    let successCount = 0
    let errorCount = 0

    // Process each tender
    for (const tender of tenders || []) {
      try {
        if (!tender.original_image_url || !tender.id) {
          results.push({ 
            tenderId: tender.id, 
            success: false, 
            error: 'Missing image URL or tender ID' 
          })
          errorCount++
          continue
        }

        console.log(`Processing tender ${tender.id} with image ${tender.original_image_url}`)

        // Call the image processing function
        const response = await fetch(`${supabaseUrl}/functions/v1/process-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: tender.original_image_url,
            tenderId: tender.id
          })
        })

        const responseText = await response.text()
        const result = responseText ? JSON.parse(responseText) : null

        if (!response.ok) {
          throw new Error(result?.error || `Failed to process image: ${response.status} ${response.statusText}`)
        }

        results.push({ 
          tenderId: tender.id, 
          success: true, 
          imageUrl: result?.imageUrl 
        })
        successCount++
        console.log(`Successfully processed tender ${tender.id}`)

      } catch (error) {
        console.error(`Error processing tender ${tender.id}:`, error)
        results.push({ 
          tenderId: tender.id, 
          success: false, 
          error: error.message 
        })
        errorCount++

        // Update tender with error message
        await supabase
          .from('tenders')
          .update({
            image_processing_error: error.message
          })
          .eq('id', tender.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: successCount,
        errors: errorCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in bulk processing:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
