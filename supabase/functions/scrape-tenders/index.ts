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
        username: 'motraxa@gmail.com',
        password: 'Dahdouhhash@717',
      }),
    })

    if (!loginResponse.ok) {
      console.error('Login response status:', loginResponse.status)
      console.error('Login response text:', await loginResponse.text())
      throw new Error('Failed to authenticate with dztenders.com API')
    }

    const { token } = await loginResponse.json()

    // Fetch tenders from the API with JSON format
    console.log('Fetching tenders from API')
    const tendersResponse = await fetch('https://api.dztenders.com/tenders/?format=json', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!tendersResponse.ok) {
      console.error('Tenders response status:', tendersResponse.status)
      console.error('Tenders response text:', await tendersResponse.text())
      throw new Error('Failed to fetch tenders from API')
    }

    const tendersData = await tendersResponse.json()
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

    for (const tender of tenders) {
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