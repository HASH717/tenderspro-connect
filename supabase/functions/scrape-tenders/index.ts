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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const username = Deno.env.get('DZTENDERS_USERNAME');
    const password = Deno.env.get('DZTENDERS_PASSWORD');
    if (!username || !password) {
      throw new Error('Missing credentials in environment variables');
    }

    const credentials = btoa(`${username}:${password}`);
    const authHeader = `Basic ${credentials}`;

    const requestBody = await req.text().then(text => text ? JSON.parse(text) : {});
    const { page = 1 } = requestBody;
    console.log(`Processing page ${page}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let successCount = 0;

    const tendersData = await fetchTendersPage(page, authHeader);
    const tenders = tendersData.results || [];
    const totalPages = Math.ceil(tendersData.count / tenders.length);
    
    console.log(`Found ${tenders.length} tenders on page ${page} of ${totalPages}`);

    for (const tender of tenders) {
      try {
        const { data: existingTender } = await supabase
          .from('tenders')
          .select('tender_id')
          .eq('tender_id', tender.id.toString())
          .single();

        if (existingTender) {
          console.log(`Tender ${tender.id} already exists, skipping`);
          continue;
        }

        const detailData = await fetchTenderDetails(tender.id, authHeader);
        const formattedTender = formatTenderData(tender as TenderData, detailData);

        const { error: insertError } = await supabase
          .from('tenders')
          .insert(formattedTender);

        if (insertError) {
          console.error(`Error inserting tender:`, insertError);
        } else {
          successCount++;
          console.log(`Successfully processed tender ${tender.id} (${successCount}/${tenders.length})`);
        }
      } catch (error) {
        console.error(`Error processing tender:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Completed page ${page}. Total pages: ${totalPages}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed page ${page}`,
        count: successCount,
        currentPage: page,
        totalPages,
        hasMore: page < totalPages
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    return handleError(error);
  }
});