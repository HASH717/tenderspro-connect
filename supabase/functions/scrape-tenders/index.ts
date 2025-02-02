import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders
    })
  }

  try {
    console.log('Starting tender scraping process')
    
    const username = Deno.env.get('DZTENDERS_USERNAME')
    const password = Deno.env.get('DZTENDERS_PASSWORD')
    if (!username || !password) {
      throw new Error('Missing credentials in environment variables')
    }

    const credentials = btoa(`${username}:${password}`)
    const authHeader = `Basic ${credentials}`

    let requestBody
    try {
      const text = await req.text()
      console.log('Raw request body:', text)
      requestBody = text ? JSON.parse(text) : {}
    } catch (error) {
      console.error('Error parsing request body:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { startPage = 1, maxPages = 1 } = requestBody // Process only 1 page per execution
    const endPage = startPage
    let successCount = 0
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Shorter timeout to ensure we complete processing
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function timeout')), 25000) // 25s timeout
    })

    console.log(`Processing page ${startPage}`)
    
    try {
      const tendersResponse = await Promise.race([
        fetch(`https://api.dztenders.com/tenders/?format=json&page=${startPage}`, {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
          },
        }),
        timeoutPromise
      ])

      if (!tendersResponse.ok) {
        throw new Error(`Failed to fetch page ${startPage}: ${tendersResponse.status}`)
      }

      const tendersData = await tendersResponse.json()
      const tenders = tendersData.results || []
      console.log(`Found ${tenders.length} tenders on page ${startPage}`)
      
      for (const tender of tenders) {
        try {
          const detailResponse = await Promise.race([
            fetch(`https://api.dztenders.com/tenders/${tender.id}/?format=json`, {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
              },
            }),
            timeoutPromise
          ])

          if (!detailResponse.ok) {
            console.error(`Failed to fetch tender details for ID ${tender.id}:`, detailResponse.status)
            continue
          }

          const detailData = await detailResponse.json()

          const formatImageUrl = (path: string | null) => {
            if (!path) return null
            return `https://old.dztenders.com/${path}`
          }

          const imageUrls = tender.files_verbose?.map(formatImageUrl).filter(Boolean) || []
          const primaryImageUrl = imageUrls[0] || null

          const formattedTender = {
            title: tender.title || 'Untitled Tender',
            wilaya: tender.region_verbose?.name || 'Unknown',
            deadline: tender.expiration_date ? new Date(tender.expiration_date).toISOString() : null,
            category: tender.categories_verbose?.[0]?.name || null,
            publication_date: tender.publishing_date ? new Date(tender.publishing_date).toISOString() : null,
            specifications_price: tender.cc_price?.toString() || null,
            tender_id: tender.id?.toString(),
            type: tender.type || null,
            region: tender.region_verbose?.name || null,
            withdrawal_address: tender.cc_address || null,
            link: tender.files_verbose?.[0] || null,
            image_url: primaryImageUrl,
            tender_number: detailData.tender_number || null,
            qualification_required: detailData.qualification_required || null,
            qualification_details: detailData.qualification_details || null,
            project_description: detailData.description || null,
            organization_name: detailData.organization?.name || null,
            organization_address: detailData.organization?.address || null,
            tender_status: detailData.status || null,
            original_image_url: tender.files_verbose?.[0] || null
          }

          const { error: upsertError } = await supabase
            .from('tenders')
            .upsert(formattedTender, {
              onConflict: 'tender_id'
            })

          if (upsertError) {
            console.error(`Error inserting tender:`, upsertError)
          } else {
            successCount++
            console.log(`Successfully processed tender ${tender.id} (${successCount}/${tenders.length})`)
          }
        } catch (error) {
          if (error.message === 'Function timeout') {
            console.log('Function timeout reached, ending current batch')
            throw error
          }
          console.error(`Error processing tender:`, error)
        }

        // Minimal delay between tenders
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      if (error.message === 'Function timeout') {
        console.log('Function timeout reached, ending execution')
      }
      console.error(`Error processing page ${startPage}:`, error)
    }

    const isComplete = startPage >= 667
    const nextPage = startPage + 1

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tenders fetched and stored successfully',
        count: successCount,
        nextPage: isComplete ? null : nextPage,
        isComplete
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in fetch-tenders function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }), 
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    )
  }
})