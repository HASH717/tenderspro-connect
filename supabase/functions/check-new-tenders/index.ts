import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting automatic tender check')
    
    const username = Deno.env.get('DZTENDERS_USERNAME')
    const password = Deno.env.get('DZTENDERS_PASSWORD')
    if (!username || !password) {
      throw new Error('Missing credentials in environment variables')
    }

    const credentials = btoa(`${username}:${password}`)
    const authHeader = `Basic ${credentials}`

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get the latest tender's publication date
    const { data: latestTender } = await supabase
      .from('tenders')
      .select('publication_date')
      .order('publication_date', { ascending: false })
      .limit(1)
      .single()

    const latestDate = latestTender?.publication_date

    console.log('Latest tender date:', latestDate)

    // Fetch first page of tenders to check for new ones
    const tendersResponse = await fetch('https://api.dztenders.com/tenders/?format=json&page=1', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    })

    if (!tendersResponse.ok) {
      throw new Error(`Failed to fetch tenders: ${tendersResponse.status}`)
    }

    const tendersData = await tendersResponse.json()
    const tenders = tendersData.results || []
    let newTendersCount = 0
    
    for (const tender of tenders) {
      const tenderDate = tender.publishing_date ? new Date(tender.publishing_date).toISOString().split('T')[0] : null
      
      // Skip if tender is older than our latest one
      if (latestDate && tenderDate && tenderDate <= latestDate) {
        continue
      }

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
          newTendersCount++
        }
      } catch (error) {
        console.error(`Error processing tender:`, error)
      }

      // Small delay between tender processing
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`Automatic check completed. Found ${newTendersCount} new tenders.`)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Automatic check completed successfully`,
        count: newTendersCount
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error in check-new-tenders function:', error)
    
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