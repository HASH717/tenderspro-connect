import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get request parameters
    const { batchSize = 5, startPage = 1, maxPages = 10 } = await req.json()
    
    let successCount = 0
    const endPage = Math.min(startPage + maxPages - 1, 667)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Process pages sequentially
    for (let page = startPage; page <= endPage; page++) {
      console.log(`Fetching page ${page} of ${endPage}`)
      
      try {
        const tendersResponse = await fetch(`https://api.dztenders.com/tenders/?format=json&page=${page}`, {
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
          },
        })

        if (!tendersResponse.ok) {
          console.error(`Failed to fetch page ${page}:`, tendersResponse.status)
          continue
        }

        const tendersData = await tendersResponse.json()
        const tenders = tendersData.results || []
        
        for (const tender of tenders) {
          try {
            // Get detailed tender information
            const detailResponse = await fetch(`https://api.dztenders.com/tenders/${tender.id}/?format=json`, {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
              },
            })

            if (!detailResponse.ok) {
              console.error(`Failed to fetch tender details for ID ${tender.id}:`, detailResponse.status)
              continue
            }

            const detailData = await detailResponse.json()

            const formatImageUrl = (path) => {
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

            const { error } = await supabase
              .from('tenders')
              .upsert(formattedTender, {
                onConflict: 'tender_id'
              })

            if (error) {
              console.error(`Error inserting tender on page ${page}:`, error)
            } else {
              successCount++
            }
          } catch (error) {
            console.error(`Error processing tender on page ${page}:`, error)
          }

          // Small delay between tender processing
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Error processing page ${page}:`, error)
      }
      
      // Add delay between pages
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tenders fetched and stored successfully',
        count: successCount
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