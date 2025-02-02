import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  fetchTendersPage, 
  fetchTenderDetails, 
  formatTenderData, 
  handleError,
  TenderData 
} from '../_shared/tender-scraper-utils.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST',
      }
    });
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
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let successCount = 0;
    let errorCount = 0;

    console.log(`Making request to: https://api.dztenders.com/tenders/?page=${page}&format=json`);
    
    const tendersData = await fetchTendersPage(page, authHeader);
    const tenders = tendersData.results || [];
    
    console.log(`Found ${tenders.length} tenders on page ${page}`);

    for (const tender of tenders) {
      try {
        // Check if tender already exists
        const { data: existingTender } = await supabase
          .from('tenders')
          .select('tender_id')
          .eq('tender_id', tender.id.toString())
          .maybeSingle();

        if (existingTender) {
          console.log(`Tender ${tender.id} already exists, skipping`);
          successCount++;
          continue;
        }

        const formattedTender = formatTenderData(tender as TenderData, tender);

        // Insert the new tender
        const { error: insertError } = await supabase
          .from('tenders')
          .insert(formattedTender);

        if (insertError) {
          console.error(`Error inserting tender ${tender.id}:`, insertError);
          errorCount++;
        } else {
          successCount++;
          console.log(`Successfully processed tender ${tender.id} (${successCount}/${tenders.length})`);
        }

      } catch (error) {
        console.error(`Error processing tender ${tender.id}:`, error);
        errorCount++;
      }

      // Add small delay between processing each tender
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Completed page ${page} with ${successCount} successes and ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed page ${page}`,
        count: successCount,
        errors: errorCount,
        page: page
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
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