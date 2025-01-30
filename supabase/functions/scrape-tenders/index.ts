import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.0.0'

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
    const firecrawlApp = new FirecrawlApp({ 
      apiKey: Deno.env.get('FIRECRAWL_API_KEY') || '' 
    })

    console.log('Starting crawl of dztenders.com')
    const crawlResponse = await firecrawlApp.crawlUrl('https://dztenders.com', {
      limit: 100,
      scrapeOptions: {
        selectors: {
          title: '.tender-title',
          deadline: '.tender-deadline',
          location: '.tender-location',
          category: '.tender-category',
          publicationDate: '.tender-publication-date',
          specifications: '.tender-specifications',
        },
        formats: ['html', 'markdown']
      }
    })

    if (!crawlResponse.success) {
      throw new Error('Crawl failed: ' + crawlResponse.error)
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Process and store crawled data
    const { data: crawledData } = crawlResponse
    for (const tender of crawledData) {
      const { error } = await supabase
        .from('tenders')
        .upsert({
          title: tender.title,
          deadline: tender.deadline,
          wilaya: tender.location,
          category: tender.category,
          publication_date: tender.publicationDate,
          specifications_price: tender.specifications,
        }, {
          onConflict: 'title'
        })

      if (error) {
        console.error('Error inserting tender:', error)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Tenders scraped and stored successfully',
      count: crawledData.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in scrape-tenders function:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})