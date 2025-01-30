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
    
    // Try different common DRF authentication endpoints and payload formats
    const authEndpoints = [
      'https://api.dztenders.com/api/token/',
      'https://api.dztenders.com/api/auth/token/',
      'https://api.dztenders.com/api-auth/login/',
      'https://api.dztenders.com/api/v1/auth/login/',
      'https://api.dztenders.com/auth/token/',
      'https://api.dztenders.com/rest-auth/login/',
      'https://api.dztenders.com/api/login/',
      'https://api.dztenders.com/auth/jwt/create/',  // Common DRF JWT endpoint
      'https://api.dztenders.com/api/v1/token/',     // Another common endpoint
      'https://api.dztenders.com/users/login/'       // Basic auth endpoint
    ]
    
    const payloadFormats = [
      {
        username: 'motraxa@gmail.com',
        password: 'Dahdouhhash@717',
      },
      {
        email: 'motraxa@gmail.com',
        password: 'Dahdouhhash@717',
      },
      {
        user: 'motraxa@gmail.com',
        password: 'Dahdouhhash@717',
      }
    ]

    const authHeaders = [
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      }
    ]
    
    let token = null
    let loginResponse = null
    
    // Try each endpoint with each payload format and header combination
    for (const endpoint of authEndpoints) {
      console.log(`\nTrying authentication endpoint: ${endpoint}`)
      
      for (const payload of payloadFormats) {
        console.log(`Trying payload format:`, payload)
        
        for (const headers of authHeaders) {
          console.log(`Trying headers:`, headers)
          
          try {
            loginResponse = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: headers['Content-Type'] === 'application/x-www-form-urlencoded' 
                ? new URLSearchParams(payload).toString()
                : JSON.stringify(payload),
            })
            
            console.log(`Response status for ${endpoint}:`, loginResponse.status)
            const responseText = await loginResponse.text()
            console.log(`Response for ${endpoint}:`, responseText)
            
            if (loginResponse.ok) {
              try {
                const loginData = JSON.parse(responseText)
                // Check for different token field names
                const possibleTokens = ['token', 'access', 'access_token', 'auth_token', 'key', 'jwt']
                for (const tokenField of possibleTokens) {
                  if (loginData[tokenField]) {
                    token = loginData[tokenField]
                    console.log('Successfully authenticated!')
                    break
                  }
                }
                if (token) break
              } catch (e) {
                console.log(`Failed to parse JSON response from ${endpoint}:`, e)
              }
            } else {
              console.log(`Failed with status ${loginResponse.status}`)
            }
          } catch (e) {
            console.log(`Failed to connect to ${endpoint}:`, e)
          }
        }
        if (token) break
      }
      if (token) break
    }

    if (!token) {
      throw new Error('Failed to authenticate with any endpoint')
    }

    // Try different authorization header formats
    const authorizationHeaders = [
      { 'Authorization': `Bearer ${token}` },
      { 'Authorization': `Token ${token}` },
      { 'Authorization': `JWT ${token}` },
      { 'Authorization': token }
    ]

    let tendersData = null
    
    // Try each authorization header format
    for (const authHeader of authorizationHeaders) {
      console.log('Trying authorization header:', authHeader)
      
      try {
        const tendersResponse = await fetch('https://api.dztenders.com/tenders/?format=json', {
          headers: {
            ...authHeader,
            'Accept': 'application/json',
          },
        })

        if (tendersResponse.ok) {
          tendersData = await tendersResponse.json()
          console.log('Successfully fetched tenders data')
          break
        } else {
          console.log(`Failed to fetch tenders with status: ${tendersResponse.status}`)
          const errorText = await tendersResponse.text()
          console.log('Error response:', errorText)
        }
      } catch (error) {
        console.error('Error fetching tenders:', error)
      }
    }

    if (!tendersData) {
      throw new Error('Failed to fetch tenders data with any authorization format')
    }

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