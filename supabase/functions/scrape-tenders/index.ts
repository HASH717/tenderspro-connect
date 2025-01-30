import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fetching tenders using Basic Authentication')
    
    // Create Basic Auth header using environment variables
    const username = Deno.env.get('DZTENDERS_USERNAME')
    const password = Deno.env.get('DZTENDERS_PASSWORD')
    if (!username || !password) {
      throw new Error('Missing credentials in environment variables')
    }

    const credentials = btoa(`${username}:${password}`)
    const authHeader = `Basic ${credentials}`

    // Fetch tenders with Basic Auth
    const tendersResponse = await fetch('https://api.dztenders.com/tenders/?format=json', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    })

    if (!tendersResponse.ok) {
      console.error('Failed to fetch tenders:', tendersResponse.status)
      const errorText = await tendersResponse.text()
      console.error('Error response:', errorText)
      throw new Error(`Failed to fetch tenders: ${tendersResponse.status}`)
    }

    const tendersData = await tendersResponse.json()
    console.log('Fetched', tendersData.count, 'tenders')
    const tenders = tendersData.results

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Process and store tender data
    let successCount = 0
    console.log('Processing', tenders.length, 'tenders')

    for (const tender of tenders) {
      console.log('Processing tender:', tender.id)
      
      // Format the data properly before insertion
      const formattedTender = {
        title: tender.title || '',
        deadline: tender.expiration_date ? new Date(tender.expiration_date).toISOString() : null,
        wilaya: tender.region_verbose?.name || '',
        category: tender.categories_verbose?.[0]?.name || null,
        publication_date: tender.publishing_date ? new Date(tender.publishing_date).toISOString() : null,
        specifications_price: tender.cc_price?.toString() || null,
        tender_id: tender.id?.toString() || null,
        type: tender.type || null,
        region: tender.region_verbose?.name || null,
        withdrawal_address: tender.cc_address || null,
        link: tender.files_verbose?.[0] || null,
      }

      // Log the formatted tender for debugging
      console.log('Formatted tender:', JSON.stringify(formattedTender, null, 2))

      const { error } = await supabase
        .from('tenders')
        .upsert(formattedTender, {
          onConflict: 'tender_id'
        })

      if (error) {
        console.error('Error inserting tender:', error)
        console.error('Failed tender data:', JSON.stringify(formattedTender, null, 2))
      } else {
        successCount++
        console.log('Successfully processed tender:', tender.id)
      }
    }

    console.log('Finished processing tenders. Success count:', successCount)

    return new Response(JSON.stringify({
      success: true,
      message: 'Tenders fetched and stored successfully',
      count: successCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in fetch-tenders function:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})