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
    // First, authenticate with dztenders.com API
    console.log('Authenticating with dztenders.com API')
    const loginResponse = await fetch('https://api.dztenders.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: Deno.env.get('DZTENDERS_USERNAME'),
        password: Deno.env.get('DZTENDERS_PASSWORD'),
      }),
    })

    if (!loginResponse.ok) {
      throw new Error('Failed to authenticate with dztenders.com API')
    }

    const { token } = await loginResponse.json()

    // Fetch tenders from the API
    console.log('Fetching tenders from API')
    const tendersResponse = await fetch('https://api.dztenders.com/tenders/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!tendersResponse.ok) {
      throw new Error('Failed to fetch tenders from API')
    }

    const tenders = await tendersResponse.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Process and store tender data
    let successCount = 0

    for (const tender of tenders) {
      const { error } = await supabase
        .from('tenders')
        .upsert({
          title: tender.title,
          deadline: tender.deadline,
          wilaya: tender.location,
          category: tender.category,
          publication_date: tender.publicationDate,
          specifications_price: tender.specifications,
          tender_id: tender.id,
          type: tender.type,
          region: tender.region,
          withdrawal_address: tender.withdrawalAddress,
          link: tender.link,
        }, {
          onConflict: 'tender_id'
        })

      if (error) {
        console.error('Error inserting tender:', error)
      } else {
        successCount++
      }
    }

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