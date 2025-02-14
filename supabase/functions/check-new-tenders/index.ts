
import { corsHeaders } from '../_shared/cors.ts'
import { handleError, fetchTendersPage, formatTenderData, checkTenderExists } from '../_shared/tender-scraper-utils.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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
    const data = await fetchTendersPage(1, authHeader)
    console.log(`Found ${data.results?.length || 0} tenders on page 1`)

    if (!data.results?.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tenders found',
          count: 0,
          errors: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let processedCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (const tender of data.results) {
      try {
        const tenderId = tender.id?.toString()
        if (!tenderId) {
          console.error('Tender has no ID, skipping')
          errorCount++
          continue
        }

        const exists = await checkTenderExists(supabase, tenderId)
        if (exists) {
          console.log(`Tender ${tenderId} already exists, skipping`)
          skippedCount++
          continue
        }

        const formattedTender = formatTenderData(tender, tender)
        
        const { error } = await supabase
          .from('tenders')
          .upsert({
            title: formattedTender.title,
            wilaya: formattedTender.wilaya,
            category: formattedTender.category,
            publication_date: formattedTender.publication_date,
            deadline: formattedTender.deadline,
            link: formattedTender.link,
            tender_id: formattedTender.tender_id,
            type: formattedTender.type,
            region: formattedTender.region,
            specifications_price: formattedTender.specifications_price,
            withdrawal_address: formattedTender.withdrawal_address,
            image_url: formattedTender.image_url,
            organization_name: formattedTender.organization_name,
            organization_address: formattedTender.organization_address,
            tender_status: formattedTender.tender_status,
            original_image_url: formattedTender.original_image_url
          }, {
            onConflict: 'tender_id'
          })

        if (error) {
          console.error('Error upserting tender:', error)
          errorCount++
        } else {
          processedCount++
          console.log(`Successfully processed tender ${tender.id}`)
        }
      } catch (error) {
        console.error(`Error processing tender ${tender.id}:`, error)
        errorCount++
      }
    }

    console.log(`Automatic check completed. Found ${processedCount} new tenders.`)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} tenders (${skippedCount} skipped) with ${errorCount} errors`,
        count: processedCount,
        skipped: skippedCount,
        errors: errorCount
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return handleError(error)
  }
})
