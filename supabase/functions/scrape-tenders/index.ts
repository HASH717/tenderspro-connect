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
    
    // Create Basic Auth header
    const credentials = btoa('motraxa@gmail.com:Dahdouhhash@717')
    const authHeader = `Basic ${credentials}`

    // Fetch tenders directly with Basic Auth
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
      const { error } = await supabase
        .from('tenders')
        .upsert({
          title: tender.title,
          deadline: tender.expiration_date,
          wilaya: tender.region_verbose?.name || '',
          category: tender.categories_verbose?.[0]?.name || null,
          publication_date: tender.publishing_date,
          specifications_price: tender.cc_price || null,
          tender_id: tender.id.toString(),
          type: tender.type,
          region: tender.region_verbose?.name || null,
          withdrawal_address: tender.cc_address || null,
          link: tender.files_verbose?.[0] || null,
        }, {
          onConflict: 'tender_id'
        })

      if (error) {
        console.error('Error inserting tender:', error)
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
