import { corsHeaders } from '../_shared/cors.ts'
import { handleError, fetchTendersPage, formatTenderData, checkTenderExists } from '../_shared/tender-scraper-utils.ts'
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
    const data = await fetchTendersPage(page, authHeader);
    console.log(`Found ${data.results?.length || 0} tenders on page ${page}`);

    if (!data.results?.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tenders found on this page',
          count: 0,
          errors: 0,
          lastProcessedPage: page 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each tender
    for (const tender of data.results) {
      try {
        // Check if tender already exists
        const tenderId = tender.id?.toString();
        if (!tenderId) {
          console.error('Tender has no ID, skipping');
          errorCount++;
          continue;
        }

        const exists = await checkTenderExists(supabase, tenderId);
        if (exists) {
          console.log(`Tender ${tenderId} already exists, skipping`);
          skippedCount++;
          continue;
        }

        const formattedTender = formatTenderData(tender, tender);
        
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
          });

        if (error) {
          console.error('Error upserting tender:', error);
          errorCount++;
        } else {
          processedCount++;
          console.log(`Successfully processed tender ${tender.id}`);
        }
      } catch (error) {
        console.error(`Error processing tender ${tender.id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedCount} tenders (${skippedCount} skipped) with ${errorCount} errors`,
        count: processedCount,
        skipped: skippedCount,
        errors: errorCount,
        lastProcessedPage: page,
        hasMore: !!data.next
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return handleError(error);
  }
});