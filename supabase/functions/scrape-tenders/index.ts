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

    // First, authenticate with dztenders.com using browser emulation
    console.log('Authenticating with dztenders.com')
    const loginResponse = await firecrawlApp.crawlUrl('https://www.dztenders.com/en/login/', {
      limit: 1,
      scrapeOptions: {
        browserEmulation: true,
        actions: [
          {
            type: 'input',
            selector: 'input[name="username"]',
            value: Deno.env.get('DZTENDERS_USERNAME') || ''
          },
          {
            type: 'input',
            selector: 'input[name="password"]',
            value: Deno.env.get('DZTENDERS_PASSWORD') || ''
          },
          {
            type: 'click',
            selector: 'button[type="submit"]'
          }
        ]
      }
    })

    if (!loginResponse.success) {
      console.error('Login failed:', loginResponse.error)
      throw new Error('Failed to authenticate with dztenders.com')
    }

    console.log('Successfully authenticated, starting crawl of dztenders.com')
    const crawlResponse = await firecrawlApp.crawlUrl('https://www.dztenders.com/en/tenders/', {
      limit: 5, // Reduced limit to stay within free tier
      scrapeOptions: {
        browserEmulation: true, // Enable browser emulation for authenticated session
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
      console.error('Crawl failed:', crawlResponse.error)
      throw new Error(crawlResponse.error || 'Crawl failed')
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
    let successCount = 0

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
      } else {
        successCount++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Tenders scraped and stored successfully',
      count: successCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in scrape-tenders function:', error)
    
    // Format error message for better client-side handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})