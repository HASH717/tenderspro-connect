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

    console.log('Login response status:', loginResponse.status)
    const loginResponseText = await loginResponse.text()
    console.log('Login response text:', loginResponseText)

    if (!loginResponse.ok) {
      throw new Error(`Authentication failed with status ${loginResponse.status}: ${loginResponseText}`)
    }

    let token
    try {
      const loginData = JSON.parse(loginResponseText)
      token = loginData.token
      if (!token) {
        throw new Error('No token in response')
      }
    } catch (e) {
      console.error('Failed to parse login response:', e)
      throw new Error('Invalid authentication response format')
    }

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