import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/tender-scraper-utils.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use the provided credentials
    const username = Deno.env.get('DZTENDERS_USERNAME');
    const password = Deno.env.get('DZTENDERS_PASSWORD');
    
    if (!username || !password) {
      throw new Error('Missing credentials in environment variables');
    }
    
    const credentials = btoa(`${username}:${password}`);
    const authHeader = `Basic ${credentials}`;

    const requestBody = await req.text().then(text => text ? JSON.parse(text) : {});
    const { page = 213 } = requestBody;
    console.log(`Processing page ${page}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch tenders from the API
    const response = await fetch(`https://api.dztenders.com/tenders/?format=json&page=${page}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'TendersPro/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.results?.length || 0} tenders on page ${page}`);

    if (!data.results?.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tenders found on this page',
          lastProcessedPage: page 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process each tender
    for (const tender of data.results) {
      const { error } = await supabase
        .from('tenders')
        .upsert({
          title: tender.title,
          wilaya: tender.region_verbose?.name || 'Unknown',
          category: tender.categories_verbose?.[0]?.name,
          publication_date: tender.publishing_date,
          deadline: tender.expiration_date,
          link: tender.files_verbose?.[0],
          tender_id: tender.id?.toString(),
          type: tender.type,
          region: tender.region_verbose?.name,
          specifications_price: tender.cc_price?.toString(),
          withdrawal_address: tender.cc_address,
          image_url: tender.files_verbose?.[0] ? `https://old.dztenders.com/${tender.files_verbose[0]}` : null,
          organization_name: tender.organization?.name,
          organization_address: tender.organization?.address,
          tender_status: tender.status
        }, {
          onConflict: 'tender_id'
        });

      if (error) {
        console.error('Error upserting tender:', error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${data.results.length} tenders`,
        lastProcessedPage: page,
        hasMore: !!data.next
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Scraper error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});