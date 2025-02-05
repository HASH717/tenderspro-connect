
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

Deno.serve(async (req) => {
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

    // Get unprocessed tenders
    const { data: tenders, error } = await supabase
      .from('tenders')
      .select('id, image_url')
      .is('processed_image_url', null)
      .not('image_url', 'is', null)
      .limit(10) // Process in batches of 10

    if (error) {
      throw error
    }

    console.log(`Found ${tenders?.length || 0} unprocessed tenders`)

    // Process each tender's image
    const processPromises = tenders?.map(async (tender) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/process-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: tender.image_url,
            tenderId: tender.id
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to process image for tender ${tender.id}`)
        }

        return { id: tender.id, success: true }
      } catch (error) {
        console.error(`Error processing tender ${tender.id}:`, error)
        return { id: tender.id, success: false, error: error.message }
      }
    }) || []

    const results = await Promise.all(processPromises)

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results,
        message: `Processed ${results.length} images`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing batch:', error)
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
